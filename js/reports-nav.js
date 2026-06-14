/**
 * reports-nav.js - Dropdown navigation for Reports menu
 *
 * PURPOSE:
 * Handles the Reports dropdown menu behavior on mobile devices.
 * On desktop, the dropdown opens on hover (CSS only).
 * On mobile, this script adds click-to-toggle functionality.
 */

(function () {
  'use strict';

  /**
   * Initialize dropdown behavior when DOM is ready
   */
  function initDropdown() {
    const dropdown = document.querySelector('.nav-dropdown');
    if (!dropdown) {
      return;
    }

    const trigger = dropdown.querySelector('.dropdown-trigger');
    const menu = dropdown.querySelector('.dropdown-menu');
    const arrow = dropdown.querySelector('.dropdown-arrow');

    if (!trigger || !menu) {
      return;
    }

    // "You are here" highlighting for the Reports section. The nav is shared,
    // build-generated markup with NO server-side active state (navigation.js's
    // setActiveNavLink only matches root pages by filename, and the dropdown's
    // report links are absolute /reports/* paths). So when we're on the reports
    // index or any wrapped report page, mark the Reports trigger active and the
    // matching dropdown entry active here, client-side.
    const currentPath = window.location.pathname;
    if (currentPath.startsWith('/reports/') || currentPath === '/reports') {
      trigger.classList.add('active');
      menu.querySelectorAll('a').forEach(function (link) {
        if (link.getAttribute('href') === currentPath) {
          link.classList.add('active');
        }
      });
    }

    // Mobile: Toggle dropdown on click
    trigger.addEventListener('click', function (e) {
      // Only handle on mobile (check if hamburger menu is visible)
      const menuToggle = document.getElementById('menuToggle');
      const isMobile =
        menuToggle && window.getComputedStyle(menuToggle).display !== 'none';

      if (isMobile) {
        e.preventDefault();
        menu.classList.toggle('open');
        if (arrow) {
          arrow.classList.toggle('open');
        }
      }
    });

    // Close dropdown when clicking outside (mobile)
    document.addEventListener('click', function (e) {
      if (!dropdown.contains(e.target)) {
        menu.classList.remove('open');
        if (arrow) {
          arrow.classList.remove('open');
        }
      }
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDropdown);
  } else {
    initDropdown();
  }
})();
