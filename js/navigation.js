// navigation.js - Mobile navigation functionality

// Assembles obfuscated email addresses on page load to prevent scraping.
// Markup: an element with class "email-protect" and the attributes
// data-user="name" and data-domain="example.com".
// The email is never in the HTML source as a complete string, so simple
// scrapers cannot read it.
function initEmailProtection() {
  try {
    const emailElements = document.querySelectorAll('.email-protect');
    emailElements.forEach(function (el) {
      const user = el.dataset.user;
      const domain = el.dataset.domain;
      if (user && domain) {
        el.textContent = user + '@' + domain;
      }
    });
  } catch (error) {
    console.error('Error in initEmailProtection:', error);
  }
}

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

    // Close the menu when a user clicks a nav link. The Reports dropdown
    // trigger is excluded. On mobile, reports-nav.js turns that tap into
    // "expand the submenu inside the drawer". Closing the drawer here would
    // hide the submenu the moment it opened. The submenu's own links still
    // close it.
    const navLinks = navMenu.querySelectorAll('a:not(.dropdown-trigger)');
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

      // Delay the hamburger display until the menu's exit
      // transition ends
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

// Keep in-page anchor jumps (for example the home page's "Explore the data"
// button -> #explore) clear of the sticky nav. The nav wraps to a variable number
// of rows, depending on viewport width and zoom. So a fixed CSS offset can't be
// right at every size. Measure the real nav height and set it as
// scroll-padding-top on the scroll container. The padding moves where #anchor
// targets stop, so they never hide behind the nav. The code measures again on
// resize.
function syncNavScrollOffset() {
  try {
    const nav = document.querySelector('.main-nav');
    if (!nav) {
      return;
    }
    const apply = function () {
      const offset = nav.offsetHeight + 12; // small breathing gap below the nav
      document.documentElement.style.scrollPaddingTop = offset + 'px';
    };
    apply();
    window.addEventListener('resize', apply);
  } catch (error) {
    console.error('Error in syncNavScrollOffset:', error);
  }
}

// Home page only: the nav is transparent over the hero image, so the photo fills
// the viewport on arrival. Once the hero scrolls past, the nav changes to the
// solid chrome. Otherwise the light nav text would vanish over the white content
// below.
//
// An IntersectionObserver on the hero, offset by the nav's height, is cheaper
// than a scroll handler and does not stutter. The hero element exists only on
// the home page. So the function does nothing on other pages and is safe to call
// on every page.
function initHomeNavScrim() {
  try {
    const hero = document.querySelector('.home-hero');
    const nav = document.querySelector('.main-nav');
    if (!hero || !nav) {
      return; // Not the home page (or markup missing) — leave the solid nav.
    }

    // Fallback for the (rare) browser without IntersectionObserver: keep the
    // nav solid so text is always legible.
    if (!('IntersectionObserver' in window)) {
      document.body.classList.add('nav-solid');
      return;
    }

    const applyObserver = function () {
      const navHeight = nav.offsetHeight;
      const observer = new IntersectionObserver(
        function (entries) {
          // Solid once the hero is fully scrolled above the nav line.
          document.body.classList.toggle(
            'nav-solid',
            !entries[0].isIntersecting
          );
        },
        { rootMargin: '-' + navHeight + 'px 0px 0px 0px', threshold: 0 }
      );
      observer.observe(hero);
      return observer;
    };

    let observer = applyObserver();

    // The nav height changes when it wraps to more or fewer rows across
    // breakpoints. That change moves the trigger line. So rebuild the observer on
    // resize to keep the switch point accurate.
    let resizeTimer = null;
    window.addEventListener('resize', function () {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(function () {
        if (observer) {
          observer.disconnect();
        }
        observer = applyObserver();
      }, 150);
    });
  } catch (error) {
    console.error('Error in initHomeNavScrim:', error);
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

// Expose the page-init helpers on window. The other modules also publish their
// globals on window (window.dataLoader, window.tableController). main.js calls
// these from its DOMContentLoaded handler. The explicit exports make the
// cross-file contract greppable, and lint does not report them as unused.
window.initEmailProtection = initEmailProtection;
window.initMobileNav = initMobileNav;
window.syncNavScrollOffset = syncNavScrollOffset;
window.initHomeNavScrim = initHomeNavScrim;
window.setActiveNavLink = setActiveNavLink;
