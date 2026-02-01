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
