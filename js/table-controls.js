// table-controls.js - Search, filter, and sorting functionality

class TableController {
  constructor() {
    this.table = null;
    this.searchInput = null;
    this.conferenceFilter = null;
    this.currentData = [];
  }

  // Initialize table controls
  init() {
    try {
      // Get DOM elements
      this.searchInput = document.getElementById('teamSearch');
      this.conferenceFilter = document.getElementById('conferenceFilter');
      this.table = document.getElementById('statsTable');

      // Table is required, but search/filter elements are optional
      if (!this.table) {
        console.log('Stats table not found on this page');
        return false;
      }

      // Add event listeners for search and filter if they exist
      if (this.searchInput) {
        this.searchInput.addEventListener('input', () => this.filterTable());
      }

      if (this.conferenceFilter) {
        this.conferenceFilter.addEventListener('change', () =>
          this.filterTable()
        );
      }

      // Initialize table sorting
      this.initTableSorting();

      return true;
    } catch (error) {
      console.error('Error in TableController.init:', error);
      return false;
    }
  }

  // Load and display data
  async loadData(dataSource) {
    try {
      this.currentData = await window.dataLoader.loadData(dataSource);

      // Get page config for column mappings
      const pageConfig = window.dataLoader.getCurrentPageConfig();
      this.columnMappings = pageConfig ? pageConfig.columnMappings : {};

      if (this.currentData && this.currentData.length > 0) {
        this.populateTable(this.currentData);
        this.populateConferenceFilter();
        this.updateProgressIndicators();
      } else {
        // Fallback: show a message if no data loaded
        this.showDataLoadingError(dataSource);
      }
    } catch (error) {
      console.error('Error loading table data:', error);
      this.showDataLoadingError(dataSource);
    }
  }

