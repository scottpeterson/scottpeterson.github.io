/**
 * Team Summary Module
 *
 * Aggregates team data from all data sources and displays it in a modal.
 * Used by the command palette's "Search Team" action.
 *
 * Features:
 * - Searches team names across all data sources
 * - Aggregates data from NPI, Season Simulations, Rankings, etc.
 * - Displays a modal with all relevant team statistics
 *
 * Dependencies:
 * - data-loader.js (for fetching JSON data)
 * - command-palette.css (for modal styling)
 */

(function () {
  'use strict';

  // ==========================================================================
  // Configuration
  // ==========================================================================

  /**
   * Data sources to aggregate team information from.
   * Maps data source name to display configuration.
   */
  const DATA_SOURCES = {
    npi: {
      title: 'NPI Rankings',
      fields: [
        { key: 'NPI Rank', label: 'NPI Rank' },
        { key: 'NPI Value', label: 'NPI Value', decimals: 3 },
        { key: 'Bid Type', label: 'Bid Type' },
        { key: 'Qual Wins', label: 'Qualifying Wins' },
        {
          key: 'Qual Losses',
          label: 'Qualifying Losses',
          computed: row => (row['Qual Games'] ?? 0) - (row['Qual Wins'] ?? 0),
        },
        { key: 'QWB', label: 'QWB', decimals: 2 },
        {
          key: 'Lowest Counting Win',
          label: 'Lowest Counting Win',
          decimals: 3,
        },
        { key: 'Rem Games < 50.00 NPI', label: 'Rem Games < 50 NPI' },
      ],
    },
    seasonSimulations: {
      title: 'Season Simulations',
      fields: [
        { key: 'Tourn%', label: 'Tournament %' },
        { key: 'A%', label: 'Auto Bid %' },
        { key: 'ALWYNI%', label: 'At-Large %' },
        { key: 'MedW', label: 'Median Wins' },
        { key: 'MedL', label: 'Median Losses' },
        { key: 'Med-NPI', label: 'Median NPI' },
      ],
    },
    currentSeasonRankings: {
      title: 'Current Season Results Model',
      fields: [
        { key: 'Rank', label: 'Current Rank' },
        { key: 'Value of Results', label: 'Results Value', decimals: 2 },
        { key: 'TOP 50 W', label: 'Top 50 Wins' },
        { key: 'OUT OF TOP 30 L', label: 'Out of Top 30 L' },
        {
          key: 'Overall Wins Massey',
          label: 'Overall Wins Massey',
          decimals: 2,
        },
      ],
    },
    compositeRankings: {
      title: 'Composite Rankings',
      fields: [
        { key: 'OVR_RANK', label: 'Overall Rank' },
        { key: 'MEDIAN', label: 'Median Rank' },
        { key: 'Massey Rank', label: 'Massey' },
        { key: 'Eff Rank', label: 'Efficiency Rank' },
      ],
    },
    preseasonRankings: {
      title: 'Preseason Rankings',
      fields: [
        { key: 'Projected Preseason Rank', label: 'Preseason Rank' },
        { key: 'Returning', label: 'Returning %' },
        { key: 'Safe Loss Threshold', label: 'Safe Losses' },
      ],
    },
    returners: {
      title: 'Returning Minutes',
      fields: [
        { key: 'Surp Gone', label: 'Surprise Gone' },
        { key: 'Exp Gone', label: 'Expected Gone' },
        { key: 'Transfers In', label: 'Transfers In' },
        { key: '5th', label: '5th Year' },
      ],
    },
    publishingTracker: {
      title: 'Publishing Status',
      compact: true, // Use compact grid layout (2 columns, centered)
      fields: [
        { key: 'Schedule Published?', label: 'Schedule' },
        { key: 'Roster Published?', label: 'Roster' },
      ],
    },
    // Conference rankings - loaded for conference rank lookup, but not displayed as a section
    // (no fields means it won't render a section, but data will be cached)
    conferenceRankings: {
      title: 'Conference Rankings',
      fields: [],
    },
  };

  // ==========================================================================
  // State
  // ==========================================================================

  const allTeams = new Set();
  const dataCache = {};
  let isDataLoaded = false;
  let modal = null;

  // ==========================================================================
  // Icons (same as command-palette.js)
  // ==========================================================================

  const ICONS = {
    close:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  };

  // ==========================================================================
  // Data Loading
  // ==========================================================================

  /**
   * Loads all data sources and builds the team list.
   * Uses the existing dataLoader if available.
   */
  async function loadAllData() {
    if (isDataLoaded) {
      return;
    }

    console.log('Team Summary: Loading all data sources...');

    const sources = Object.keys(DATA_SOURCES);

    for (const source of sources) {
      try {
        let data;

        // Use dataLoader if available, otherwise fetch directly
        if (window.dataLoader) {
          data = await window.dataLoader.loadData(source);
        } else {
          const response = await fetch(`data/${source}.json`);
          if (response.ok) {
            data = await response.json();
          } else {
            data = [];
          }
        }

        dataCache[source] = data;

        // Add teams to the set
        if (Array.isArray(data)) {
          data.forEach(row => {
            if (row.Team) {
              allTeams.add(row.Team);
            }
          });
        }
      } catch (error) {
        console.warn(`Team Summary: Could not load ${source}:`, error.message);
        dataCache[source] = [];
      }
    }

    isDataLoaded = true;
    console.log(
      `Team Summary: Loaded ${allTeams.size} teams from ${sources.length} sources`
    );
  }

  /**
   * Searches for teams matching the query.
   * Returns an array of team names sorted by relevance.
   */
  function searchTeams(query) {
    if (isDataLoaded === false) {
      // Trigger async load but return empty for now
      loadAllData();
      return [];
    }

    const normalizedQuery = query.toLowerCase().trim();
    if (normalizedQuery === '') {
      return [];
    }

    const matches = [];

    allTeams.forEach(team => {
      const normalizedTeam = team.toLowerCase();

      // Exact match gets highest priority
      if (normalizedTeam === normalizedQuery) {
        matches.push({ team, score: 100 });
      }
      // Starts with query gets high priority
      else if (normalizedTeam.startsWith(normalizedQuery)) {
        matches.push({ team, score: 75 });
      }
      // Contains query gets medium priority
      else if (normalizedTeam.includes(normalizedQuery)) {
        matches.push({ team, score: 50 });
      }
    });

    // Sort by score (descending) then alphabetically
    matches.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.team.localeCompare(b.team);
    });

    // Return top 10 matches
    return matches.slice(0, 10).map(m => m.team);
  }

  /**
   * Gets the conference ranking for a given conference abbreviation.
   */
  function getConferenceRank(confAbbrev) {
    const confData = dataCache.conferenceRankings || [];
    const confRow = confData.find(row => row.Conf === confAbbrev);
    return confRow ? confRow.Rank : null;
  }

  /**
   * Gets all data for a specific team across all data sources.
   */
  function getTeamData(teamName) {
    const teamData = {
      name: teamName,
      conference: null,
      conferenceRank: null,
      sections: [],
    };

    for (const [source, config] of Object.entries(DATA_SOURCES)) {
      const data = dataCache[source] || [];
      const teamRow = data.find(row => row.Team === teamName);

      if (teamRow) {
        // Extract conference from first available source
        if (teamData.conference === null && teamRow.Conf) {
          teamData.conference = teamRow.Conf;
          teamData.conferenceRank = getConferenceRank(teamRow.Conf);
        }

        const stats = [];
        for (const field of config.fields) {
          // Support computed fields (calculated from other fields in the row)
          const value = field.computed
            ? field.computed(teamRow)
            : teamRow[field.key];
          if (value !== undefined && value !== null && value !== '') {
            stats.push({
              label: field.label,
              value: formatValue(value, field.decimals),
            });
          }
        }

        if (stats.length > 0) {
          teamData.sections.push({
            title: config.title,
            compact: config.compact || false,
            stats,
          });
        }
      }
    }

    return teamData;
  }

  /**
   * Formats a value for display.
   * By default, numeric values are displayed as integers.
   * If decimals is specified, shows that many decimal places.
   */
  function formatValue(value, decimals = null) {
    if (typeof value === 'number') {
      if (decimals !== null && decimals > 0) {
        return value.toFixed(decimals);
      }
      // Default: round to integer
      return Math.round(value).toString();
    }
    return String(value);
  }

  /**
   * Gets the bid status tier for highlighting.
   * Returns: 'green' for A or C-01 through C-21 (tournament bound)
   *          'orange' for C-22 through C-36 (bubble)
   *          'red' for all other values (outside looking in)
   */
  function getBidTier(value) {
    if (value === 'A') {
      return 'green';
    }

    const match = String(value).match(/^C-(\d{2})$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num >= 1 && num <= 21) {
        return 'green';
      }
      if (num >= 22 && num <= 36) {
        return 'orange';
      }
    }

    return 'red';
  }

  // ==========================================================================
  // Modal DOM
  // ==========================================================================

  /**
   * Creates the team summary modal if it doesn't exist.
   */
  function ensureModal() {
    if (modal) {
      return;
    }

    modal = document.createElement('div');
    modal.className = 'team-summary-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-label', 'Team Summary');

    modal.innerHTML = `
      <div class="team-summary-header">
        <h2 class="team-summary-title">Team Summary</h2>
        <button class="team-summary-close" aria-label="Close">${ICONS.close}</button>
      </div>
      <div class="team-summary-content"></div>
    `;

    // Close button handler
    modal
      .querySelector('.team-summary-close')
      .addEventListener('click', hideModal);

    // Click outside to close
    modal.addEventListener('click', e => {
      if (e.target === modal) {
        hideModal();
      }
    });

    document.body.appendChild(modal);
  }

  /**
   * Shows the modal with loading state.
   */
  function showModal() {
    ensureModal();

    // Reuse the command palette overlay if available, or create one
    let overlay = document.querySelector('.command-palette-overlay');
    if (overlay === null) {
      overlay = document.createElement('div');
      overlay.className = 'command-palette-overlay';
      document.body.appendChild(overlay);
    }

    overlay.classList.add('active');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  /**
   * Hides the modal.
   */
  function hideModal() {
    if (modal === null) {
      return;
    }

    const overlay = document.querySelector('.command-palette-overlay');
    if (overlay) {
      overlay.classList.remove('active');
    }

    modal.classList.remove('active');
    document.body.style.overflow = '';
  }

  /**
   * Renders loading state in the modal.
   */
  function renderLoading() {
    const content = modal.querySelector('.team-summary-content');
    content.innerHTML = `
      <div class="team-summary-loading">
        <div class="team-summary-loading-spinner"></div>
        <span>Loading team data...</span>
      </div>
    `;
  }

  /**
   * Renders the team data in the modal.
   */
  function renderTeamData(teamData) {
    const title = modal.querySelector('.team-summary-title');
    const content = modal.querySelector('.team-summary-content');

    // Update title
    // Use square brackets for conference since some team names contain parentheses
    // Include conference ranking if available, with explicit label for clarity
    let titleText = teamData.name;
    if (teamData.conference) {
      if (teamData.conferenceRank) {
        titleText += ` [${teamData.conference} - Conf Rank #${teamData.conferenceRank}]`;
      } else {
        titleText += ` [${teamData.conference}]`;
      }
    }
    title.textContent = titleText;

    // Check if we have any data
    if (teamData.sections.length === 0) {
      content.innerHTML = `
        <div class="team-summary-not-found">
          <div class="team-summary-not-found-icon">📊</div>
          <p>No data found for ${teamData.name}</p>
        </div>
      `;
      return;
    }

    // Render sections
    let html = '';
    for (const section of teamData.sections) {
      const gridClass = section.compact
        ? 'team-summary-grid compact'
        : 'team-summary-grid';
      html += `
        <div class="team-summary-section">
          <h3 class="team-summary-section-title">${section.title}</h3>
          <div class="${gridClass}">
            ${section.stats
              .map(stat => {
                // Check if this is a Bid Type cell - apply tier-based highlighting
                let statClass = 'team-summary-stat';
                if (stat.label === 'Bid Type') {
                  const tier = getBidTier(stat.value);
                  statClass = `team-summary-stat bid-highlight bid-${tier}`;
                }
                return `
              <div class="${statClass}">
                <div class="team-summary-stat-label">${stat.label}</div>
                <div class="team-summary-stat-value">${stat.value}</div>
              </div>
            `;
              })
              .join('')}
          </div>
        </div>
      `;
    }

    content.innerHTML = html;
  }

  // ==========================================================================
  // Public API
  // ==========================================================================

  /**
   * Shows the team summary modal for a specific team.
   */
  async function showSummary(teamName) {
    showModal();
    renderLoading();

    // Ensure data is loaded
    await loadAllData();

    // Get and render team data
    const teamData = getTeamData(teamName);
    renderTeamData(teamData);

    // Easter egg: launch confetti for any team (can add team-specific logic later)
    if (window.confetti) {
      window.confetti.launch();
    }
  }

  // ==========================================================================
  // Initialization
  // ==========================================================================

  /**
   * Initialize the module - preload data in the background.
   */
  function init() {
    // Preload data after a short delay to not block page load
    setTimeout(() => {
      loadAllData();
    }, 1000);

    // Escape key to close modal and return to command palette
    // Use capture phase (true) to intercept before command palette's handler
    document.addEventListener(
      'keydown',
      e => {
        if (e.key === 'Escape' && modal && modal.classList.contains('active')) {
          e.preventDefault();
          e.stopImmediatePropagation(); // Stop all other handlers from running
          hideModal();
          // Reopen command palette after closing team summary
          if (window.commandPalette) {
            window.commandPalette.open();
          }
        }
      },
      true
    ); // Capture phase - runs before bubble phase handlers

    console.log('Team Summary: initialized');
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose API
  window.teamSummary = {
    searchTeams,
    showSummary,
    hideModal,
  };
})();
