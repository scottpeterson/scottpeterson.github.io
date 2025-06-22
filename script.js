// Complete script.js with aggressive hamburger hiding

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function () {
  try {
    // Initialize mobile navigation
    initMobileNav();

    // Set active navigation link
    setActiveNavLink();

    // Initialize search and filter functionality
    initSearchAndFilter();

    // Initialize table sorting functionality
    initTableSorting();
  } catch (error) {
    console.error('Error initializing script:', error);
  }
});

// Function to initialize mobile navigation
function initMobileNav() {
  try {
    const menuToggle = document.getElementById('menuToggle');
    const menuClose = document.getElementById('menuClose');
    const navMenu = document.getElementById('navMenu');
    const navOverlay = document.getElementById('navOverlay');

    // Exit if essential elements don't exist
    if (!menuToggle || !navMenu || !navOverlay) {
      console.log('Mobile nav elements not found');
      return;
    }

    // Toggle menu when hamburger is clicked
    menuToggle.addEventListener('click', function (event) {
      event.stopPropagation(); // Prevent event bubbling
      openMenu();
    });

    // Close menu when X button is clicked (if it exists)
    if (menuClose) {
      menuClose.addEventListener('click', function (event) {
        event.stopPropagation(); // Prevent event bubbling
        closeMenu();
      });
    }

    // Close menu when overlay is clicked
    navOverlay.addEventListener('click', function () {
      closeMenu();
    });

    // Close menu when a nav link is clicked
    const navLinks = navMenu.querySelectorAll('a');
    navLinks.forEach(function (link) {
      link.addEventListener('click', function () {
        closeMenu();
      });
    });

    // Open menu function with aggressive hamburger hiding
    function openMenu() {
      // First hide the hamburger to prevent overlap issues
      menuToggle.classList.add('hidden');

      // Then show the menu and overlay
      setTimeout(function () {
        navMenu.classList.add('active');
        navOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
      }, 10);
    }

    // Close menu function
    function closeMenu() {
      navMenu.classList.remove('active');
      navOverlay.classList.remove('active');
      document.body.style.overflow = '';

      // Delay hamburger display to ensure menu has transitioned out
      setTimeout(function () {
        menuToggle.classList.remove('hidden');
      }, 300); // Match this to your transition time
    }

    // Close menu when window is resized to desktop size
    window.addEventListener('resize', function () {
      if (window.innerWidth > 768 && navMenu.classList.contains('active')) {
        closeMenu();
      }
    });
  } catch (error) {
    console.error('Error in initMobileNav:', error);
  }
}

