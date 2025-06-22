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
      this.templates.tablePage = await fs.readFile('templates/table-page.html', 'utf8');
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
      'PAGE_TITLE': data.title,
      'PAGE_HEADING': data.heading,
      'PAGE_DESCRIPTION': data.description,
      'SECTION_TITLE': data.sectionTitle,
      'SEARCH_PLACEHOLDER': data.searchPlaceholder,
      'CONTENT': data.content || ''
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
      result = result.replace(/{{#HAS_SEARCH}}([\s\S]*?){{\/HAS_SEARCH}}/g, '$1');
    } else {
      result = result.replace(/{{#HAS_SEARCH}}([\s\S]*?){{\/HAS_SEARCH}}/g, '');
    }
    
    return result;
  }

  // Handle array iterations {{#ARRAY}} {{.}} {{/ARRAY}}
  handleArrays(template, data) {
    let result = template;
    
    // Handle COLUMNS array
    if (data.columns && Array.isArray(data.columns)) {
      const columnHtml = data.columns.map(col => `<th>${col}</th>`).join('\n          ');
      result = result.replace(/{{#COLUMNS}}[\s\S]*?{{\/COLUMNS}}/g, columnHtml);
    }
    
    return result;
  }

  // Generate a single page
  async generatePage(pageKey, pageConfig) {
    try {
      // Render table page content
      const tableContent = this.renderTemplate(this.templates.tablePage, {
        sectionTitle: pageConfig.sectionTitle,
        hasSearch: pageConfig.hasSearch,
        searchPlaceholder: pageConfig.searchPlaceholder,
        columns: pageConfig.columns
      });

      // Render full page
      const fullPage = this.renderTemplate(this.templates.base, {
        title: pageConfig.title,
        heading: pageConfig.heading,
        description: pageConfig.description,
        content: tableContent
      });

      // Determine output filename
      const filename = pageKey === 'index' ? 'index.html' : `${pageKey}.html`;
      
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