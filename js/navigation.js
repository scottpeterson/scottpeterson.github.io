// navigation.js - Mobile navigation functionality

// Function to initialize mobile navigation
function initMobileNav() {
  try {
    const menuToggle = document.getElementById('menuToggle');
    const menuClose = document.getElementById('menuClose');
    const navMenu = document.getElementById('navMenu');
    const navOverlay = document.getElementById('navOverlay');
    
    // Exit if essential elements don't exist
    if (!menuToggle || !navMenu || !navOverlay) {
      console.log("Mobile nav elements not found");
      return;
    }
    
    // Toggle menu when hamburger is clicked
    menuToggle.addEventListener('click', function(event) {
      event.stopPropagation(); // Prevent event bubbling
      openMenu();
    });
    
    // Close menu when X button is clicked (if it exists)
    if (menuClose) {
      menuClose.addEventListener('click', function(event) {
        event.stopPropagation(); // Prevent event bubbling
        closeMenu();
      });
    }
    
    // Close menu when overlay is clicked
    navOverlay.addEventListener('click', function() {
      closeMenu();
    });
    
    // Close menu when a nav link is clicked
    const navLinks = navMenu.querySelectorAll('a');
    navLinks.forEach(function(link) {
      link.addEventListener('click', function() {
        closeMenu();
      });
    });
    
    // Open menu function with aggressive hamburger hiding
    function openMenu() {
      // First hide the hamburger to prevent overlap issues
      menuToggle.classList.add('hidden');
      
      // Then show the menu and overlay
      setTimeout(function() {
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
      setTimeout(function() {
        menuToggle.classList.remove('hidden');
      }, 300); // Match this to your transition time
    }
    
    // Close menu when window is resized to desktop size
    window.addEventListener('resize', function() {
      if (window.innerWidth > 768 && navMenu.classList.contains('active')) {
        closeMenu();
      }
    });
  } catch (error) {
    console.error("Error in initMobileNav:", error);
  }
}

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