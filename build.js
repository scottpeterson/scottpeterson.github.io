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
const path = require('path');

// Obfuscation key - used for XOR encoding
// This isn't cryptographic security, just obfuscation to deter casual scraping
const OBFUSCATION_KEY = 'D3StatLab2025';

class TemplateEngine {
  constructor() {
    this.templates = {};
    this.config = {};
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
      this.templates.simplePage = await fs.readFile(
        'templates/simple-page.html',
        'utf8'
      );
      this.templates.distancesPage = await fs.readFile(
        'templates/distances-page.html',
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

  // Generate navigation HTML based on config and feature flags
  async generateNavigation() {
    const navItems = [];

    // Define navigation order and structure
    // 'reports' is a special key that triggers the Reports dropdown
    const navConfig = [
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
        label: '25-26 Preseason Rankings',
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
      { key: 'contact', label: 'Contact', href: 'contact.html' },
    ];

    for (const item of navConfig) {
      // Handle Reports dropdown specially
      if (item.isDropdown && item.key === 'reports') {
        const reportsDropdown = await this.generateReportsDropdown();
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

      navItems.push(`<li><a href="${item.href}">${item.label}</a></li>`);
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

      return reports;
    } catch (error) {
      console.warn('Could not read reports directory:', error.message);
      return [];
    }
  }

  // Generate Reports dropdown menu by reading reports directory
  async generateReportsDropdown() {
    const reports = await this.getReportsList();

    if (reports.length === 0) {
      return null;
    }

    // Build dropdown items from report files
    const dropdownItems = reports
      .map(
        r => `              <li><a href="reports/${r.file}">${r.title}</a></li>`
      )
      .join('\n');

    return `<li class="nav-dropdown">
            <a href="reports/" class="dropdown-trigger">Reports <span class="dropdown-arrow">▾</span></a>
            <ul class="dropdown-menu">
              <li><a href="reports/">All Reports</a></li>
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

    // Sort reports alphabetically by title
    const sortedReports = [...reports].sort((a, b) =>
      a.title.localeCompare(b.title)
    );

    // Generate nav (same as main pages use)
    const navItems = await this.generateNavigation();

    // Generate report cards
    const cards = sortedReports
      .map(
        r => `        <a href="${r.slug}.html" class="report-card">
          <h3>${r.title}</h3>
          <span class="report-card-arrow">→</span>
        </a>`
      )
      .join('\n');

    // Build dropdown items for reports nav
    const dropdownItems = sortedReports
      .map(
        r => `              <li><a href="${r.slug}.html">${r.title}</a></li>`
      )
      .join('\n');

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

          <li><a href="/">Home</a></li>
          <li><a href="/npi.html">NPI</a></li>
          <li><a href="/season_simulations.html">Season Simulations</a></li>
          <li><a href="/current_season_rankings.html">Current Season Rankings</a></li>
          <li><a href="/conference_rankings.html">Conference Rankings</a></li>
          <li><a href="/composite_rankings.html">Composite Rankings</a></li>
          <li><a href="/preseason_rankings.html">25-26 Preseason Rankings</a></li>
          <li><a href="/returners.html">Returning and Non-Returning</a></li>
          <li><a href="/publishing_tracker.html">Publishing Tracker</a></li>
          <li class="nav-dropdown">
            <a href="/reports/" class="dropdown-trigger">Reports <span class="dropdown-arrow">▾</span></a>
            <ul class="dropdown-menu">
              <li><a href="/reports/">All Reports</a></li>
              <li class="dropdown-divider"></li>
${dropdownItems}
            </ul>
          </li>
          <li><a href="/premium.html">Premium</a></li>
          <li><a href="/contact.html">Contact</a></li>
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

    await fs.writeFile('reports/index.html', html, 'utf8');
    console.log('✓ Generated reports/index.html');
  }

  // Simple template replacement
  renderTemplate(template, data) {
    let result = template;

    // Handle conditional sections first
    result = this.handleConditionals(result, data);

    // Handle arrays
    result = this.handleArrays(result, data);

    // Replace simple variables (case-insensitive mapping)
    const mappings = {
      PAGE_TITLE: data.title,
      PAGE_HEADING: data.heading,
      PAGE_DESCRIPTION: data.description,
      SECTION_TITLE: data.sectionTitle,
      SEARCH_PLACEHOLDER: data.searchPlaceholder,
      LAST_UPDATED: data.lastUpdated,
      CONTENT: data.content || '',
      NAV_ITEMS: data.navItems || '',
    };

    Object.keys(mappings).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, mappings[key] || '');
    });

    return result;
  }

  // Handle conditional sections {{#VAR}} content {{/VAR}}
  handleConditionals(template, data) {
    let result = template;

    // Handle HAS_SEARCH conditional
    if (data.hasSearch) {
      result = result.replace(
        /{{#HAS_SEARCH}}([\s\S]*?){{\/HAS_SEARCH}}/g,
        '$1'
      );
    } else {
      result = result.replace(/{{#HAS_SEARCH}}([\s\S]*?){{\/HAS_SEARCH}}/g, '');
    }

    // Handle SHOW_PROGRESS conditional
    if (data.showProgress) {
      result = result.replace(
        /{{#SHOW_PROGRESS}}([\s\S]*?){{\/SHOW_PROGRESS}}/g,
        '$1'
      );
    } else {
      result = result.replace(
        /{{#SHOW_PROGRESS}}([\s\S]*?){{\/SHOW_PROGRESS}}/g,
        ''
      );
    }

    // Handle LAST_UPDATED conditional
    if (data.lastUpdated) {
      result = result.replace(
        /{{#LAST_UPDATED}}([\s\S]*?){{\/LAST_UPDATED}}/g,
        '$1'
      );
    } else {
      result = result.replace(
        /{{#LAST_UPDATED}}([\s\S]*?){{\/LAST_UPDATED}}/g,
        ''
      );
    }

    // Handle LEGEND conditional
    if (data.legend) {
      result = result.replace(/{{#LEGEND}}([\s\S]*?){{\/LEGEND}}/g, '$1');
    } else {
      result = result.replace(/{{#LEGEND}}([\s\S]*?){{\/LEGEND}}/g, '');
    }

    // Handle salesEnabled conditional (positive)
    if (data.salesEnabled) {
      result = result.replace(
        /{{#salesEnabled}}([\s\S]*?){{\/salesEnabled}}/g,
        '$1'
      );
    } else {
      result = result.replace(
        /{{#salesEnabled}}([\s\S]*?){{\/salesEnabled}}/g,
        ''
      );
    }

    // Handle salesEnabled conditional (negative)
    if (!data.salesEnabled) {
      result = result.replace(
        /\{\{\^salesEnabled\}\}([\s\S]*?)\{\{\/salesEnabled\}\}/g,
        '$1'
      );
    } else {
      result = result.replace(
        /\{\{\^salesEnabled\}\}([\s\S]*?)\{\{\/salesEnabled\}\}/g,
        ''
      );
    }

    // Handle IS_PREMIUM_PAGE conditional
    if (data.isPremiumPage) {
      result = result.replace(
        /{{#IS_PREMIUM_PAGE}}([\s\S]*?){{\/IS_PREMIUM_PAGE}}/g,
        '$1'
      );
    } else {
      result = result.replace(
        /{{#IS_PREMIUM_PAGE}}([\s\S]*?){{\/IS_PREMIUM_PAGE}}/g,
        ''
      );
    }

    // Handle IS_DISTANCES_PAGE conditional
    if (data.isDistancesPage) {
      result = result.replace(
        /{{#IS_DISTANCES_PAGE}}([\s\S]*?){{\/IS_DISTANCES_PAGE}}/g,
        '$1'
      );
    } else {
      result = result.replace(
        /{{#IS_DISTANCES_PAGE}}([\s\S]*?){{\/IS_DISTANCES_PAGE}}/g,
        ''
      );
    }

    // Handle SHOW_BUY_BUTTON conditional
    if (data.showBuyButton) {
      result = result.replace(
        /{{#SHOW_BUY_BUTTON}}([\s\S]*?){{\/SHOW_BUY_BUTTON}}/g,
        '$1'
      );
    } else {
      result = result.replace(
        /{{#SHOW_BUY_BUTTON}}([\s\S]*?){{\/SHOW_BUY_BUTTON}}/g,
        ''
      );
    }

    // Handle COMMAND_PALETTE conditional
    // Always include command palette assets - the feature flag check is done in JS
    // This allows enabling via URL parameter without rebuilding
    if (data.commandPaletteEnabled) {
      result = result.replace(
        /{{#COMMAND_PALETTE}}([\s\S]*?){{\/COMMAND_PALETTE}}/g,
        '$1'
      );
    } else {
      result = result.replace(
        /{{#COMMAND_PALETTE}}([\s\S]*?){{\/COMMAND_PALETTE}}/g,
        ''
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
        .map(col => `<th>${col}</th>`)
        .join('\n          ');
      result = result.replace(/{{#COLUMNS}}[\s\S]*?{{\/COLUMNS}}/g, columnHtml);
    }

    // Handle LEGEND_ITEMS array
    if (data.legend && typeof data.legend === 'object') {
      const legendItems = Object.entries(data.legend)
        .map(
          ([column, description]) =>
            `          <div class="legend-item">
            <span class="legend-column">${column}</span>
            <span class="legend-description">${description}</span>
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

  // Get file modification date
  async getFileModificationDate(filePath) {
    try {
      const stats = await fs.stat(filePath);
      return stats.mtime.toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short',
      });
    } catch (error) {
      console.warn(
        `Could not get modification date for ${filePath}:`,
        error.message
      );
      return null;
    }
  }

  // Generate a single page
  async generatePage(pageKey, pageConfig) {
    try {
      // Handle special home page content
      let tableContent = '';
      if (pageKey === 'index') {
        // Use home content template for index page
        tableContent = this.templates.homeContent;
      } else if (pageConfig.isContactPage) {
        // Use contact page template for contact page
        tableContent = this.renderTemplate(this.templates.contactPage, {
          sectionTitle: pageConfig.sectionTitle,
        });
      } else if (pageConfig.isPremiumPage) {
        // Use premium page template
        const premiumSalesEnabled = this.isFeatureEnabled(
          'premiumSalesEnabled'
        );
        tableContent = this.renderTemplate(this.templates.premiumPage, {
          salesEnabled: premiumSalesEnabled,
        });
      } else if (pageConfig.isSimplePage) {
        // Use simple page template for success/cancel pages
        tableContent = this.templates.simplePage;
      } else if (pageConfig.isDistancesPage) {
        // Use distances page template for the distance calculator
        tableContent = this.renderTemplate(this.templates.distancesPage, {
          sectionTitle: pageConfig.sectionTitle,
        });
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

      // Get last updated date for data file
      let lastUpdated = null;
      if (pageConfig.dataSource) {
        const dataFilePath = `data/${pageConfig.dataSource}.json`;
        lastUpdated = await this.getFileModificationDate(dataFilePath);
      }

      // Render full page
      const navItems = await this.generateNavigation();

      // Determine if buy button should show (feature flagged)
      const premiumEnabled = this.isFeatureEnabled('premium');
      const showBuyButton =
        premiumEnabled && !pageConfig.isPremiumPage && !pageConfig.isSimplePage;

      // Command palette is always included in the build
      // The actual feature flag check is done client-side via URL parameter
      // This allows testing without rebuilding
      const commandPaletteEnabled = true;

      const fullPage = this.renderTemplate(this.templates.base, {
        title: pageConfig.title,
        heading: pageConfig.heading,
        description: pageConfig.description,
        lastUpdated: lastUpdated,
        content: tableContent,
        legend: pageConfig.legend,
        isPremiumPage: pageConfig.isPremiumPage || false,
        isDistancesPage: pageConfig.isDistancesPage || false,
        showBuyButton: showBuyButton,
        commandPaletteEnabled: commandPaletteEnabled,
        navItems: navItems,
      });

      // Determine output filename
      let filename;
      if (pageKey === 'index') {
        filename = 'index.html';
      } else if (pageKey === 'publishing_tracker') {
        filename = 'publishing_tracker.html';
      } else if (pageKey === 'preseason_rankings') {
        filename = 'preseason_rankings.html';
      } else {
        filename = `${pageKey}.html`;
      }

      // Write file
      await fs.writeFile(filename, fullPage, 'utf8');
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
      // In a real implementation, you'd add file watching here
      engine.generateAll();
      break;
    case 'clean':
      console.log('🧹 Cleaning generated files...');
      // Clean up generated HTML files
      break;
    default:
      console.log('Usage: node build.js [build|dev|clean]');
      process.exit(1);
  }
}

module.exports = TemplateEngine;
