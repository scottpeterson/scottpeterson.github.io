// Function to set the active navigation link based on current page
document.addEventListener('DOMContentLoaded', function() {
    // Set active navigation link
    setActiveNavLink();
    
    // Initialize search and filter functionality if on a page with a table
    initSearchAndFilter();
  });
  
  // Function to set the active navigation link
  function setActiveNavLink() {
    // Get the current page filename
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    // Get all navigation links
    const navLinks = document.querySelectorAll('.nav-links a');
    
    // Remove active class from all links
    navLinks.forEach(link => {
      link.classList.remove('active');
    });
    
    // Add active class to the link that matches the current page
    navLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href === currentPage) {
        link.classList.add('active');
      }
    });
  }
  
  // Function to initialize search and filter functionality
  function initSearchAndFilter() {
    const searchInput = document.getElementById('teamSearch');
    const conferenceFilter = document.getElementById('conferenceFilter');
    const table = document.getElementById('statsTable');
    
    // Exit if the current page doesn't have the table or filters
    if (!searchInput || !conferenceFilter || !table) return;
    
    // Add event listeners for search and filter
    searchInput.addEventListener('input', filterTable);
    conferenceFilter.addEventListener('change', filterTable);
    
    // Function to filter the table based on search and conference filter
    function filterTable() {
      const searchTerm = searchInput.value.toLowerCase();
      const conference = conferenceFilter.value;
      
      const rows = table.querySelectorAll('tbody tr');
      let visibleRows = 0;
      
      rows.forEach(row => {
        const teamName = row.cells[0].textContent.toLowerCase();
        const rowConference = row.cells[3].textContent;
        
        // Check if row matches both search term and conference filter
        const matchesSearch = teamName.includes(searchTerm);
        const matchesConference = conference === '' || rowConference === conference;
        
        // Show or hide the row based on matches
        if (matchesSearch && matchesConference) {
          row.classList.remove('hidden');
          visibleRows++;
        } else {
          row.classList.add('hidden');
        }
      });
      
      // Check if no results found
      showNoResults(visibleRows === 0);
    }
    
    // Function to show/hide "No results" message
    function showNoResults(show) {
      // Remove existing message if any
      const existingMessage = document.querySelector('.no-results');
      if (existingMessage) {
        existingMessage.remove();
      }
      
      // Add new message if needed
      if (show) {
        const noResults = document.createElement('div');
        noResults.className = 'no-results';
        noResults.textContent = 'No matching teams found';
        
        // Insert after the table
        table.parentNode.insertBefore(noResults, table.nextSibling);
      }
    }
  }