  // Show error message when data fails to load
  showDataLoadingError(dataSource) {
    const tbody = this.table.querySelector('tbody');
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="100%" style="text-align: center; padding: 20px; color: #666;">
            Unable to load data for ${dataSource}. Please ensure you're viewing this page through a web server.
            <br><small>Try running: <code>npm start</code> or <code>python -m http.server</code></small>
          </td>
        </tr>
      `;
    }
  }

  // Populate table with data
  populateTable(data) {
    const tbody = this.table.querySelector('tbody');
    if (!tbody) {
      console.error('No tbody found in table');
      return;
    }

    tbody.innerHTML = '';

    // Get column names from table headers
    const headers = Array.from(this.table.querySelectorAll('th'));

    data.forEach((row, _index) => {
      const tr = document.createElement('tr');

      headers.forEach((header, _headerIndex) => {
        const td = document.createElement('td');
        const headerText = header.textContent;

        // Map header text to data property
        let value = this.getValueFromRow(row, headerText);

        // Apply number formatting for specific columns
        value = this.formatValue(value, headerText);

        td.textContent = value !== null && value !== undefined ? value : '';
        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    });

    // Apply initial alternating row colors
    this.reapplyRowColors();
  }

  // Map header text to data property
  getValueFromRow(row, headerText) {
    // Clean header text by removing sorting arrows and extra spaces
    const cleanHeaderText = headerText.replace(/[↕↑↓]/g, '').trim();

    // Priority 1: Use explicit column mapping if defined (use clean header text)
    if (this.columnMappings && this.columnMappings[cleanHeaderText]) {
      const mappedKey = this.columnMappings[cleanHeaderText];
      if (Object.prototype.hasOwnProperty.call(row, mappedKey)) {
        const value = row[mappedKey];
        return value !== null && value !== undefined ? value : '';
      }
    }

    // Priority 1.5: Try exact header match in mappings (handles special characters)
    if (this.columnMappings) {
      for (const [configHeader, jsonKey] of Object.entries(
        this.columnMappings
      )) {
        if (configHeader === cleanHeaderText) {
          const value = row[jsonKey];
          return value !== undefined ? value : '';
        }
      }
    }

    const normalizedHeader = cleanHeaderText.toLowerCase().trim();

    // Priority 2: Direct property mapping for common cases
    const directMapping = {
      team: row.team,
      conference: row.conference,
      conf: row.conf,
      adjem: row.adjEm,
      rank: row.rank,
      teams: row.teams,
      'avg rating': row.avgRating,
      'top team': row.topTeam,
      'win %': row['Win%'],
      'win%': row['Win%'], // Handle without space
      'w-l': row.record,
      sos: row.sos,
      ppg: row.ppg,
      'fg%': row.fgPct,
      '3p%': row.threePct,
      'ft%': row.ftPct,
      oppg: row.oppg,
      'def fg%': row.defFgPct,
      steals: row.steals,
      blocks: row.blocks,
      rpg: row.rpg,
      apg: row.apg,
      player: row.player,
      'conf w-l': row.confRecord,
      streak: row.streak,
      2023: row.year2023,
      2022: row.year2022,
      2021: row.year2021,
      trend: row.trend,
      seed: row.seed,
      result: row.result,
      coach: row.coach,
      years: row.years,
      momentum: row.momentum,
      'last 10': row.last10,
      description: row.description,
      status: row.status,
      feature: row.feature,
    };

    if (directMapping[normalizedHeader] !== undefined) {
      return directMapping[normalizedHeader];
    }

    // Priority 3: Smart fallback methods
    const rowKeys = Object.keys(row);

    // Method 1: Exact match (case insensitive)
    for (const key of rowKeys) {
      if (key.toLowerCase() === normalizedHeader) {
        return row[key];
      }
    }

    // Method 2: Convert header to camelCase and try to match
    const camelCaseHeader = this.toCamelCase(normalizedHeader);
    if (row[camelCaseHeader] !== undefined) {
      return row[camelCaseHeader];
    }

    // Method 3: Fuzzy matching - remove spaces/symbols and compare
    const cleanHeader = normalizedHeader.replace(/[^a-z0-9]/g, '');
    for (const key of rowKeys) {
      const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (cleanKey === cleanHeader) {
        return row[key];
      }
    }

    // Method 4: Partial matching
    for (const key of rowKeys) {
      const cleanKey = key.toLowerCase();
      if (
        cleanKey.includes(normalizedHeader) ||
        normalizedHeader.includes(cleanKey)
      ) {
        return row[key];
      }
    }

    return '';
  }

  // Convert string to camelCase
  toCamelCase(str) {
    return str
      .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
        return index === 0 ? word.toLowerCase() : word.toUpperCase();
      })
      .replace(/\s+/g, '')
      .replace(/[^a-zA-Z0-9]/g, '');
  }

  // Format values based on column type
  formatValue(value, headerText) {
    // Handle null/undefined/empty values but preserve zero
    if (value === null || value === undefined || value === '') {
      return '';
    }

    // Clean header text by removing sort indicators and other symbols
    const cleanHeader = headerText
      .replace(/[↕↑↓]/g, '')
      .toLowerCase()
      .trim();

    // Handle percentage values (Returning column) - do this first
    if (cleanHeader === 'returning') {
      // If it's already a percentage string (e.g., "74.70%"), extract and reformat
      if (typeof value === 'string' && value.includes('%')) {
        const numericValue = parseFloat(value.replace('%', ''));
        if (!isNaN(numericValue)) {
          return numericValue.toFixed(2) + '%';
        }
      }
      // If it's a decimal between 0 and 1, convert to percentage
      else if (typeof value === 'number' && value >= 0 && value <= 1) {
        return (value * 100).toFixed(2) + '%';
      }
      // If it's a number > 1, assume it's already a percentage value
      else {
        const numericValue = parseFloat(value);
        if (!isNaN(numericValue)) {
          return numericValue.toFixed(2) + '%';
        }
      }
    }

    // Handle decimal formatting for numeric columns
    const numericValue = parseFloat(value);
    if (!isNaN(numericValue)) {
      // 3 decimal places for Win%, SOS
      if (
        cleanHeader === 'win%' ||
        cleanHeader === 'sos' ||
        cleanHeader === 'npi'
      ) {
        return numericValue.toFixed(3);
      }
      // 2 decimal places for Height
      else if (cleanHeader === 'height') {
        return numericValue.toFixed(2);
      }
      // Integer formatting with thousand separators for returners columns
      else if (
        cleanHeader === 'surp gone' ||
        cleanHeader === 'exp gone' ||
        cleanHeader === 'transfers in' ||
        cleanHeader === '5th'
      ) {
        // If the original value is already a formatted string, return it as-is
        if (typeof value === 'string' && value.includes(',')) {
          return value;
        }
        return Math.round(numericValue).toLocaleString();
      }
      // 3 decimal places for NPI columns
      else if (
        cleanHeader === 'npi value' ||
        cleanHeader === 'value old' ||
        cleanHeader === 'value diff' ||
        cleanHeader === 'lowest counting win' ||
        cleanHeader === 'next game win npi' ||
        cleanHeader === 'potential increase' ||
        cleanHeader === 'next game loss npi'
      ) {
        return numericValue.toFixed(3);
      }
      // 2 decimal places for Current Season Rankings columns
      else if (
        cleanHeader === 'value of results' ||
        cleanHeader === 'overall wins massey' ||
        cleanHeader === 'eff' ||
        cleanHeader === 'underlying' ||
        cleanHeader === 'stat' ||
        cleanHeader === 'stdev'
      ) {
        return numericValue.toFixed(2);
      }
    }

    // Return original value if no formatting rules apply
    return value;
  }

  // Populate conference filter with unique values
  populateConferenceFilter() {
    try {
      // Skip if no conference filter exists on this page
      if (!this.conferenceFilter) {
        return;
      }

      const conferences = new Set();

      this.currentData.forEach(row => {
        const conf = row.conf || row.conference || row.Conf;
        if (conf) {
          conferences.add(conf);
        }
      });

      // Clear existing options except "All Conferences"
      this.conferenceFilter.innerHTML =
        '<option value="">All Conferences</option>';

      // Add conference options
      Array.from(conferences)
        .sort()
        .forEach(conf => {
          const option = document.createElement('option');
          option.value = conf;
          option.textContent = conf;
          this.conferenceFilter.appendChild(option);
        });
    } catch (error) {
      console.error('Error populating conference filter:', error);
    }
  }

  // Filter table based on search and conference filter
  filterTable() {
    try {
      const searchTerm = this.searchInput
        ? this.searchInput.value.toLowerCase()
        : '';
      const conference = this.conferenceFilter
        ? this.conferenceFilter.value
        : '';

      const tbody = this.table.querySelector('tbody');
      if (!tbody) {
        return;
      }

      const rows = tbody.querySelectorAll('tr');
      let visibleRows = 0;

      rows.forEach((row, index) => {
        if (!row.cells || row.cells.length === 0) {
          return;
        }

        // Get team name (usually first column)
        const teamCell = row.cells[0];
        const teamName = teamCell ? teamCell.textContent.toLowerCase() : '';

        // Get conference from data instead of guessing from table
        let rowConference = '';
        if (this.currentData && this.currentData[index]) {
          rowConference =
            this.currentData[index].conf ||
            this.currentData[index].conference ||
            this.currentData[index].Conf ||
            '';
        }

        // Check matches
        const matchesSearch = teamName.includes(searchTerm);
        const matchesConference =
          conference === '' || rowConference === conference;

        if (matchesSearch && matchesConference) {
          row.style.display = '';
          visibleRows++;
        } else {
          row.style.display = 'none';
        }
      });

      // Reapply alternating row colors to visible rows
      this.reapplyRowColors();

      this.showNoResults(visibleRows === 0);
    } catch (error) {
      console.error('Error in filterTable:', error);
    }
  }

  // Reapply alternating row colors to visible rows only
  reapplyRowColors() {
    try {
      const tbody = this.table.querySelector('tbody');
      if (!tbody) {
        return;
      }

      const allRows = tbody.querySelectorAll('tr');
      const visibleRows = Array.from(allRows).filter(
        row => row.style.display !== 'none'
      );

      // Reset all row colors first
      allRows.forEach(row => {
        const cells = row.querySelectorAll('td');
        cells.forEach(cell => {
          // Reset background color for all cells except first column (which has special styling)
          if (cell !== row.cells[0]) {
            cell.style.backgroundColor = '';
          }
        });
        // Reset row background
        row.style.backgroundColor = '';
      });

      // Apply alternating colors to visible rows only
      visibleRows.forEach((row, visibleIndex) => {
        const isEven = visibleIndex % 2 === 1; // 0-based index, so second row (index 1) is "even" in display
        const cells = row.querySelectorAll('td');

        if (isEven) {
          // Apply gray background for even rows
          row.style.backgroundColor = '#e9ecef';
          cells.forEach(cell => {
            cell.style.backgroundColor = '#e9ecef';
          });
        } else {
          // Apply white background for odd rows
          row.style.backgroundColor = '#fff';
          cells.forEach(cell => {
            cell.style.backgroundColor = '#fff';
          });
        }
      });
    } catch (error) {
      console.error('Error in reapplyRowColors:', error);
    }
  }

  // Show/hide "No results" message
  showNoResults(show) {
    try {
      let noResultsMsg = document.querySelector('.no-results');

      if (noResultsMsg) {
        noResultsMsg.remove();
      }

      if (show && this.table) {
        noResultsMsg = document.createElement('div');
        noResultsMsg.className = 'no-results';
        noResultsMsg.textContent = 'No matching results found';

        if (this.table.parentNode) {
          this.table.parentNode.insertBefore(
            noResultsMsg,
            this.table.nextSibling
          );
        }
      }
    } catch (error) {
      console.error('Error in showNoResults:', error);
    }
  }

  // Initialize table sorting functionality
  initTableSorting() {
    try {
      const headers = this.table.querySelectorAll('th');
      headers.forEach((header, index) => {
        header.style.cursor = 'pointer';
        header.style.userSelect = 'none';
        // Don't override position - let CSS sticky positioning work

        // Add sorting indicator
        const sortIndicator = document.createElement('span');
        sortIndicator.className = 'sort-indicator';
        sortIndicator.innerHTML = ' &#8597;'; // HTML entity for up-down arrow
        header.appendChild(sortIndicator);

        header.addEventListener('click', () => this.sortTable(index, header));
      });
    } catch (error) {
      console.error('Error in initTableSorting:', error);
    }
  }

  // Sort table by column
  sortTable(columnIndex, header) {
    try {
      const tbody = this.table.querySelector('tbody');
      if (!tbody) {
        return;
      }

      const rows = Array.from(tbody.querySelectorAll('tr')).filter(
        row => row.style.display !== 'none'
      );
      const isAscending = header.getAttribute('data-sort') !== 'asc';

      // Clear all sort indicators
      this.table.querySelectorAll('th .sort-indicator').forEach(indicator => {
        indicator.innerHTML = ' &#8597;'; // HTML entity for up-down arrow
        indicator.parentElement.removeAttribute('data-sort');
      });

      // Set current sort indicator
      const indicator = header.querySelector('.sort-indicator');
      if (isAscending) {
        indicator.innerHTML = ' &#8593;'; // HTML entity for up arrow
        header.setAttribute('data-sort', 'asc');
      } else {
        indicator.innerHTML = ' &#8595;'; // HTML entity for down arrow
        header.setAttribute('data-sort', 'desc');
      }

      // Sort rows
      rows.sort((a, b) => {
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

      // Reapply alternating row colors after sorting
      this.reapplyRowColors();
    } catch (error) {
      console.error('Error in sortTable:', error);
    }
  }

  // Update progress indicators for Publishing Tracker
  updateProgressIndicators() {
    try {
      // Check if progress indicators exist on this page
      const scheduleProgressElement =
        document.getElementById('scheduleProgress');
      const rosterProgressElement = document.getElementById('rosterProgress');

      if (
        !scheduleProgressElement ||
        !rosterProgressElement ||
        !this.currentData
      ) {
        return; // Not the Publishing Tracker page or no data
      }

      const totalTeams = this.currentData.length;
      if (totalTeams === 0) {
        return;
      }

      // Count TRUE values for Schedule Published
      const schedulePublished = this.currentData.filter(
        row =>
          row['Schedule Published?'] === 'TRUE' ||
          row['Schedule Published?'] === true
      ).length;

      // Count TRUE values for Roster Published
      const rosterPublished = this.currentData.filter(
        row =>
          row['Roster Published?'] === 'TRUE' ||
          row['Roster Published?'] === true
      ).length;

      // Calculate percentages with one decimal place
      const schedulePercentage = (
        (schedulePublished / totalTeams) *
        100
      ).toFixed(1);
      const rosterPercentage = ((rosterPublished / totalTeams) * 100).toFixed(
        1
      );

      // Update text displays
      scheduleProgressElement.textContent = `${schedulePercentage}%`;
      rosterProgressElement.textContent = `${rosterPercentage}%`;

      // Update progress bars
      const scheduleProgressFill = document.getElementById(
        'scheduleProgressFill'
      );
      const rosterProgressFill = document.getElementById('rosterProgressFill');

      if (scheduleProgressFill) {
        scheduleProgressFill.style.width = `${schedulePercentage}%`;
      }

      if (rosterProgressFill) {
        rosterProgressFill.style.width = `${rosterPercentage}%`;
      }

      console.log(
        `Progress updated: Schedules ${schedulePercentage}% (${schedulePublished}/${totalTeams}), Rosters ${rosterPercentage}% (${rosterPublished}/${totalTeams})`
      );
    } catch (error) {
      console.error('Error updating progress indicators:', error);
    }
  }
}

// Create global instance
window.tableController = new TableController();
