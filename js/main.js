// main.js - Main application initialization

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', async function () {
  try {
    console.log('Initializing Basketball Stats application...');

    // Initialize mobile navigation
    initMobileNav();

    // Set active navigation link
    setActiveNavLink();

    // Load page configuration
    await window.dataLoader.loadPageConfig();

    // Initialize table controls
    const tableInitialized = window.tableController.init();

    // If we have table controls, load the data
    if (tableInitialized) {
      const pageConfig = window.dataLoader.getCurrentPageConfig();

      if (pageConfig && pageConfig.dataSource) {
        try {
          await window.tableController.loadData(pageConfig.dataSource);
        } catch (error) {
          console.error('Failed to load data:', error);
        }
      }
    }

    console.log('Application initialized successfully');
  } catch (error) {
    console.error('Error initializing application:', error);
  }
});

// Utility function to get current page name
function getCurrentPageName() {
  const path = window.location.pathname;
  return (
    path.substring(path.lastIndexOf('/') + 1).replace('.html', '') || 'index'
  );
}

// Export for use in other modules
window.app = {
  getCurrentPageName,
};