// Function to set the active navigation link
function setActiveNavLink() {
  try {
    // Get the current page filename
    const path = window.location.pathname;
    const currentPage =
      path.substring(path.lastIndexOf('/') + 1) || 'index.html';

    // Get all navigation links
    const navLinks = document.querySelectorAll('.nav-links a');

    // Process each link
    navLinks.forEach(function (link) {
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
    console.error('Error in setActiveNavLink:', error);
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
      console.log('Search/filter elements not found on this page');
      return;
    }

    // Populate conference filter with unique values from table
    populateConferenceFilter(table, conferenceFilter);

    // Add event listeners for search and filter
    searchInput.addEventListener('input', function () {
      filterTable();
    });

    conferenceFilter.addEventListener('change', function () {
      filterTable();
    });

    // Function to populate conference filter with unique values
    function populateConferenceFilter(table, filter) {
      try {
        const tbody = table.querySelector('tbody');
        if (!tbody) {
          return;
        }

        const conferences = new Set();
        const rows = tbody.querySelectorAll('tr');

        // Find column that contains conference data
        const headers = table.querySelectorAll('th');
        let confColumnIndex = -1;

        headers.forEach((header, index) => {
          const headerText = header.textContent.toLowerCase();
          if (
            headerText.includes('conf') ||
            headerText.includes('conference')
          ) {
            confColumnIndex = index;
          }
        });

        // If no conference column found, try common positions
        if (confColumnIndex === -1) {
          rows.forEach(row => {
            if (row.cells.length > 3) {
              const cellText = row.cells[3].textContent.trim().toUpperCase();
              if (cellText.length <= 10 && cellText.match(/^[A-Z]+$/)) {
                confColumnIndex = 3;
              }
            }
          });
        }

        // Collect unique conferences
        if (confColumnIndex >= 0) {
          rows.forEach(row => {
            if (row.cells[confColumnIndex]) {
              const conf = row.cells[confColumnIndex].textContent.trim();
              if (conf) {
                conferences.add(conf);
              }
            }
          });

          // Clear existing options except "All Conferences"
          filter.innerHTML = '<option value="">All Conferences</option>';

          // Add conference options
          Array.from(conferences)
            .sort()
            .forEach(conf => {
              const option = document.createElement('option');
              option.value = conf;
              option.textContent = conf;
              filter.appendChild(option);
            });
        }
      } catch (error) {
        console.error('Error populating conference filter:', error);
      }
    }

    // Function to filter the table based on search and conference filter
    function filterTable() {
      try {
        const searchTerm = searchInput.value.toLowerCase();
        const conference = conferenceFilter.value;

        const tbody = table.querySelector('tbody');
        if (!tbody) {
          console.error('Table body not found');
          return;
        }

        const rows = tbody.querySelectorAll('tr');
        let visibleRows = 0;

        // Find team and conference column indices
        const headers = table.querySelectorAll('th');
        let teamColumnIndex = 0; // Default to first column
        let confColumnIndex = -1;

        headers.forEach((header, index) => {
          const headerText = header.textContent.toLowerCase();
          if (headerText.includes('team') || index === 0) {
            teamColumnIndex = index;
          }
          if (
            headerText.includes('conf') ||
            headerText.includes('conference')
          ) {
            confColumnIndex = index;
          }
        });

        // If no conference column found, try common positions
        if (confColumnIndex === -1 && rows.length > 0) {
          for (let i = 0; i < Math.min(rows[0].cells.length, 6); i++) {
            const cellText = rows[0].cells[i].textContent.trim().toUpperCase();
            if (cellText.length <= 10 && cellText.match(/^[A-Z]+$/)) {
              confColumnIndex = i;
              break;
            }
          }
        }

        // Process each row
        rows.forEach(function (row) {
          if (!row.cells || row.cells.length === 0) {
            return;
          }

          const teamCell = row.cells[teamColumnIndex];
          const confCell =
            confColumnIndex >= 0 ? row.cells[confColumnIndex] : null;

          if (!teamCell) {
            return;
          }

          const teamName = teamCell.textContent.toLowerCase();
          const rowConference = confCell ? confCell.textContent.trim() : '';

          // Check if row matches both search term and conference filter
          const matchesSearch = teamName.includes(searchTerm);
          const matchesConference =
            conference === '' || rowConference === conference;

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
        console.error('Error in filterTable:', error);
      }
    }
  } catch (error) {
    console.error('Error in initSearchAndFilter:', error);
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
    console.error('Error in showNoResults:', error);
  }
}

// Function to initialize table sorting functionality
function initTableSorting() {
  try {
    const table = document.getElementById('statsTable');
    if (!table) {
      console.log('Stats table not found on this page');
      return;
    }

    const headers = table.querySelectorAll('th');
    headers.forEach(function (header, index) {
      header.style.cursor = 'pointer';
      header.style.userSelect = 'none';
      header.style.position = 'relative';

      // Add sorting indicator
      const sortIndicator = document.createElement('span');
      sortIndicator.className = 'sort-indicator';
      sortIndicator.innerHTML = ' ↕';
      header.appendChild(sortIndicator);

      header.addEventListener('click', function () {
        sortTable(table, index, header);
      });
    });
  } catch (error) {
    console.error('Error in initTableSorting:', error);
  }
}

// Function to sort table by column
function sortTable(table, columnIndex, header) {
  try {
    const tbody = table.querySelector('tbody');
    if (!tbody) {
      return;
    }

    const rows = Array.from(tbody.querySelectorAll('tr')).filter(
      row => row.style.display !== 'none'
    );
    const isAscending = header.getAttribute('data-sort') !== 'asc';

    // Clear all sort indicators
    table.querySelectorAll('th .sort-indicator').forEach(indicator => {
      indicator.innerHTML = ' ↕';
      indicator.parentElement.removeAttribute('data-sort');
    });

    // Set current sort indicator
    const indicator = header.querySelector('.sort-indicator');
    if (isAscending) {
      indicator.innerHTML = ' ↑';
      header.setAttribute('data-sort', 'asc');
    } else {
      indicator.innerHTML = ' ↓';
      header.setAttribute('data-sort', 'desc');
    }

    // Sort rows
    rows.sort(function (a, b) {
      const aVal = a.cells[columnIndex].textContent.trim();
      const bVal = b.cells[columnIndex].textContent.trim();

      // Try to parse as numbers
      const aNum = parseFloat(aVal.replace(/[^\d.-]/g, ''));
      const bNum = parseFloat(bVal.replace(/[^\d.-]/g, ''));

      let result;
      if (!isNaN(aNum) && !isNaN(bNum)) {
        result = aNum - bNum;
      } else {
        result = aVal.localeCompare(bVal);
      }

      return isAscending ? result : -result;
    });

    // Reorder rows in DOM
    rows.forEach(row => tbody.appendChild(row));
  } catch (error) {
    console.error('Error in sortTable:', error);
  }
}
