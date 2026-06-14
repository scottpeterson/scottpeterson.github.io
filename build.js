#!/usr/bin/env node

// build.js - Simple build system for generating HTML pages from templates
//
// Data Obfuscation:
// This build system includes a data encoding step that transforms raw JSON files
// in /data/ into obfuscated versions in /data-encoded/. The encoding uses XOR
// with a rotating key followed by base64. This deters casual scraping and makes
// it harder for LLMs to directly parse the data from network requests.
//
// The client-side data-loader.js contains the corresponding decode function.

const fs = require('fs').promises;
const { watch } = require('fs');
const path = require('path');
const prettier = require('prettier');

// Obfuscation key - used for XOR encoding
// This isn't cryptographic security, just obfuscation to deter casual scraping
const OBFUSCATION_KEY = 'D3StatLab2025';

class TemplateEngine {
  constructor() {
    this.templates = {};
    this.config = {};
  }

  // Write generated HTML, formatted through Prettier first.
  //
  // INTENT / root-cause fix: the pre-commit hook runs `prettier --write` on
  // committed HTML, so the files in git are Prettier-formatted. If the build
  // emitted RAW HTML, every `npm run build` would show phantom whitespace diffs
  // against those committed files until the hook reformatted them. By running the
  // same Prettier (with the project's .prettierrc, resolved per-file) here, the
  // build's output is byte-identical to what the hook produces — so rebuilding is
  // idempotent and safe to run anytime with zero churn. Always use this for HTML
  // instead of fs.writeFile; if Prettier can't parse the output (syntax bug in a
  // template), fail loudly rather than silently shipping malformed HTML.
  async writeHtml(filepath, html) {
    const options = await prettier.resolveConfig(filepath);
    const formatted = await prettier.format(html, { ...options, filepath });
    await fs.writeFile(filepath, formatted, 'utf8');
  }

  // Encode data using XOR + base64 obfuscation
  // This makes the data unreadable without the decode function
  encodeData(jsonString) {
    const keyBytes = OBFUSCATION_KEY.split('').map(c => c.charCodeAt(0));
    const dataBytes = Buffer.from(jsonString, 'utf8');
    const encoded = Buffer.alloc(dataBytes.length);

    for (let i = 0; i < dataBytes.length; i++) {
      encoded[i] = dataBytes[i] ^ keyBytes[i % keyBytes.length];
    }

    return encoded.toString('base64');
  }

  // Convert distances CSV to JSON for the data pipeline
  // Reads data/calculated_distances.csv and produces data/distances.json with:
  //   { teams: [...sorted unique names...], distances: { "SchoolA|SchoolB": { miles, source } } }
  // Keys are alphabetically sorted so lookup is bidirectional without duplicates.
  async convertDistancesCSV() {
    const csvPath = 'data/calculated_distances.csv';
    try {
      await fs.access(csvPath);
    } catch {
      console.log('ℹ️  No distances CSV found, skipping conversion');
      return;
    }

    const raw = await fs.readFile(csvPath, 'utf8');
    const lines = raw.trim().split('\n');
    // Skip header row
    const teamSet = new Set();
    const distances = {};

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',');
      if (cols.length < 5) {
        continue;
      }

      const schoolA = cols[0].trim();
      const schoolB = cols[1].trim();
      const miles = parseFloat(cols[2]);
      const source = cols[4].trim();

      teamSet.add(schoolA);
      teamSet.add(schoolB);

