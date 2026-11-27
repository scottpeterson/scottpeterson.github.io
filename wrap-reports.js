#!/usr/bin/env node

/**
 * wrap-reports.js - Wraps standalone HTML reports with site navigation
 *
 * PURPOSE:
 * This script publishes standalone HTML reports with no configuration.
 * Drop an HTML file into data/static_reports_html/ and run npm run wrap-reports.
 * The report then appears on the site with full navigation.
 *
 * Steps:
 * 1. Scans data/static_reports_html/ for HTML files
 * 2. Extracts <title>, <style>, <body>, and external scripts from each
 * 3. Wraps content in site template with nav/header/footer
 * 4. Scopes CSS to prevent conflicts (body{} -> .report-slug{})
 * 5. Outputs wrapped reports to reports/{slug}.html
 * 6. Delegates reports/index.html to build.js (single source of truth)
 *
 * Nav and index source:
 * build.js (TemplateEngine) generates the header nav and reports/index.html.
 * This script imports that engine. It calls engine.renderNavShell() for the
 * wrapped pages and engine.regenerateReportsIndex() for the index. So the menu
 * and index never drift from the rest of the site. wrap-reports.js has no hardcoded
 * nav or index markup.
 *
 * CSS ISOLATION (implemented in lib/embed-html.js, shared with build.js):
 * Reports often have global styles that target body, *, and other elements.
 * To prevent conflicts with the site styles, wrap-reports.js does these steps:
 * - Wrap report content in a div with class .report-{slug}
 * - Transform CSS selectors: body {} -> .report-{slug} {}
 * - Site styles load first, then scoped report styles
 *
 * WORKFLOW:
 * 1. Drop HTML file into data/static_reports_html/
 * 2. Run: npm run wrap-reports
 * 3. Commit: git add reports/ && git commit -m "Add reports" && git push
 */

const fs = require('fs').promises;
const path = require('path');
const TemplateEngine = require('./build.js');
const {
  extractTitle,
  extractStyles,
  extractExternalScripts,
  extractInlineScripts,
  extractBody,
  scopeCSS,
} = require('./lib/embed-html.js');

const SOURCE_DIR = 'data/static_reports_html';
const OUTPUT_DIR = 'reports';

/**
 * Convert filename to URL slug
 * Examples:
 *   bubble_watch.html -> bubble_watch
 *   team_comparison_2026-02-01.html -> team_comparison_2026-02-01
 */
function fileToSlug(filename) {
  return path.basename(filename, '.html');
}

/**
 * Convert slug to human-readable title
 * Examples:
 *   bubble_watch -> Bubble Watch
 *   team_comparison_2026-02-01 -> Team Comparison 2026 02 01
 */
