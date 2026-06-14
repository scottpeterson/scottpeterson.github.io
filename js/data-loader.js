// data-loader.js - Data loading and management
//
// Data Obfuscation:
// This loader fetches encoded data from /data-encoded/ and decodes it client-side.
// The encoding uses XOR with a key followed by base64. This deters casual scraping
// and makes it harder for bots/LLMs to directly parse raw JSON from network requests.
//
// The corresponding encode function lives in build.js.

// Obfuscation key - must match the key in build.js
const OBFUSCATION_KEY = 'D3StatLab2025';

class DataLoader {
  constructor() {
    this.cache = new Map();
    this.pageConfig = null;
  }

  // Decode obfuscated data (reverses the XOR + base64 encoding from build.js)
  decodeData(encodedString) {
    const keyBytes = OBFUSCATION_KEY.split('').map(c => c.charCodeAt(0));

    // Decode base64 to binary string
    const binaryString = atob(encodedString);
    const bytes = new Uint8Array(binaryString.length);

    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // XOR decode
    const decoded = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) {
      decoded[i] = bytes[i] ^ keyBytes[i % keyBytes.length];
    }

    // Convert back to string and parse JSON
    const jsonString = new TextDecoder().decode(decoded);
    return JSON.parse(jsonString);
  }

  // Load this page's configuration. The build inlines the current page's config
  // into the document <head> as window.__PAGE_CONFIG__ (just dataSource +
  // columnMappings, the only fields read at runtime), so the common path needs
  // no network request. Falls back to fetching the full config/pages.json and
  // selecting the current page if the inline config is somehow absent.
  async loadPageConfig() {
    if (this.pageConfig) {
      return this.pageConfig;
    }

    if (window.__PAGE_CONFIG__) {
      this.pageConfig = window.__PAGE_CONFIG__;
      return this.pageConfig;
    }

    try {
      const response = await fetch('config/pages.json');
      const allConfig = await response.json();
      const path = window.location.pathname;
      const currentPage =
        path.substring(path.lastIndexOf('/') + 1).replace('.html', '') ||
        'index';
      this.pageConfig = allConfig[currentPage] || null;
      return this.pageConfig;
    } catch (error) {
      console.error('Error loading page config:', error);
      return null;
    }
  }

  // Load data for a specific source (from encoded files)
  async loadData(dataSource) {
    if (this.cache.has(dataSource)) {
      return this.cache.get(dataSource);
    }

    try {
      // Reuse the in-flight request the document <head> kicked off for this page's
      // data, if it matches — otherwise fetch now. The prefetch is single-use (a
      // Response body can't be read twice), and the cache.has() guard above means
      // a given source is only loaded once anyway.
      let response;
      const prefetch = window.__DATA_PREFETCH__;
      if (prefetch && prefetch.source === dataSource && prefetch.promise) {
        window.__DATA_PREFETCH__ = null;
        response = await prefetch.promise;
      } else {
        response = await fetch(`data-encoded/${dataSource}.json`);
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const wrapper = await response.json();

      // Check if data is encoded (has _encoded property)
      let data;
      if (wrapper._encoded) {
        // Decode the obfuscated data
        data = this.decodeData(wrapper._encoded);
      } else {
        // Fallback for non-encoded data (shouldn't happen in production)
        data = wrapper;
      }

      this.cache.set(dataSource, data);
      return data;
    } catch (error) {
      console.error(`Error loading data for ${dataSource}:`, error);
      return [];
    }
  }

  // Get current page configuration. pageConfig is already this page's config
  // object (inlined by the build or selected from the full config in the
  // fallback path), so return it directly.
  getCurrentPageConfig() {
    return this.pageConfig || window.__PAGE_CONFIG__ || null;
  }
}

// Create global instance
window.dataLoader = new DataLoader();