      // Alphabetically-sorted key ensures bidirectional lookup
      const key = [schoolA, schoolB].sort().join('|');
      distances[key] = { miles, source };
    }

    const teams = Array.from(teamSet).sort();
    const json = JSON.stringify({ teams, distances });
    await fs.writeFile('data/distances.json', json, 'utf8');
    console.log(
      `✓ Converted distances CSV to JSON (${teams.length} teams, ${Object.keys(distances).length} pairs)`
    );
  }

  // Encode all JSON files from /data/ to /data-encoded/
  async encodeDataFiles() {
    const dataDir = 'data';
    const encodedDir = 'data-encoded';

    try {
      // Ensure encoded directory exists
      await fs.mkdir(encodedDir, { recursive: true });

      // Read all JSON files from data directory
      const files = await fs.readdir(dataDir);
      const jsonFiles = files.filter(f => f.endsWith('.json'));

      console.log(`\n🔐 Encoding ${jsonFiles.length} data files...`);

      for (const file of jsonFiles) {
        const sourcePath = path.join(dataDir, file);
        const destPath = path.join(encodedDir, file);

        // Read raw JSON
        const rawData = await fs.readFile(sourcePath, 'utf8');

        // Encode the data
        const encodedData = this.encodeData(rawData);

        // Write encoded version (wrapped in JSON for consistent fetch handling)
        await fs.writeFile(
          destPath,
          JSON.stringify({ _encoded: encodedData }),
          'utf8'
        );

        console.log(`  ✓ Encoded ${file}`);
      }

      console.log('✓ Data encoding complete');
    } catch (error) {
      console.error('Error encoding data files:', error);
      throw error;
    }
  }

  // Load templates
  async loadTemplates() {
    try {
      this.templates.base = await fs.readFile('templates/base.html', 'utf8');
      this.templates.tablePage = await fs.readFile(
        'templates/table-page.html',
        'utf8'
      );
      this.templates.homeContent = await fs.readFile(
        'templates/home-content.html',
        'utf8'
      );
      this.templates.contactPage = await fs.readFile(
        'templates/contact-page.html',
        'utf8'
      );
      this.templates.premiumPage = await fs.readFile(
        'templates/premium-page.html',
        'utf8'
      );
      this.templates.premiumMultiPage = await fs.readFile(
        'templates/premium-multi-page.html',
        'utf8'
      );
      this.templates.premiumAudience = await fs.readFile(
        'templates/premium-audience.html',
        'utf8'
      );
      this.templates.simplePage = await fs.readFile(
        'templates/simple-page.html',
        'utf8'
      );
      this.templates.distancesPage = await fs.readFile(
        'templates/distances-page.html',
        'utf8'
      );
      this.templates.ryanPage = await fs.readFile(
        'templates/ryan-page.html',
        'utf8'
      );
      this.templates.referencePage = await fs.readFile(
        'templates/reference-page.html',
        'utf8'
      );
      this.templates.homeHero = await fs.readFile(
        'templates/home-hero.html',
        'utf8'
      );
      console.log('✓ Templates loaded');
    } catch (error) {
      console.error('Error loading templates:', error);
      throw error;
    }
  }

  // Load configuration
  async loadConfig() {
    try {
      const configData = await fs.readFile('config/pages.json', 'utf8');
      this.config = JSON.parse(configData);
      console.log('✓ Configuration loaded');
    } catch (error) {
      console.error('Error loading configuration:', error);
      throw error;
    }
  }

  // Get feature flags from config
  getFeatureFlags() {
    return this.config._featureFlags || {};
  }

  // Check if a feature is enabled
  isFeatureEnabled(featureName) {
    const flags = this.getFeatureFlags();
    return flags[featureName] === true;
  }

  // Check if a page should be shown based on feature flags
  shouldShowPage(pageConfig) {
    // If no feature flag is specified, show the page
    if (!pageConfig.featureFlag) {
      return true;
    }
    // Check if the feature flag is enabled
    return this.isFeatureEnabled(pageConfig.featureFlag);
  }

  // Generate navigation HTML based on config and feature flags.
  // Single source of truth for the site's top-level navigation: order, labels,
  // hrefs, and which config key each maps to. 'reports' is special — it renders
  // as a dropdown in the header nav. EVERYTHING that needs to know the menu
  // (header nav HTML, reports/index.html nav, the CMD+K command palette) derives
  // from this one list, so the menu can't drift between surfaces. Add/rename a
  // page here once and every surface updates on the next build.
  navConfig() {
    return [
      { key: 'index', label: 'Home', href: '/' },
      { key: 'npi', label: 'NPI', href: 'npi.html' },
      {
        key: 'season_simulations',
        label: 'Season Simulations',
        href: 'season_simulations.html',
      },
      {
        key: 'current_season_rankings',
        label: 'Current Season Rankings',
        href: 'current_season_rankings.html',
      },
      {
        key: 'conference_rankings',
        label: 'Conference Rankings',
        href: 'conference_rankings.html',
      },
      {
        key: 'composite_rankings',
        label: 'Composite Rankings',
        href: 'composite_rankings.html',
      },
      { key: 'distances', label: 'Distances', href: 'distances.html' },
      {
        key: 'preseason_rankings',
        label: '26-27 Preseason Rankings',
        href: 'preseason_rankings.html',
      },
      {
        key: 'returners',
        label: 'Returning and Non-Returning',
        href: 'returners.html',
      },
      {
        key: 'publishing_tracker',
        label: 'Publishing Tracker',
        href: 'publishing_tracker.html',
      },
      { key: 'reports', label: 'Reports', href: 'reports/', isDropdown: true },
      { key: 'premium', label: 'Premium', href: 'premium.html' },
      { key: 'contact', label: 'Contact & About', href: 'contact.html' },
      { key: 'reference', label: 'Reference', href: 'reference.html' },
    ];
  }

  // Flat navigation list for the CMD+K command palette, inlined into each page as
  // window.__NAV_ITEMS__. Built from the SAME navConfig() and the SAME visibility
  // gating as generateNavigation (config present, showInNav, feature flag), so
  // the palette is always in lockstep with the real menu — no hand-maintained
  // second copy to drift. The Reports dropdown collapses to a single "Reports"
  // entry pointing at the index (individual reports aren't palette destinations),
  // and only appears when at least one report exists. js/command-palette.js
  // enriches each {title, href} with an icon/description/shortcut.
  async getPaletteNavItems() {
    const items = [];
    for (const item of this.navConfig()) {
      if (item.isDropdown && item.key === 'reports') {
        const reports = await this.getReportsList();
        if (reports.length > 0) {
          items.push({ title: item.label, href: item.href });
        }
        continue;
      }

      const pageConfig = this.config[item.key];
      if (
        !pageConfig ||
        pageConfig.showInNav === false ||
        !this.shouldShowPage(pageConfig)
      ) {
        continue;
      }

      items.push({ title: item.label, href: item.href });
    }
    return items;
  }

  // `absolute` emits root-relative hrefs (leading /) so pages living in a
  // subdirectory (reports/index.html) can share this exact same nav instead of
  // hand-maintaining their own copy that drifts.
  async generateNavigation({ absolute = false } = {}) {
    const navItems = [];
    const href = h =>
      !absolute ||
      h.startsWith('/') ||
      h.startsWith('#') ||
      h.startsWith('http')
        ? h
        : '/' + h;

    for (const item of this.navConfig()) {
      // Handle Reports dropdown specially
      if (item.isDropdown && item.key === 'reports') {
        const reportsDropdown = await this.generateReportsDropdown(absolute);
        if (reportsDropdown) {
          navItems.push(reportsDropdown);
        }
        continue;
      }

      const pageConfig = this.config[item.key];

      // Skip if page doesn't exist in config
      if (!pageConfig) {
        continue;
      }

      // Skip if page shouldn't be shown in nav
      if (pageConfig.showInNav === false) {
        continue;
      }

      // Skip if feature flag is not enabled
      if (!this.shouldShowPage(pageConfig)) {
        continue;
      }

      navItems.push(
        `<li><a href="${href(item.href)}">${this.escapeHtml(item.label)}</a></li>`
      );
    }

    return navItems.join('\n          ');
  }

  // Get list of reports from the reports directory
  // Returns array of { slug, title, file } objects
  async getReportsList() {
    const reportsDir = 'reports';

    try {
      const files = await fs.readdir(reportsDir);
      const htmlFiles = files.filter(
        f => f.endsWith('.html') && f !== 'index.html'
      );

      const reports = [];
      for (const file of htmlFiles) {
        const slug = path.basename(file, '.html');
        // Try to extract title from the HTML file
        let title;
        try {
          const content = await fs.readFile(
            path.join(reportsDir, file),
            'utf8'
          );
          // Match multiline titles
          const titleMatch = content.match(/<title>([\s\S]*?)<\/title>/i);
          if (titleMatch) {
            // Normalize whitespace and remove " - The D3 Stat Lab" suffix if present
            title = titleMatch[1]
              .replace(/\s+/g, ' ')
              .trim()
              .replace(/\s*-\s*The D3 Stat Lab$/i, '')
              .trim();
          }
        } catch (e) {
          // Ignore read errors, fall back to slug-based title
        }
        // Fall back to slug-based title if no title found
        if (!title) {
          title = slug
            .replace(/_/g, ' ')
            .replace(/-/g, ' ')
            .replace(/\b\w/g, c => c.toUpperCase());
        }
        reports.push({ slug, title, file });
      }

      // Deterministic order: fs.readdir order is filesystem-defined and varies
      // by machine, which made the main-page Reports dropdown (this list) and
      // reports/index.html disagree, and could reorder on a fresh clone. Sort by
      // title once here so every consumer shares one stable order.
      reports.sort((a, b) => a.title.localeCompare(b.title));

      return reports;
    } catch (error) {
      console.warn('Could not read reports directory:', error.message);
      return [];
    }
  }

  // Generate Reports dropdown menu by reading reports directory.
  // `absolute` prefixes hrefs with / so the dropdown works from a subdirectory
  // page (reports/index.html) as well as the root pages.
  async generateReportsDropdown(absolute = false) {
    const reports = await this.getReportsList();

    if (reports.length === 0) {
      return null;
    }

    const pfx = absolute ? '/' : '';

    // Build dropdown items from report files
    const dropdownItems = reports
      .map(
        r =>
          `              <li><a href="${pfx}reports/${r.file}">${this.escapeHtml(r.title)}</a></li>`
      )
      .join('\n');

    return `<li class="nav-dropdown">
            <a href="${pfx}reports/" class="dropdown-trigger">Reports <span class="dropdown-arrow">▾</span></a>
            <ul class="dropdown-menu">
              <li><a href="${pfx}reports/">All Reports</a></li>
              <li class="dropdown-divider"></li>
${dropdownItems}
            </ul>
          </li>`;
  }

  // Regenerate reports/index.html based on current reports directory contents
  // This ensures the reports index stays in sync when files are added/removed
  async regenerateReportsIndex() {
    const reports = await this.getReportsList();

    if (reports.length === 0) {
      console.log(
        'ℹ️  No reports found, skipping reports/index.html generation'
      );
      return;
    }

    // reports is already title-sorted by getReportsList (deterministic order).
    // Generate report cards
    const cards = reports
      .map(
        r => `        <a href="${r.slug}.html" class="report-card">
          <h3>${this.escapeHtml(r.title)}</h3>
          <span class="report-card-arrow">→</span>
        </a>`
      )
      .join('\n');

    // Reuse the canonical nav (absolute hrefs since this page is one dir down).
    // This keeps reports/index.html in lockstep with every other page — it picks
    // up new nav items, feature-flag gating, and label changes automatically,
    // instead of the hand-maintained copy that previously drifted (it had lost
    // the Distances link and used a different href style).
    const navItems = await this.generateNavigation({ absolute: true });

    const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Reports - The D3 Stat Lab</title>

    <!-- Block AI/LLM crawlers from using content for training -->
    <meta name="robots" content="noai, noimageai" />
    <meta name="googlebot" content="noai, noimageai" />

    <link rel="icon" type="image/png" href="/favicon.png" />
    <link rel="stylesheet" href="/styles.css" />
    <link rel="stylesheet" href="/css/reports.css" />

    <!-- GoatCounter Analytics -->
    <script
      data-goatcounter="https://thed3statlab.goatcounter.com/count"
      async
      src="https://gc.zgo.at/count.js"
    ></script>
  </head>
  <body>
    <nav class="main-nav">
      <div class="nav-container">
        <div class="logo"><a href="/">The D3 Stat Lab</a></div>

        <!-- Hamburger Menu Toggle (only appears on mobile) -->
        <div class="menu-toggle" id="menuToggle">
          <span></span>
          <span></span>
          <span></span>
        </div>

        <!-- Navigation Links -->
        <ul class="nav-links" id="navMenu">
          <!-- Close button placed separately at the top of the menu -->
          <div class="menu-close" id="menuClose"></div>

          ${navItems}
        </ul>
      </div>

      <!-- Overlay for mobile -->
      <div class="nav-overlay" id="navOverlay"></div>
    </nav>

    <main>
      <header>
        <h1>Reports</h1>
        <p>Interactive reports and visualizations for D3 Women's Basketball</p>
      </header>

      <div class="reports-grid">
${cards}
      </div>
    </main>

    <footer>
      <p>&copy; <span id="currentYear">2026</span> D3 Stat Lab. All rights reserved.</p>
    </footer>
    <script>document.getElementById('currentYear').textContent = new Date().getFullYear();</script>

    <!-- JavaScript for navigation -->
    <script src="/js/navigation.js"></script>
    <script src="/js/reports-nav.js"></script>
  </body>
</html>`;

    await this.writeHtml('reports/index.html', html);
    console.log('✓ Generated reports/index.html');
  }

  // Simple template replacement
  renderTemplate(template, data) {
    let result = template;

    // Handle conditional sections first
    result = this.handleConditionals(result, data);

    // Handle arrays
    result = this.handleArrays(result, data);

    // Plain-text values (from config/page data) — HTML-escaped on interpolation
    // so a literal "<"/"&" in copy can't break or inject markup.
    const textMappings = {
      PAGE_TITLE: data.title,
      PAGE_HEADING: data.heading,
      PAGE_DESCRIPTION: data.description,
      SECTION_TITLE: data.sectionTitle,
      SEARCH_PLACEHOLDER: data.searchPlaceholder,
      LAST_UPDATED: data.lastUpdated,
    };

    // Pre-rendered, build-generated markup — inserted verbatim. These are
    // trusted HTML/inline-script fragments the build assembled itself; escaping
    // them would corrupt the intended markup.
    const markupMappings = {
      CONTENT: data.content || '',
      NAV_ITEMS: data.navItems || '',
      PREMIUM_BAND: data.premiumBand || '',
      HERO: data.hero || '',
      HEAD_PRELOAD: data.headPreload || '',
      BODY_CLASS: data.bodyClass || '',
    };

    for (const [key, value] of Object.entries(textMappings)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      const escaped = this.escapeHtml(value || '');
      result = result.replace(regex, () => escaped);
    }

    for (const [key, value] of Object.entries(markupMappings)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      // Replacer function so any `$` in the markup (e.g. inline-script dollar
      // signs) is inserted literally, not interpreted as a $-pattern.
      result = result.replace(regex, () => value || '');
    }

    return result;
  }

  // HTML-escape a dynamic text value before it lands in generated markup.
  //
  // INTENT: config/pages.json (and report metadata) is plain text authored by a
  // human; without escaping, a literal "<", ">", or "&" in a value would emit
  // invalid markup or, worse, inject tags. This escapes the characters that are
  // significant in the only contexts build.js interpolates these values into:
  // HTML text and double-quoted attributes. Apostrophes are DELIBERATELY not
  // escaped — every attribute in the templates is double-quoted (Prettier
  // enforces this), so a bare ' can never break out, and escaping it would only
  // litter readable copy like "Women's" with &#39;. Config is verified free of
  // pre-existing entities/tags, so there is no double-encoding risk. Only use
  // this for TEXT — never on build-generated markup (it would corrupt the HTML).
  escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Guard against shipping a page with unrendered template syntax. Scans for any
  // surviving mustache token — a section ({{#X}}/{{^X}}/{{/X}}) or a plain
  // variable ({{X}}) — and throws if found. No generated page legitimately
  // contains "{{", so a hit is always a build bug: a typo'd token, a conditional
  // missing from the flags map in handleConditionals, or a new {{VAR}} with no
  // entry in renderTemplate's mappings. Throwing here makes that loud at build
  // time instead of leaving literal braces visible on the live page.
  assertNoUnresolvedTokens(html, filename) {
    const leftover = html.match(/{{[^}]*}}/g);
    if (leftover) {
      const unique = [...new Set(leftover)];
      throw new Error(
        `Unresolved template token(s) in ${filename}: ${unique.join(', ')}`
      );
    }
  }

  // Handle conditional sections {{#VAR}} content {{/VAR}} (and the inverted
  // {{^VAR}} content {{/VAR}}).
  //
  // INTENT: one data-driven pass over a single source-of-truth table instead of
  // 11 copy-pasted if/else blocks. To add a conditional, add ONE row here and use
  // the token in a template — nothing else changes. The map key is the literal
  // token name as written in the template ({{#TOKEN}}); the value is the data
  // property that decides truthiness. Each token is handled in both forms:
  //   {{#TOKEN}}…{{/TOKEN}}  keep when truthy, strip when falsy
  //   {{^TOKEN}}…{{/TOKEN}}  keep when falsy,  strip when truthy (mustache inverse)
  handleConditionals(template, data) {
    // token-as-written-in-template -> deciding data flag
    const flags = {
      HAS_SEARCH: data.hasSearch,
      SHOW_PROGRESS: data.showProgress,
      LAST_UPDATED: data.lastUpdated,
      LEGEND: data.legend,
      salesEnabled: data.salesEnabled,
      IS_PREMIUM_PAGE: data.isPremiumPage,
      IS_DISTANCES_PAGE: data.isDistancesPage,
      IS_RYAN_PAGE: data.isRyanPage,
      SHOW_DEFAULT_HEADER: data.showDefaultHeader,
      SHOW_BUY_BUTTON: data.showBuyButton,
      COMMAND_PALETTE: data.commandPaletteEnabled,
    };

    let result = template;
    for (const [token, value] of Object.entries(flags)) {
      const truthy = Boolean(value);
      // Positive section: {{#token}}…{{/token}}
      result = result.replace(
        new RegExp(`{{#${token}}}([\\s\\S]*?){{/${token}}}`, 'g'),
        truthy ? '$1' : ''
      );
      // Inverted section: {{^token}}…{{/token}}
      result = result.replace(
        new RegExp(`{{\\^${token}}}([\\s\\S]*?){{/${token}}}`, 'g'),
        truthy ? '' : '$1'
      );
    }

    return result;
  }

  // Handle array iterations {{#ARRAY}} {{.}} {{/ARRAY}}
  handleArrays(template, data) {
    let result = template;

    // Handle COLUMNS array
    if (data.columns && Array.isArray(data.columns)) {
      const columnHtml = data.columns
        .map(col => `<th>${this.escapeHtml(col)}</th>`)
        .join('\n          ');
      result = result.replace(/{{#COLUMNS}}[\s\S]*?{{\/COLUMNS}}/g, columnHtml);
    }

    // Handle LEGEND_ITEMS array
    if (data.legend && typeof data.legend === 'object') {
      const legendItems = Object.entries(data.legend)
        .map(
          ([column, description]) =>
            `          <div class="legend-item">
            <span class="legend-column">${this.escapeHtml(column)}</span>
            <span class="legend-description">${this.escapeHtml(description)}</span>
          </div>`
        )
        .join('\n');
      result = result.replace(
        /{{#LEGEND_ITEMS}}[\s\S]*?{{\/LEGEND_ITEMS}}/g,
        legendItems
      );
    }

    return result;
  }

  // "Last updated" for a data file = the file's own modification time, i.e. when
  // the underlying data actually changed on disk. The author's data pipeline
  // writes each JSON when its data changes, so the mtime IS the real
  // "data changed" moment — which is exactly what this line must show.
  //
  // The only refinement over a bare mtime is pinning the timezone for the
  // display string, so the formatted date doesn't shift with the build machine's
  // locale (the instant is the same; only the rendering is fixed to Eastern).
  //
  // NOTE: this is deliberately the filesystem mtime, NOT the git commit date.
  // The commit date is "when the data was committed", which lags the real change
  // and is wrong here. The tradeoff is that mtime isn't preserved by a fresh
  // `git clone`, so this line is not reproducible in a clean CI checkout — that's
  // accepted in exchange for showing the true data-change time.
  async getDataUpdatedDate(filePath) {
    try {
      const stats = await fs.stat(filePath);
      return stats.mtime.toLocaleString('en-US', {
        timeZone: 'America/New_York',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short',
      });
    } catch (error) {
      console.warn(`Could not stat ${filePath}:`, error.message);
      return null;
    }
  }

  // Feature-card icon set (design system phase 5). One deliberate icon system:
  // a small Feather-style line-icon set, stroke = currentColor (colored via the
  // .feature-icon CSS token), replacing the emoji that used to live in
  // config/pages.json. config stores a semantic KEY (e.g. "chart"); this maps it
  // to inline SVG. Unknown keys fall through to the raw value so nothing breaks.
  // NOTE: templates/premium-page.html (the single-product fallback) inlines the
  // same four glyphs — keep them in sync with this map if you change them.
  featureIcon(name) {
    const attrs =
      'viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ' +
      'aria-hidden="true" focusable="false"';
    const paths = {
      chart:
        '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
      target:
        '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
      trending:
        '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
      users:
        '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
      alert:
        '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
      trophy:
        '<circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>',
      clipboard:
        '<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>',
    };
    if (!paths[name]) {
      // Unknown key: fall through to the raw config value (e.g. an emoji), but
      // escape it — it's untrusted text landing in markup. Known keys below
      // return trusted inline SVG and must NOT be escaped.
      return this.escapeHtml(name);
    }
    return `<svg ${attrs}>${paths[name]}</svg>`;
  }

  // Build the renderable pieces for a single product: the centered header block
  // and the body (sample + features + pricing). Returned separately so callers
  // can place the header in a <summary> (collapsed area) while the body lives in
  // the disclosure. globalSalesEnabled is the master kill switch — a product's
  // purchase form only shows when both it AND product.salesEnabled are true.
  buildProductPieces(product, globalSalesEnabled) {
    const isActive = product.active;
    const sectionClass = isActive
      ? 'product-section product-section--active'
      : 'product-section product-section--inactive';
    const badgeClass = isActive
      ? 'product-badge product-badge--active'
      : 'product-badge product-badge--upcoming';
    // Allow per-product badge text override, fall back to defaults
    const badgeText =
      product.badgeText || (isActive ? 'Available Now' : 'Returns Next Season');
    const canPurchase = globalSalesEnabled && product.salesEnabled;

    // Build sample section
    let sampleHtml = '';
    // eslint-disable-next-line quotes
    const defaultSampleHeading = "See Exactly What You'll Get";
    if (product.samplePdf) {
      sampleHtml = `
      <section class="premium-sample">
        <h3>${this.escapeHtml(product.sampleHeading || defaultSampleHeading)}</h3>
        <p class="sample-description">${this.escapeHtml(product.sampleDescription || '')}</p>
        <a href="${product.samplePdf}" target="_blank" rel="noopener noreferrer" class="sample-button">
          ${this.escapeHtml(product.sampleButtonText || 'View Sample')}
        </a>
      </section>`;
    } else if (product.sampleHeading) {
      sampleHtml = `
      <section class="premium-sample">
        <h3>${this.escapeHtml(product.sampleHeading)}</h3>
        <p class="sample-description">${this.escapeHtml(product.sampleDescription || '')}</p>
      </section>`;
    }

    // Build features grid
    let featuresHtml = '';
    if (product.features && product.features.length > 0) {
      const featureCards = product.features
        .map(
          f => `
            <div class="feature-card">
              <div class="feature-icon">${this.featureIcon(f.icon)}</div>
              <h3>${this.escapeHtml(f.title)}</h3>
              <p>${this.escapeHtml(f.description)}</p>
            </div>`
        )
        .join('');

      featuresHtml = `
      <section class="premium-features">
        <h3>What You'll Get</h3>
        <div class="features-grid">
          ${featureCards}
        </div>
      </section>`;
    }

    // Build pricing features list
    const pricingFeaturesHtml = (product.pricingFeatures || [])
      .map(f => `              <li>✓ ${this.escapeHtml(f)}</li>`)
      .join('\n');

    // Build price display
    const priceOriginalHtml = product.priceOriginal
      ? `<span class="price-original">${this.escapeHtml(product.priceOriginal)}</span>`
      : '';

    // Build urgency note
    const urgencyHtml = product.urgencyNote
      ? `<p class="urgency-note">${this.escapeHtml(product.urgencyNote)}</p>`
      : '';

    // Build form/CTA based on sales status
    let formHtml = '';
    if (canPurchase) {
      formHtml = `
          <form class="premium-form" data-stripe-link="${product.stripePaymentLink}">
            <div class="form-group">
              <label for="email-${product.id}">Email Address</label>
              <input
                type="email"
                id="email-${product.id}"
                name="email"
                required
                placeholder="your@email.com"
                class="form-input product-email"
              />
              <span class="form-hint">We'll send your report to this email (check spam if needed). You'll select your team during checkout.</span>
            </div>

            <div class="form-group form-checkbox-group">
              <label class="checkbox-label">
                <input
                  type="checkbox"
                  id="honor-${product.id}"
                  name="honor-agreement"
                  required
                  class="form-checkbox product-honor"
                />
                <span class="checkbox-text">I understand this report is for my personal use</span>
              </label>
            </div>

            ${urgencyHtml}

            <button type="submit" class="premium-button product-checkout-button" disabled>
              ${this.escapeHtml(product.buttonText || 'Get Access')}
            </button>
            <p class="trust-signal"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> Secure payment via Stripe</p>
          </form>`;
    } else {
      formHtml = `
          <p class="sales-disabled-message">
            This report is not currently available for purchase.
          </p>`;
    }

    // Build pricing section
    const pricingHtml = `
      <section class="premium-pricing">
        <h3>${this.escapeHtml(product.pricingHeading || 'Access')}</h3>
        <div class="pricing-card">
          <div class="price">
            ${priceOriginalHtml}
            <span class="price-amount">${this.escapeHtml(product.price)}</span>
            <span class="price-period">${this.escapeHtml(product.pricePeriod || '')}</span>
          </div>
          <p class="pricing-clarification">${this.escapeHtml(product.pricingClarification || '')}</p>
          <ul class="pricing-features">
${pricingFeaturesHtml}
          </ul>
          ${formHtml}
        </div>
      </section>`;

    // Countdown element: rendered as a placeholder, JS fills in the number
    const countdownHtml = product.countdownDate
      ? `<p class="product-countdown" data-countdown-date="${product.countdownDate}">
              <span class="countdown-label">${this.escapeHtml(product.countdownLabel || 'Returns in')}</span>
              <span class="countdown-days"></span>
            </p>`
      : '';

    const headerHtml = `
      <div class="product-header">
        <h2>${this.escapeHtml(product.name)}</h2>
        <span class="${badgeClass}">${this.escapeHtml(badgeText)}</span>
        ${countdownHtml}
        <p class="product-tagline">${this.escapeHtml(product.tagline)}</p>
      </div>`;

    const bodyHtml = `
      ${sampleHtml}
      ${featuresHtml}
      ${pricingHtml}`;

    return { sectionClass, headerHtml, bodyHtml };
  }

  // Render a flat list of products as standalone (always-expanded) sections,
  // separated by dividers. Used for active products at the top of the page.
  renderProductSections(products, globalSalesEnabled) {
    return products
      .map((product, index) => {
        const { sectionClass, headerHtml, bodyHtml } = this.buildProductPieces(
          product,
          globalSalesEnabled
        );
        const divider =
          index < products.length - 1 ? '<hr class="product-divider" />' : '';
        return `
    <section class="${sectionClass}" id="product-${product.id}">
      ${headerHtml}${bodyHtml}
    </section>
    ${divider}`;
      })
      .join('\n');
  }

  // Render the collapsible "secondary" area: inactive/upcoming product(s) plus
  // the shared audience ("Perfect For") section, all under ONE large caret in a
  // native <details> that defaults closed. This keeps an out-of-season product
  // (and the appeal copy that trails it) from occupying a full screen above the
  // FAQ. The lead inactive product's header is the <summary> so the collapsed
  // state still announces what's inside. If there are no inactive products the
  // audience section is returned on its own (uncollapsed), preserving layout.
  renderOffseasonArea(inactiveProducts, audienceHtml, globalSalesEnabled) {
    if (!inactiveProducts || inactiveProducts.length === 0) {
      return audienceHtml;
    }

    const [lead, ...rest] = inactiveProducts;
    const leadPieces = this.buildProductPieces(lead, globalSalesEnabled);

    // Any additional inactive products render as full sections inside the body.
    const restHtml = rest
      .map(product => {
        const { sectionClass, headerHtml, bodyHtml } = this.buildProductPieces(
          product,
          globalSalesEnabled
        );
        return `
        <section class="${sectionClass}" id="product-${product.id}">
          ${headerHtml}${bodyHtml}
        </section>`;
      })
      .join('\n');

    // Large chevron caret (Feather-style), rotated by CSS from the [open] state.
    const caret =
      '<svg class="offseason-collapse__caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><polyline points="6 9 12 15 18 9"/></svg>';

    return `
    <details class="offseason-collapse">
      <summary class="offseason-collapse__summary">
        ${caret}
        <div class="offseason-collapse__heading">
          ${leadPieces.headerHtml}
        </div>
      </summary>
      <div class="offseason-collapse__body">
        <section class="${leadPieces.sectionClass}" id="product-${lead.id}">
          ${leadPieces.bodyHtml}
        </section>
        ${restHtml}
        ${audienceHtml}
      </div>
    </details>`;
  }

  // Build the home page premium teaser band from the ACTIVE premium product.
  // Pulls copy/price straight from config.premium.products so the home funnel
  // never drifts from the Premium page. Returns '' when the premium feature
  // flag is off or no product is active, so the home page simply omits it.
  renderHomePremium() {
    if (!this.isFeatureEnabled('premium')) {
      return '';
    }

    const premium = this.config.premium;
    const products = (premium && premium.products) || [];
    const product = products.find(p => p.active);
    if (!product) {
      return '';
    }

    // Original price shown struck-through when present (e.g. $49 -> $39)
    const originalPrice = product.priceOriginal
      ? `<span class="home-premium__price-original">${this.escapeHtml(product.priceOriginal)}</span>`
      : '';

    // Up to three short selling points from the product's pricing features
    const features = (product.pricingFeatures || [])
      .slice(0, 3)
      .map(f => `<li>${this.escapeHtml(f)}</li>`)
      .join('\n          ');
    const featuresHtml = features
      ? `<ul class="home-premium__features">\n          ${features}\n        </ul>`
      : '';

    return `<section class="home-premium">
  <div class="home-premium__inner">
    <span class="home-premium__eyebrow">Premium Report</span>
    <h2 class="home-premium__title">${this.escapeHtml(product.name)}</h2>
    <p class="home-premium__tagline">${this.escapeHtml(product.tagline)}</p>
    ${featuresHtml}
    <div class="home-premium__price">
      ${originalPrice}<span class="home-premium__price-now">${this.escapeHtml(product.price)}</span>
      <span class="home-premium__price-period">${this.escapeHtml(product.pricePeriod)}</span>
    </div>
    <a href="premium.html" class="btn btn--primary btn--lg">${this.escapeHtml(product.buttonText)} &rarr;</a>
  </div>
</section>`;
  }

  // Generate a single page
  async generatePage(pageKey, pageConfig) {
    try {
      // Handle special home page content
      let tableContent = '';
      if (pageKey === 'index') {
        // Use home content template for index page.
        // Rendered through renderTemplate so the hero can pull
        // {{PAGE_HEADING}}/{{PAGE_DESCRIPTION}} from config/pages.json and the
        // {{PREMIUM_BAND}} teaser (built from the active premium product so its
        // copy/price stay in sync with the Premium page). Config stays the
        // single source of truth for home copy.
        tableContent = this.renderTemplate(this.templates.homeContent, {
          heading: pageConfig.heading,
          description: pageConfig.description,
          premiumBand: this.renderHomePremium(),
        });
      } else if (pageConfig.isContactPage) {
        // Combined Contact + About page: contact form/connect links up top, then
        // the "About the Data" reference content (sources, inspiration, media,
        // D3 links). Both live in templates/contact-page.html now.
        tableContent = this.renderTemplate(this.templates.contactPage, {
          sectionTitle: pageConfig.sectionTitle,
        });
      } else if (pageConfig.isPremiumPage) {
        const premiumSalesEnabled = this.isFeatureEnabled(
          'premiumSalesEnabled'
        );
        const multiProductEnabled = this.isFeatureEnabled(
          'multiProductPremium'
        );

        if (
          multiProductEnabled &&
          pageConfig.products &&
          pageConfig.products.length > 0
        ) {
          // Multi-product mode: active products render expanded at the top;
          // inactive/upcoming products (+ the shared "Perfect For" appeal) drop
          // into one large-caret collapse below, so an out-of-season product
          // doesn't bury the FAQ. Order preserves config order within each group.
          const activeProducts = pageConfig.products.filter(p => p.active);
          const inactiveProducts = pageConfig.products.filter(p => !p.active);

          const productSectionsHtml = this.renderProductSections(
            activeProducts,
            premiumSalesEnabled
          );
          const secondaryAreaHtml = this.renderOffseasonArea(
            inactiveProducts,
            this.templates.premiumAudience,
            premiumSalesEnabled
          );

          tableContent = this.templates.premiumMultiPage
            .replace('{{PRODUCT_SECTIONS}}', productSectionsHtml)
            .replace('{{SECONDARY_AREA}}', secondaryAreaHtml);
          // Override heading/description with umbrella branding when multi-product
          if (pageConfig.multiProductHeading) {
            pageConfig = {
              ...pageConfig,
              heading: pageConfig.multiProductHeading,
              description:
                pageConfig.multiProductDescription || pageConfig.description,
            };
          }
        } else {
          // Single-product fallback: existing premium template (unchanged)
          tableContent = this.renderTemplate(this.templates.premiumPage, {
            salesEnabled: premiumSalesEnabled,
          });
        }
      } else if (pageConfig.isSimplePage) {
        // Use simple page template for success/cancel pages
        tableContent = this.templates.simplePage;
      } else if (pageConfig.isDistancesPage) {
        // Use distances page template for the distance calculator
        tableContent = this.renderTemplate(this.templates.distancesPage, {
          sectionTitle: pageConfig.sectionTitle,
        });
      } else if (pageConfig.isRyanPage) {
        // Use ryan page template
        tableContent = this.renderTemplate(this.templates.ryanPage, {
          sectionTitle: pageConfig.sectionTitle,
        });
      } else if (pageConfig.isReferencePage) {
        // Static reference page: evergreen notes (no data source, no search).
        // The template is plain markup, but render it through renderTemplate so
        // it picks up the same token substitution as every other page.
        tableContent = this.renderTemplate(this.templates.referencePage, {});
      } else if (pageConfig.dataSource) {
        // Render table page content for data-driven pages
        tableContent = this.renderTemplate(this.templates.tablePage, {
          sectionTitle: pageConfig.sectionTitle,
          hasSearch: pageConfig.hasSearch,
          showProgress: pageConfig.showProgress,
          searchPlaceholder: pageConfig.searchPlaceholder,
          columns: pageConfig.columns,
        });
      }

      // Get last updated date for data file (the data file's own mtime — when
      // the data actually changed; see getDataUpdatedDate).
      let lastUpdated = null;
      if (pageConfig.dataSource) {
        const dataFilePath = `data/${pageConfig.dataSource}.json`;
        lastUpdated = await this.getDataUpdatedDate(dataFilePath);
      } else if (pageConfig.isDistancesPage) {
        // The distances page's data comes from a CSV (data/distances.json is
        // regenerated every build, so its mtime is always "now" and useless).
        // Use the source CSV's mtime — the real "distance data changed" signal.
        lastUpdated = await this.getDataUpdatedDate(
          'data/calculated_distances.csv'
        );
      }

      // Render full page
      const navItems = await this.generateNavigation();

      // Determine if buy button should show (feature flagged).
      // Suppressed on the home page, which has its own richer .home-premium band
      // (showing both would stack two redundant premium CTAs above the footer).
      const premiumEnabled = this.isFeatureEnabled('premium');
      const showBuyButton =
        premiumEnabled &&
        !pageConfig.isPremiumPage &&
        !pageConfig.isSimplePage &&
        pageKey !== 'index';

      // Command palette is always included in the build
      // The actual feature flag check is done client-side via URL parameter
      // This allows testing without rebuilding
      const commandPaletteEnabled = true;

      // Per-page runtime config inlined into <head>. The client only ever reads
      // dataSource + columnMappings (main.js / table-controls.js), so we inline
      // just those — no need to ship (or fetch) the whole multi-page config.
      // When a dataSource exists we also kick off its (cacheable) fetch right
      // here so the download overlaps document parsing instead of starting after
      // DOMContentLoaded. data-loader.js consumes both globals.
      const runtimeConfig = {};
      if (pageConfig.dataSource) {
        runtimeConfig.dataSource = pageConfig.dataSource;
      }
      if (pageConfig.columnMappings) {
        runtimeConfig.columnMappings = pageConfig.columnMappings;
      }

      // Inline the canonical nav list so the CMD+K command palette renders the
      // exact same menu as the header (see getPaletteNavItems). Identical on
      // every page, but cheap to embed, and keeps the palette's source of truth
      // server-side instead of a hand-maintained JS copy.
      const paletteNavItems = await this.getPaletteNavItems();
      const headPreload = `<script>
        window.__PAGE_CONFIG__ = ${JSON.stringify(runtimeConfig)};
        window.__NAV_ITEMS__ = ${JSON.stringify(paletteNavItems)};
        (function () {
          var ds = window.__PAGE_CONFIG__.dataSource;
          if (ds) {
            window.__DATA_PREFETCH__ = {
              source: ds,
              promise: fetch('data-encoded/' + ds + '.json'),
            };
          }
        })();
      </script>`;

      const fullPage = this.renderTemplate(this.templates.base, {
        title: pageConfig.title,
        heading: pageConfig.heading,
        description: pageConfig.description,
        // Home page renders its own full-bleed hero (in the {{HERO}} slot above
        // <main>) instead of the generic header.
        showDefaultHeader: pageKey !== 'index',
        // Home page gets body.home for the transparent-over-hero nav treatment;
        // other pages get an empty class (default solid sticky nav).
        bodyClass: pageKey === 'index' ? 'home' : '',
        hero:
          pageKey === 'index'
            ? this.renderTemplate(this.templates.homeHero, {
                heading: pageConfig.heading,
                description: pageConfig.description,
              })
            : '',
        lastUpdated: lastUpdated,
        content: tableContent,
        legend: pageConfig.legend,
        isPremiumPage: pageConfig.isPremiumPage || false,
        isDistancesPage: pageConfig.isDistancesPage || false,
        isRyanPage: pageConfig.isRyanPage || false,
        showBuyButton: showBuyButton,
        commandPaletteEnabled: commandPaletteEnabled,
        navItems: navItems,
        headPreload: headPreload,
      });

      // Determine output filename
      const filename = `${pageKey}.html`;

      // Fail loudly on any unresolved mustache token. A surviving {{...}} means a
      // template references a conditional/variable the build never filled in (a
      // typo'd token, a missing flags-map row, or a new {{VAR}} with no mapping).
      // Catching it here turns a silent broken-page bug into a build failure.
      this.assertNoUnresolvedTokens(fullPage, filename);

      // Write file (Prettier-formatted so output matches the committed files)
      await this.writeHtml(filename, fullPage);
      console.log(`✓ Generated ${filename}`);
    } catch (error) {
      console.error(`Error generating ${pageKey}:`, error);
      throw error;
    }
  }

  // Generate all pages
  async generateAll() {
    console.log('🔨 Starting build process...\n');

    try {
      await this.loadTemplates();
      await this.loadConfig();

      // Filter out special config keys that start with underscore
      const pages = Object.keys(this.config).filter(
        key => !key.startsWith('_')
      );
      console.log(`📄 Generating ${pages.length} pages...\n`);

      for (const pageKey of pages) {
        await this.generatePage(pageKey, this.config[pageKey]);
      }

      // Regenerate reports/index.html based on current reports directory
      // This ensures nav stays in sync when report files are added/removed
      await this.regenerateReportsIndex();

      // Convert distances CSV to JSON before encoding
      await this.convertDistancesCSV();

      // Encode data files for obfuscation
      await this.encodeDataFiles();

      console.log(`\n✅ Build complete! Generated ${pages.length} pages.`);
    } catch (error) {
      console.error('\n❌ Build failed:', error);
      process.exit(1);
    }
  }

  // Delete every file the build generates, so the next build starts clean. This
  // is the exact inverse of generateAll's outputs: one <pageKey>.html per config
  // page, reports/index.html, the whole data-encoded/ dir, and the generated
  // data/distances.json. Source files (templates, config, styles, js, raw data,
  // hand-authored reports/*.html) are never touched. Missing files are ignored
  // so clean is safe to run repeatedly.
  async clean() {
    console.log('🧹 Cleaning generated files...\n');
    await this.loadConfig();

    const targets = Object.keys(this.config)
      .filter(key => !key.startsWith('_'))
      .map(key => `${key}.html`);
    targets.push('reports/index.html', 'data/distances.json');

    let removed = 0;
    const tryUnlink = async file => {
      try {
        await fs.unlink(file);
        console.log(`  ✓ Removed ${file}`);
        removed++;
      } catch (error) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
      }
    };

    for (const file of targets) {
      await tryUnlink(file);
    }

    // The entire data-encoded/ dir is build output — clear it.
    try {
      const encoded = await fs.readdir('data-encoded');
      for (const file of encoded) {
        await tryUnlink(path.join('data-encoded', file));
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }

    console.log(
      `\n✅ Clean complete — removed ${removed} generated files. Run 'npm run build' to regenerate.`
    );
  }

  // Watch source files and rebuild on change. Deliberately watches ONLY pure
  // source locations (templates, config, js, styles.css) — never data/ or
  // reports/, because the build writes into those (data/distances.json,
  // reports/index.html), which would retrigger the watcher in an infinite loop.
  // Edits to data or reports during a dev session need a manual `npm run build`.
  // Uses Node's built-in fs.watch (recursive; supported on macOS/Windows and
  // Node 20+ Linux) so there's no watcher dependency.
  async dev() {
    await this.generateAll();

    const watchPaths = ['templates', 'config', 'js', 'styles.css'];
    let timer = null;
    const scheduleRebuild = filename => {
      clearTimeout(timer);
      // Debounce: editors fire several events per save, and a recursive watch
      // can echo; coalesce into one rebuild.
      timer = setTimeout(async () => {
        console.log(`\n♻️  Change detected (${filename}) — rebuilding...`);
        try {
          await this.generateAll();
        } catch (error) {
          console.error('Rebuild failed:', error);
        }
        console.log('\n👀 Watching for changes (Ctrl+C to stop)...');
      }, 150);
    };

    for (const p of watchPaths) {
      try {
        watch(p, { recursive: true }, (_event, filename) =>
          scheduleRebuild(filename || p)
        );
      } catch (error) {
        console.warn(`Could not watch ${p}:`, error.message);
      }
    }

    console.log('\n👀 Watching for changes (Ctrl+C to stop)...');
  }
}

// CLI usage
if (require.main === module) {
  const engine = new TemplateEngine();

  const command = process.argv[2];

  switch (command) {
    case 'build':
    case undefined:
      engine.generateAll();
      break;
    case 'dev':
      console.log('🚀 Development mode - watching for changes...');
      engine.dev();
      break;
    case 'clean':
      engine.clean();
      break;
    default:
      console.log('Usage: node build.js [build|dev|clean]');
      process.exit(1);
  }
}

module.exports = TemplateEngine;
