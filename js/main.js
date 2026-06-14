// main.js - Main application initialization

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', async function () {
  try {
    console.log('Initializing Basketball Stats application...');

    // Initialize mobile navigation
    initMobileNav();

    // Set active navigation link
    setActiveNavLink();

    // Offset in-page anchor scrolling by the (variable-height) sticky nav
    syncNavScrollOffset();

    // Home page: transparent nav over the hero, solid once scrolled past it
    initHomeNavScrim();

    // Assemble obfuscated email addresses
    initEmailProtection();

    // Load page configuration
    await window.dataLoader.loadPageConfig();

    // Initialize table controls
    const tableInitialized = window.tableController.init();

    // If we have table controls, load the data
    if (tableInitialized) {
      const pageConfig = window.dataLoader.getCurrentPageConfig();
      console.log('Current page config:', pageConfig);

      if (pageConfig && pageConfig.dataSource) {
        console.log('Loading data for:', pageConfig.dataSource);
        try {
          await window.tableController.loadData(pageConfig.dataSource);
        } catch (error) {
          console.error('Failed to load data:', error);
        }
      } else {
        console.warn('No page config or data source found for current page');
        // No async data to load — reveal the table so it isn't left hidden by
        // the is-loading class.
        window.tableController.revealTable();
      }
    }

    console.log('Application initialized successfully');
  } catch (error) {
    console.error('Error initializing application:', error);
  }
});
