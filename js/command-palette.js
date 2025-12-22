/**
 * Command Palette (CMD+K) - Navigation and Team Search
 *
 * A Superhuman-inspired command palette for quick navigation and team search.
 * Feature-flagged via URL parameter: ?cmdK=true
 *
 * Features:
 * - CMD+K (Mac) or Ctrl+K (Windows/Linux) to open
 * - Arrow keys to navigate, Enter to select, Escape to close
 * - Quick navigation to any page
 * - "Search Team" action to view aggregated team data
 *
 * Dependencies:
 * - team-summary.js (for team data aggregation)
 */

(function () {
  'use strict';

  // ==========================================================================
  // Feature Flag Check
  // ==========================================================================

  /**
   * Command palette is now always enabled.
   * Previously was gated by URL parameter ?cmdK=true
   */
  function isCommandPaletteEnabled() {
    return true;
  }

  console.log('Command Palette: enabled');

  // ==========================================================================
  // Configuration
  // ==========================================================================

  /**
   * Navigation items available in the command palette.
   * These match the site's navigation structure.
   */
  const NAVIGATION_ITEMS = [
    { title: 'Home', href: '/', icon: 'home' },
    {
      title: 'NPI',
      href: 'npi.html',
      icon: 'target',
      description: 'NCAA Power Index rankings',
    },
    {
      title: 'Season Simulations',
      href: 'season_simulations.html',
      icon: 'dice',
      description: 'Tournament probability projections',
    },
    {
      title: 'Current Season Rankings',
      href: 'current_season_rankings.html',
      icon: 'calendar',
      description: 'Rankings based on this season',
    },
    {
      title: 'Conference Rankings',
      href: 'conference_rankings.html',
      icon: 'trophy',
      description: 'Conference performance rankings',
    },
    {
      title: 'Composite Rankings',
      href: 'composite_rankings.html',
      icon: 'layers',
      description: 'Combined ranking systems',
    },
    {
      title: 'Preseason Rankings',
      href: 'preseason_rankings.html',
      icon: 'sun',
      description: '25-26 preseason projections',
    },
    {
      title: 'Returning & Non-Returning',
      href: 'returners.html',
      icon: 'refresh',
      description: 'Player retention data',
    },
    {
      title: 'Publishing Tracker',
      href: 'publishing_tracker.html',
      icon: 'clipboard',
      description: 'Schedule/roster publishing status',
    },
    {
      title: 'Premium',
      href: 'premium.html',
      icon: 'star',
      description: 'Weekly team reports',
      shortcut: 'p',
    },
    {
      title: 'Contact',
      href: 'contact.html',
      icon: 'mail',
      description: 'Get in touch',
      shortcut: 'c',
    },
  ];

  /**
   * Action items (non-navigation) available in the command palette.
   */
  const ACTION_ITEMS = [
    {
      title: 'Search Team',
      icon: 'search',
      action: 'searchTeam',
      description: 'View team summary across all pages',
    },
  ];

  // ==========================================================================
  // State
  // ==========================================================================

  let isOpen = false;
  let selectedIndex = 0;
  let filteredItems = [];
  let mode = 'default'; // 'default' or 'teamSearch'

  // DOM element references (populated in init)
  let overlay = null;
  let palette = null;
  let results = null;

  // Pre-computed default items list (actions first, then navigation)
  const DEFAULT_ITEMS = [...ACTION_ITEMS, ...NAVIGATION_ITEMS];

  // Pre-rendered default HTML (computed once at init for instant open)
  let defaultResultsHTML = '';

  // ==========================================================================
  // Icon SVGs
  // ==========================================================================

  const ICONS = {
    search:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>',
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>',
    chart:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
    ranking:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>',
    users:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    check:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>',
    navigate:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9,18 15,12 9,6"/></svg>',
    close:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    // NPI - target/crosshair for precision rankings
    target:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
    // Season Simulations - dice for probability
    dice: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8" cy="8" r="1.5" fill="currentColor"/><circle cx="16" cy="8" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="8" cy="16" r="1.5" fill="currentColor"/><circle cx="16" cy="16" r="1.5" fill="currentColor"/></svg>',
    // Current Season - calendar for this season
    calendar:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
    // Conference Rankings - trophy for conference competition
    trophy:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h2"/><path d="M18 9h2a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-2"/><path d="M4 22h16"/><path d="M10 22V8a4 4 0 0 0-4-4H6a2 2 0 0 0-2 2v0c0 1.1.9 2 2 2h2"/><path d="M14 22V8a4 4 0 0 1 4-4h0a2 2 0 0 1 2 2v0c0 1.1-.9 2-2 2h-2"/><path d="M12 17a5 5 0 0 0 5-5V8H7v4a5 5 0 0 0 5 5z"/></svg>',
    // Composite Rankings - layers for combined data
    layers:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12,2 2,7 12,12 22,7"/><polyline points="2,17 12,22 22,17"/><polyline points="2,12 12,17 22,12"/></svg>',
    // Preseason Rankings - crystal ball / sun for predictions
    sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>',
    // Returning - refresh/rotate for players coming back
    refresh:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23,4 23,10 17,10"/><polyline points="1,20 1,14 7,14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>',
    // Publishing Tracker - clipboard for tracking
    clipboard:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>',
  };

  // ==========================================================================
  // DOM Creation
  // ==========================================================================

  /**
   * Creates the command palette HTML structure and appends it to the body.
   */
  function createPaletteDOM() {
    // Create overlay
    overlay = document.createElement('div');
    overlay.className = 'command-palette-overlay';
    overlay.setAttribute('aria-hidden', 'true');

    // Create palette container
    palette = document.createElement('div');
    palette.className = 'command-palette';
    palette.setAttribute('role', 'dialog');
    palette.setAttribute('aria-label', 'Command Palette');

    palette.innerHTML = `
      <div class="command-palette-header">
        <span class="command-palette-header-text">Quick Actions</span>
        <div class="command-palette-shortcut">
          <kbd>esc</kbd>
        </div>
      </div>
      <div class="command-palette-results" role="listbox"></div>
    `;

    // Get reference to results container
    results = palette.querySelector('.command-palette-results');

    // Append to body
    document.body.appendChild(overlay);
    document.body.appendChild(palette);
  }

  // ==========================================================================
  // Rendering
  // ==========================================================================

  /**
   * Renders the current filtered items in the results container.
   */
  function renderResults() {
    if (mode === 'teamSearch') {
      renderTeamSearchMode();
      return;
    }

    if (filteredItems.length === 0) {
      results.innerHTML =
        '<div class="command-palette-empty">No results found</div>';
      return;
    }

    // Group items by type
    const navItems = filteredItems.filter(item => item.href);
    const actionItems = filteredItems.filter(item => item.action);

    let html = '';

    // Actions section FIRST (Search Team at the top)
    if (actionItems.length > 0) {
      html += '<div class="command-palette-section">Actions</div>';
      actionItems.forEach((item, i) => {
        const globalIndex = filteredItems.indexOf(item);
        html += renderItem(item, globalIndex);
      });
    }

    // Navigation section
    if (navItems.length > 0) {
      html += '<div class="command-palette-section">Navigation</div>';
      navItems.forEach((item, i) => {
        const globalIndex = filteredItems.indexOf(item);
        html += renderItem(item, globalIndex);
      });
    }

    results.innerHTML = html;
    attachResultsHandlers();
  }

  /**
   * Gets the keyboard shortcut for an item based on its index.
   * Returns 1-9 for indices 0-8, and 0 for index 9.
   */
  function getShortcutKey(index) {
    if (index < 9) {
      return String(index + 1);
    } // 1-9
    if (index === 9) {
      return '0';
    } // 0 for 10th item
    return null; // No shortcut for items beyond 10
  }

  /**
   * Renders a single item in the results list.
   * @param {Object} item - The item to render
   * @param {number} index - The item's index
   * @param {boolean} showShortcut - Whether to show keyboard shortcuts (default: true)
   */
  function renderItem(item, index, showShortcut = true) {
    const isSelected = index === selectedIndex;
    const icon = ICONS[item.icon] || ICONS.navigate;
    const description = item.description
      ? `<div class="command-palette-item-description">${item.description}</div>`
      : '';
    // Use custom shortcut if defined, otherwise use numeric shortcut
    // Only show shortcuts if showShortcut is true
    const shortcutKey = showShortcut
      ? item.shortcut || getShortcutKey(index)
      : null;
    const shortcutHtml = shortcutKey
      ? `<span class="command-palette-item-shortcut"><kbd>${shortcutKey}</kbd></span>`
      : '';

    return `
      <div
        class="command-palette-item${isSelected ? ' selected' : ''}"
        role="option"
        aria-selected="${isSelected}"
        data-index="${index}"
        tabindex="-1"
      >
        <span class="command-palette-item-icon">${icon}</span>
        <div class="command-palette-item-content">
          <div class="command-palette-item-title">${item.title}</div>
          ${description}
        </div>
        ${shortcutHtml}
      </div>
    `;
  }

  /**
   * Renders the team search mode UI with its own search input.
   * Only re-renders the results list, not the input (to preserve cursor position).
   */
  function renderTeamSearchMode() {
    const existingInput = palette.querySelector('.team-search-input');
    const query = existingInput ? existingInput.value.trim() : '';

    // If input doesn't exist yet, create the full structure
    if (!existingInput) {
      const html = `
        <div class="command-palette-team-search-header">
          <span class="command-palette-icon">${ICONS.search}</span>
          <input
            type="text"
            class="team-search-input"
            placeholder="Enter team name..."
            autocomplete="off"
            spellcheck="false"
          />
        </div>
        <div class="team-search-results"></div>
      `;
      results.innerHTML = html;
      setupTeamSearchInput();
    }

    // Get the results container (separate from input)
    const resultsContainer = palette.querySelector('.team-search-results');
    if (!resultsContainer) {
      return;
    }

    if (query.length === 0) {
      resultsContainer.innerHTML =
        '<div class="command-palette-empty">Type a team name to search...</div>';
      filteredItems = [];
      return;
    }

    // Get matching teams from team-summary module
    const teams = window.teamSummary
      ? window.teamSummary.searchTeams(query)
      : [];

    if (teams.length === 0) {
      resultsContainer.innerHTML = `<div class="command-palette-empty">No teams found matching "${query}"</div>`;
      filteredItems = [];
      return;
    }

    filteredItems = teams.map(team => ({
      title: team,
      icon: 'users',
      action: 'showTeamSummary',
      teamName: team,
    }));

    // Reset selection when results change
    selectedIndex = 0;

    let html = '<div class="command-palette-section">Teams</div>';
    filteredItems.forEach((item, index) => {
      html += renderItem(item, index, false); // Hide shortcuts in team search results
    });

    resultsContainer.innerHTML = html;

    // Attach handlers to the new result items
    resultsContainer
      .querySelectorAll('.command-palette-item')
      .forEach((el, i) => {
        el.addEventListener('click', () => selectItem(i));
        el.addEventListener('mouseenter', () => setSelectedIndex(i));
      });
  }

  /**
   * Sets up the team search input event handlers.
   */
  function setupTeamSearchInput() {
    const input = palette.querySelector('.team-search-input');
    if (!input) {
      return;
    }

    // Focus the input
    setTimeout(() => input.focus(), 0);

    // Handle input changes - just update results, not the whole thing
    input.addEventListener('input', () => {
      renderTeamSearchMode();
    });

    // Handle keyboard navigation within team search
    input.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        moveSelection(1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        moveSelection(-1);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        selectItem();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation(); // Prevent document handler from also closing the palette
        exitTeamSearchMode();
      } else if (e.key === 'Backspace' && input.value === '') {
        e.preventDefault();
        exitTeamSearchMode();
      }
    });
  }

  // ==========================================================================
  // Filtering
  // ==========================================================================

  /**
   * Shows the default items list.
   * Optimized: uses pre-computed defaults for instant open.
   */
  function showDefaultItems() {
    if (mode === 'teamSearch') {
      renderResults();
      return;
    }

    // Reset selection
    selectedIndex = 0;
    filteredItems = DEFAULT_ITEMS;

    // Use pre-rendered HTML for speed
    if (defaultResultsHTML) {
      results.innerHTML = defaultResultsHTML;
      attachResultsHandlers();
      return;
    }

    renderResults();
  }

  /**
   * Attaches click/hover handlers to result items.
   * Separated for reuse with pre-rendered HTML.
   */
  function attachResultsHandlers() {
    results.querySelectorAll('.command-palette-item').forEach((el, i) => {
      el.addEventListener('click', () => selectItem(i));
      el.addEventListener('mouseenter', () => setSelectedIndex(i));
    });
  }

  // ==========================================================================
  // Selection & Navigation
  // ==========================================================================

  /**
   * Sets the selected index and updates the UI.
   */
  function setSelectedIndex(index) {
    selectedIndex = index;

    // Update selected state in DOM
    results.querySelectorAll('.command-palette-item').forEach((el, i) => {
      el.classList.toggle('selected', i === index);
      el.setAttribute('aria-selected', i === index);
    });

    // Scroll selected item into view
    const selectedEl = results.querySelector('.command-palette-item.selected');
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: 'nearest' });
    }
  }

  /**
   * Moves selection up or down.
   */
  function moveSelection(direction) {
    const newIndex = selectedIndex + direction;
    if (newIndex >= 0 && newIndex < filteredItems.length) {
      setSelectedIndex(newIndex);
    }
  }

  /**
   * Selects the currently highlighted item.
   */
  function selectItem(index = selectedIndex) {
    const item = filteredItems[index];
    if (item === undefined) {
      return;
    }

    if (item.href) {
      // Navigation item - go to the page
      window.location.href = item.href;
    } else if (item.action === 'searchTeam') {
      // Switch to team search mode
      enterTeamSearchMode();
    } else if (item.action === 'showTeamSummary') {
      // Show team summary modal
      closePalette();
      if (window.teamSummary) {
        window.teamSummary.showSummary(item.teamName);
      }
    }
  }

  /**
   * Enters team search mode.
   * Shows the team search input in the results area.
   */
  function enterTeamSearchMode() {
    mode = 'teamSearch';
    filteredItems = [];
    selectedIndex = 0;
    renderResults();
  }

  /**
   * Exits team search mode and returns to default.
   */
  function exitTeamSearchMode() {
    mode = 'default';
    showDefaultItems();
  }

  // ==========================================================================
  // Open / Close
  // ==========================================================================

  /**
   * Opens the command palette.
   * Optimized for speed - target <50ms perceived latency.
   */
  function openPalette() {
    if (isOpen) {
      return;
    }
    isOpen = true;

    // Track CMD+K opens in GoatCounter
    if (window.goatcounter && window.goatcounter.count) {
      window.goatcounter.count({
        path: 'cmd-k-opened',
        event: true,
      });
    }

    // Reset state
    mode = 'default';

    // Show palette immediately - do this FIRST for perceived speed
    overlay.classList.add('active');
    palette.classList.add('active');

    // Prevent body scroll
    document.body.style.overflow = 'hidden';

    // Show default items
    showDefaultItems();
  }

  /**
   * Closes the command palette.
   * Optimized for speed - target <50ms perceived latency.
   */
  function closePalette() {
    if (isOpen === false) {
      return;
    }
    isOpen = false;

    // Hide palette immediately
    overlay.classList.remove('active');
    palette.classList.remove('active');

    // Reset mode
    mode = 'default';

    // Restore body scroll
    document.body.style.overflow = '';
  }

  /**
   * Toggles the command palette open/closed.
   */
  function togglePalette() {
    if (isOpen) {
      closePalette();
    } else {
      openPalette();
    }
  }

  // ==========================================================================
  // Event Handlers
  // ==========================================================================

  /**
   * Handles keyboard events for navigation and shortcuts.
   */
  function handleKeyDown(e) {
    // CMD/Ctrl + K to toggle palette
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      togglePalette();
      return;
    }

    // Only handle other keys when palette is open
    if (isOpen === false) {
      return;
    }

    // Check if team search input is focused - let it handle its own keys
    const teamSearchInput = palette.querySelector('.team-search-input');
    if (teamSearchInput && document.activeElement === teamSearchInput) {
      // Team search input handles its own keyboard events
      return;
    }

    switch (e.key) {
      case 'Escape':
        // Check if team summary modal is open - let it handle the escape first
        if (window.teamSummary) {
          const teamModal = document.querySelector(
            '.team-summary-modal.active'
          );
          if (teamModal) {
            // Team summary will handle its own escape key via stopPropagation
            return;
          }
        }
        e.preventDefault();
        if (mode === 'teamSearch') {
          exitTeamSearchMode();
        } else {
          closePalette();
        }
        break;

      case 'ArrowDown':
        e.preventDefault();
        moveSelection(1);
        break;

      case 'ArrowUp':
        e.preventDefault();
        moveSelection(-1);
        break;

      case 'Enter':
        e.preventDefault();
        selectItem();
        break;

      default:
        // Handle number keys 1-9 and 0 as shortcuts (only in default mode)
        if (mode === 'default' && /^[0-9]$/.test(e.key)) {
          const keyNum = parseInt(e.key, 10);
          // 1-9 map to indices 0-8, 0 maps to index 9
          const targetIndex = keyNum === 0 ? 9 : keyNum - 1;

          if (targetIndex < filteredItems.length) {
            e.preventDefault();
            // Add flash animation before selecting
            const itemEl = results.querySelector(
              `[data-index="${targetIndex}"]`
            );
            if (itemEl) {
              itemEl.classList.add('flash');
              // Small delay to let the flash animation be visible before navigation
              setTimeout(() => {
                selectItem(targetIndex);
              }, 150);
            } else {
              selectItem(targetIndex);
            }
          }
        }
        // Handle letter shortcuts (p for Premium, c for Contact, etc.)
        else if (mode === 'default' && /^[a-z]$/.test(e.key)) {
          const targetIndex = filteredItems.findIndex(
            item => item.shortcut === e.key
          );
          if (targetIndex !== -1) {
            e.preventDefault();
            // Add flash animation before selecting
            const itemEl = results.querySelector(
              `[data-index="${targetIndex}"]`
            );
            if (itemEl) {
              itemEl.classList.add('flash');
              setTimeout(() => {
                selectItem(targetIndex);
              }, 150);
            } else {
              selectItem(targetIndex);
            }
          }
        }
        break;
    }
  }

  /**
   * Handles clicks on the overlay to close the palette.
   */
  function handleOverlayClick() {
    closePalette();
  }

  // ==========================================================================
  // Initialization
  // ==========================================================================

  /**
   * Pre-renders the default results HTML for instant open.
   */
  function preRenderDefaults() {
    filteredItems = DEFAULT_ITEMS;
    selectedIndex = 0;

    // Group items by type
    const navItems = filteredItems.filter(item => item.href);
    const actionItems = filteredItems.filter(item => item.action);

    let html = '';

    // Actions section FIRST (Search Team at the top)
    if (actionItems.length > 0) {
      html += '<div class="command-palette-section">Actions</div>';
      actionItems.forEach(item => {
        const globalIndex = filteredItems.indexOf(item);
        html += renderItem(item, globalIndex);
      });
    }

    // Navigation section
    if (navItems.length > 0) {
      html += '<div class="command-palette-section">Navigation</div>';
      navItems.forEach(item => {
        const globalIndex = filteredItems.indexOf(item);
        html += renderItem(item, globalIndex);
      });
    }

    defaultResultsHTML = html;
  }

  function init() {
    // Create DOM elements
    createPaletteDOM();

    // Pre-render default results for instant open
    preRenderDefaults();

    // Attach event listeners
    document.addEventListener('keydown', handleKeyDown);
    overlay.addEventListener('click', handleOverlayClick);

    console.log('Command Palette: initialized (press CMD+K or Ctrl+K to open)');
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose API for external use (e.g., for team-summary.js to close palette)
  window.commandPalette = {
    open: openPalette,
    close: closePalette,
    toggle: togglePalette,
    isEnabled: isCommandPaletteEnabled,
  };
})();
