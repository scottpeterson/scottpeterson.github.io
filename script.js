// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    try {
      // Set active navigation link
      setActiveNavLink();
      
      // Initialize search and filter functionality if on a page with a table
      initSearchAndFilter();
    } catch (error) {
      console.error("Error initializing script:", error);
    }
  });
  
  // Function to set the active navigation link
  function setActiveNavLink() {
    try {
      // Get the current page filename
      const path = window.location.pathname;
      const currentPage = path.substring(path.lastIndexOf('/') + 1) || 'index.html';
      
      // Get all navigation links
      const navLinks = document.querySelectorAll('.nav-links a');
      
      // Process each link
      navLinks.forEach(function(link) {
        // Remove any existing active class
        link.classList.remove('active');
        
        // Get the href attribute
        const href = link.getAttribute('href');
        
        // Add active class if this is the current page
        if (href === currentPage) {
          link.classList.add('active');
        }
      });
    } catch (error) {
      console.error("Error in setActiveNavLink:", error);
    }
  }
  
  // Function to initialize search and filter functionality
  function initSearchAndFilter() {
    try {
      // Get DOM elements
      const searchInput = document.getElementById('teamSearch');
      const conferenceFilter = document.getElementById('conferenceFilter');
      const table = document.getElementById('statsTable');
      
      // Exit if the current page doesn't have the table or filters
      if (!searchInput || !conferenceFilter || !table) {
        console.log("Search/filter elements not found on this page");
        return;
      }
      
      // Add event listeners for search and filter
      searchInput.addEventListener('input', function() {
        filterTable();
      });
      
      conferenceFilter.addEventListener('change', function() {
        filterTable();
      });
      
      // Function to filter the table based on search and conference filter
      function filterTable() {
        try {
          const searchTerm = searchInput.value.toLowerCase();
          const conference = conferenceFilter.value;
          
          const tbody = table.querySelector('tbody');
          if (!tbody) {
            console.error("Table body not found");
            return;
          }
          
          const rows = tbody.querySelectorAll('tr');
          let visibleRows = 0;
          
          // Process each row
          rows.forEach(function(row) {
            if (!row.cells || row.cells.length < 4) {
              console.log("Row has insufficient cells:", row);
              return;
            }
            
            const teamCell = row.cells[0];
            const confCell = row.cells[3];
            
            if (!teamCell || !confCell) {
              console.log("Required cells not found in row:", row);
              return;
            }
            
            const teamName = teamCell.textContent.toLowerCase();
            const rowConference = confCell.textContent.trim();
            
            // Check if row matches both search term and conference filter
            const matchesSearch = teamName.includes(searchTerm);
            const matchesConference = conference === '' || rowConference === conference;
            
            // Show or hide the row based on matches
            if (matchesSearch && matchesConference) {
              row.style.display = '';
              visibleRows++;
            } else {
              row.style.display = 'none';
            }
          });
          
          // Check if no results found
          showNoResults(visibleRows === 0, table);
        } catch (error) {
          console.error("Error in filterTable:", error);
        }
      }
    } catch (error) {
      console.error("Error in initSearchAndFilter:", error);
    }
  }
  
  // Function to show/hide "No results" message
  function showNoResults(show, table) {
    try {
      // Look for existing message
      let noResultsMsg = document.querySelector('.no-results');
      
      // Remove existing message if any
      if (noResultsMsg) {
        noResultsMsg.parentNode.removeChild(noResultsMsg);
      }
      
      // Add new message if needed
      if (show && table) {
        noResultsMsg = document.createElement('div');
        noResultsMsg.className = 'no-results';
        noResultsMsg.textContent = 'No matching teams found';
        
        // Insert after the table
        if (table.parentNode) {
          table.parentNode.insertBefore(noResultsMsg, table.nextSibling);
        }
      }
    } catch (error) {
      console.error("Error in showNoResults:", error);
    }
  }