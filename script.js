// Function to set the active navigation link based on current page
document.addEventListener('DOMContentLoaded', function() {
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
  });