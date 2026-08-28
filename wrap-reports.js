#!/usr/bin/env node

/**
 * wrap-reports.js - Wraps standalone HTML reports with site navigation
 *
 * PURPOSE:
 * This script enables a zero-config workflow for publishing standalone HTML reports.
 * Drop an HTML file into data/static_reports_html/, run npm run wrap-reports,
 * and the report appears on the site with full navigation.
 *
 * HOW IT WORKS:
 * 1. Scans data/static_reports_html/ for HTML files
 * 2. Extracts <title>, <style>, <body>, and external scripts from each
 * 3. Wraps content in site template with nav/header/footer
 * 4. Scopes CSS to prevent conflicts (body{} -> .report-slug{})
 * 5. Outputs wrapped reports to reports/{slug}.html
 * 6. Delegates reports/index.html to build.js (single source of truth)
 *
 * NAV / INDEX SINGLE SOURCE OF TRUTH:
 * The header nav and reports/index.html are owned by build.js (TemplateEngine).
 * This script imports that engine and calls engine.renderNavShell() for the
 * wrapped pages and engine.regenerateReportsIndex() for the index, so the menu
 * and index never drift from the rest of the site. This file no longer carries
 * its own hardcoded nav or index markup.
 *
 * CSS ISOLATION (implemented in lib/embed-html.js, shared with build.js):
 * Reports often have global styles targeting body, *, etc.
 * To prevent conflicts with the site styles, we:
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
 * Generate the wrapped HTML for a single report.
 * `nav` is the canonical <nav> shell rendered once by build.js
 * (engine.renderNavShell) and shared across all wrapped pages — client-side
 * navigation.js handles the active-link highlight, so no per-page nav needed.
 */
function generateWrappedReport(report, nav) {
  const { slug, title, styles, body, externalScripts, inlineScripts } = report;

  // Generate external script tags
  const externalScriptTags = externalScripts
    .map(src => `    <script src="${src}"></script>`)
    .join('\n');

  // Generate inline script tags
  const inlineScriptTags = inlineScripts
    .map(content => `    <script>\n${content}\n    </script>`)
    .join('\n');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title} - The D3 Stat Lab</title>

    <!-- Block AI/LLM crawlers from using content for training -->
    <meta name="robots" content="noai, noimageai" />
    <meta name="googlebot" content="noai, noimageai" />

    <link rel="icon" type="image/png" href="/favicon.png" />
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

  return {
    slug,
    title,
    styles,
    body,
    externalScripts,
    inlineScripts,
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

    // Clean up stale reports in output dir that no longer have a source file.
    // Without this, old files linger in reports/ and get picked up by build.js
    // for the nav dropdown, creating broken links.
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
      // Output dir may not exist yet — that's fine, nothing to clean
    }

    // Process all reports
    const reports = [];
    for (const file of htmlFiles) {
      const report = await processReport(file);
      reports.push(report);
      console.log(`  ✓ Processed ${file} → ${report.slug}.html`);
    }

    // Build the canonical nav once via build.js (single source of truth). Pass
    // the reports explicitly (shaped like getReportsList: { slug, title, file },
    // title-sorted to match) so the dropdown is built from this in-memory set
    // rather than the reports/ dir, which is still mid-write here.
    const engine = new TemplateEngine();
    await engine.loadConfig();
    const navReports = reports
      .map(r => ({ slug: r.slug, title: r.title, file: `${r.slug}.html` }))
      .sort((a, b) => a.title.localeCompare(b.title));
    const nav = await engine.renderNavShell({
      absolute: true,
      reports: navReports,
    });

    // Generate wrapped reports (Prettier-formatted via writeHtml so the output
    // matches what the pre-commit hook produces — no idempotency drift).
    console.log('\n📝 Generating wrapped reports...\n');
    for (const report of reports) {
      const html = generateWrappedReport(report, nav);
      const outputPath = path.join(OUTPUT_DIR, `${report.slug}.html`);
      await engine.writeHtml(outputPath, html);
      console.log(`  ✓ Generated ${outputPath}`);
    }

    // reports/index.html is owned solely by build.js — regenerate it from the
    // now-complete reports/ dir so wrap-reports and `npm run build` produce the
    // exact same index.
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
