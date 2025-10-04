#!/usr/bin/env node

// build.js - Simple build system for generating HTML pages from templates

const fs = require('fs').promises;
const path = require('path');

class TemplateEngine {
  constructor() {
    this.templates = {};
    this.config = {};
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
  generateNavigation() {
    const navItems = [];

    // Define navigation order and structure
    const navConfig = [
      { key: 'index', label: 'Home', href: '/' },
      {
        key: 'publishing_tracker',
        label: 'Publishing Tracker',
        href: 'publishing_tracker.html',
      },
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
        key: 'non_conf_tournaments',
        label: 'Non-Conference Tournaments',
        href: 'non_conf_tournaments.html',
      },
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
        key: 'composite_rankings',
        label: 'Composite Rankings',
        href: 'composite_rankings.html',
      },
      {
        key: 'conference_rankings',
        label: 'Conference Rankings',
        href: 'conference_rankings.html',
      },
      { key: 'premium', label: 'Premium', href: 'premium.html' },
      { key: 'contact', label: 'Contact', href: 'contact.html' },
    ];

    for (const item of navConfig) {
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
        tableContent = this.templates.premiumPage;
      } else if (pageConfig.isSimplePage) {
        // Use simple page template for success/cancel pages
        tableContent = this.templates.simplePage;
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
      const navItems = this.generateNavigation();

      // Determine if buy button should show (feature flagged)
      const premiumEnabled = this.isFeatureEnabled('premium');
      const showBuyButton =
        premiumEnabled && !pageConfig.isPremiumPage && !pageConfig.isSimplePage;

      const fullPage = this.renderTemplate(this.templates.base, {
        title: pageConfig.title,
        heading: pageConfig.heading,
        description: pageConfig.description,
        lastUpdated: lastUpdated,
        content: tableContent,
        legend: pageConfig.legend,
        isPremiumPage: pageConfig.isPremiumPage || false,
        showBuyButton: showBuyButton,
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