function slugToTitle(slug) {
  return slug
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Extract content between tags using regex
 * Returns the first match or null
 */
/**
 * Generate the wrapped HTML for a single report. `nav` is the canonical <nav>
 * shell that build.js renders once (engine.renderNavShell). All wrapped pages
 * share it. The client-side navigation.js handles the active-link highlight,
 * so no page needs its own nav.
 */
function generateWrappedReport(report, nav) {
  const {
    slug,
    title,
    styles,
    body,
    externalScripts,
    inlineScripts,
    carriedMetas,
  } = report;

  // Copy the metas the source report writes for its readers and its checkers.
  // They are the description, the abbreviations the style linter skips
  // (ste-allow), and the brand colors the contrast checker exempts
  // (contrast-allow). Dropping them
  // failed every wrapped report on 2026-11-17 (missing description, "Leverage"
  // and "PG" flagged although each report allows them).
  const carriedMetaTags = carriedMetas.map(m => `    ${m}\n`).join('');

  // Generate external script tags
  const externalScriptTags = externalScripts
    .map(src => `    <script src="${src}"></script>`)
    .join('\n');

  // Generate inline script tags
  const inlineScriptTags = inlineScripts
    .map(
      ({ attrs, content }) => `    <script${attrs}>\n${content}\n    </script>`
    )
    .join('\n');

  // data-theme="light": the site ships one light theme. Reports have their
  // own dark theme keyed on :root:not([data-theme="light"]). A phone in dark
  // mode would switch that theme on over the site's light page.
  return `<!doctype html>
<html lang="en" data-theme="light">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <!-- One light theme. These stop Firefox for iOS "Website Dark Mode" (Dark
         Reader) and similar overlays from recoloring the page. -->
    <meta name="color-scheme" content="light" />
    <meta name="theme-color" content="#2c3e50" />
    <meta name="darkreader-lock" />
${carriedMetaTags}    <title>${title} - The D3 Stat Lab</title>

    <!-- Block AI/LLM crawlers from using content for training -->
    <meta name="robots" content="noai, noimageai" />
    <meta name="googlebot" content="noai, noimageai" />

    <link rel="icon" type="image/png" href="/favicon.png" />
    <!-- IBM Plex Sans and Mono, the site's type (styles.css --font-sans). -->
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      rel="stylesheet"
      href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,400;1,400&family=IBM+Plex+Sans:ital,wght@0,400;0,500;0,600;1,400&display=swap"
    />
    <link rel="stylesheet" href="/styles.css" />
    <link rel="stylesheet" href="/css/reports.css" />

    <!-- Scoped report styles -->
    <style>
${styles}
    </style>

    <!-- GoatCounter Analytics -->
    <script
      data-goatcounter="https://thed3statlab.goatcounter.com/count"
      async
      src="https://gc.zgo.at/count.js"
    ></script>
  </head>
  <body>
    ${nav}

    <div class="report-wrapper">
      <div class="report-back-link">
        <a href="/reports/">← Back to Reports</a>
      </div>

      <div class="report-${slug}">
${body}
      </div>
    </div>

    <footer>
      <p>&copy; <span id="currentYear">2026</span> D3 Stat Lab. All rights reserved.</p>
    </footer>
    <script>document.getElementById('currentYear').textContent = new Date().getFullYear();</script>

    <!-- JavaScript for navigation -->
    <script src="/js/navigation.js"></script>
    <script src="/js/reports-nav.js"></script>
${externalScriptTags}
${inlineScriptTags}
  </body>
</html>`;
}

/**
 * Process a single HTML report file
 */
async function processReport(filename) {
  const filepath = path.join(SOURCE_DIR, filename);
  const html = await fs.readFile(filepath, 'utf8');

  const slug = fileToSlug(filename);
  const extractedTitle = extractTitle(html);
  const title = extractedTitle || slugToTitle(slug);
  const rawStyles = extractStyles(html);
  const styles = scopeCSS(rawStyles, `.report-${slug}`);
  const body = extractBody(html);
  const externalScripts = extractExternalScripts(html);
  const inlineScripts = extractInlineScripts(html);
  const carriedMetas = ['description', 'ste-allow', 'contrast-allow']
    .map(name =>
      html.match(
        new RegExp(
          `<meta\\s+name=["']${name}["']\\s+content=(?:"[^"]*"|'[^']*')[^>]*>`,
          'i'
        )
      )
    )
    .filter(Boolean)
    .map(m => m[0]);

  return {
    slug,
    title,
    styles,
    body,
    externalScripts,
    inlineScripts,
    carriedMetas,
    filename,
  };
}

/**
 * Main entry point
 */
async function main() {
  console.log('📦 Wrapping static reports...\n');

  try {
    // Ensure output directory exists
    await fs.mkdir(OUTPUT_DIR, { recursive: true });

    // Find all HTML files in source directory
    let files;
    try {
      files = await fs.readdir(SOURCE_DIR);
    } catch (e) {
      console.log(`ℹ️  No source directory found at ${SOURCE_DIR}`);
      console.log('   Create the directory and add HTML reports to wrap.\n');
      return;
    }

    const htmlFiles = files.filter(f => f.endsWith('.html'));

    if (htmlFiles.length === 0) {
      console.log(`ℹ️  No HTML files found in ${SOURCE_DIR}\n`);
      return;
    }

    console.log(`📄 Found ${htmlFiles.length} reports to process...\n`);

    // Delete stale reports in the output dir that no longer have a source
    // file. Otherwise old files stay in reports/, and build.js lists them in
    // the nav dropdown as broken links.
    const sourceBasenames = new Set(htmlFiles.map(f => path.basename(f)));
    try {
      const existingOutputFiles = await fs.readdir(OUTPUT_DIR);
      const staleFiles = existingOutputFiles.filter(
        f =>
          f.endsWith('.html') && f !== 'index.html' && !sourceBasenames.has(f)
      );
      for (const stale of staleFiles) {
        await fs.unlink(path.join(OUTPUT_DIR, stale));
        console.log(`  🗑  Removed stale report: ${stale}`);
      }
      if (staleFiles.length > 0) {
        console.log('');
      }
    } catch (e) {
      // The output dir may not exist yet. Then there is nothing to
      // clean.
    }

    // Process all reports
    const reports = [];
    for (const file of htmlFiles) {
      const report = await processReport(file);
      reports.push(report);
      console.log(`  ✓ Processed ${file} → ${report.slug}.html`);
    }

    // Build the canonical nav once through build.js, the single source of truth.
    // Pass the reports explicitly, shaped like getReportsList ({ slug, title,
    // file }) and sorted by title to match. The dropdown is then built from this
    // in-memory set. The reports/ dir is still mid-write here.
    const engine = new TemplateEngine();
    await engine.loadConfig();
    const navReports = reports
      .map(r => ({ slug: r.slug, title: r.title, file: `${r.slug}.html` }))
      .sort((a, b) => a.title.localeCompare(b.title));
    const nav = await engine.renderNavShell({
      absolute: true,
      reports: navReports,
    });

    // Generate wrapped reports, Prettier-formatted through writeHtml. The
    // output then matches what the pre-commit hook produces, so a rerun
    // changes no files.
    console.log('\n📝 Generating wrapped reports...\n');
    for (const report of reports) {
      const html = generateWrappedReport(report, nav);
      const outputPath = path.join(OUTPUT_DIR, `${report.slug}.html`);
      await engine.writeHtml(outputPath, html);
      console.log(`  ✓ Generated ${outputPath}`);
    }

    // Only build.js generates reports/index.html. Regenerate it from the
    // now-complete reports/ dir, so wrap-reports and `npm run build` produce
    // the exact same index.
    await engine.regenerateReportsIndex();

    console.log(`\n✅ Successfully wrapped ${reports.length} reports!`);
    console.log('   View at: http://localhost:8000/reports/\n');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main, processReport, scopeCSS };
