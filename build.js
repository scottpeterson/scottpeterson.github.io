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
      const fullPage = this.renderTemplate(this.templates.base, {
        title: pageConfig.title,
        heading: pageConfig.heading,
        description: pageConfig.description,
        lastUpdated: lastUpdated,
        content: tableContent,
      });

      // Determine output filename
      let filename;
      if (pageKey === 'index') {
        filename = 'index.html';
      } else if (pageKey === 'page1') {
        filename = 'publishing_tracker.html';
      } else if (pageKey === 'page2') {
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

      const pages = Object.keys(this.config);
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
