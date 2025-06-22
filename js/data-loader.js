// data-loader.js - Data loading and management

class DataLoader {
  constructor() {
    this.cache = new Map();
    this.pageConfig = null;
  }

  // Load page configuration
  async loadPageConfig() {
    if (this.pageConfig) {
      return this.pageConfig;
    }

    try {
      const response = await fetch('config/pages.json');
      this.pageConfig = await response.json();
      return this.pageConfig;
    } catch (error) {
      console.error('Error loading page config:', error);
      return {};
    }
  }

  // Load data for a specific source
  async loadData(dataSource) {
    if (this.cache.has(dataSource)) {
      return this.cache.get(dataSource);
    }

    try {
      const response = await fetch(`data/${dataSource}.json`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      this.cache.set(dataSource, data);
      return data;
    } catch (error) {
      console.error(`Error loading data for ${dataSource}:`, error);
      return [];
    }
  }

  // Get current page configuration
  getCurrentPageConfig() {
    const path = window.location.pathname;
    const currentPage =
      path.substring(path.lastIndexOf('/') + 1).replace('.html', '') || 'index';
    return this.pageConfig ? this.pageConfig[currentPage] : null;
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
  }
}

// Create global instance
window.dataLoader = new DataLoader();
