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

    data.forEach((row, dataIndex) => {
      const tr = document.createElement('tr');

      // Store the original data index on the row element
      // This ensures we can always look up the correct data even after sorting
      tr.setAttribute('data-index', dataIndex);

      headers.forEach((header, _headerIndex) => {
        const td = document.createElement('td');
        const headerText = header.textContent;

        // Map header text to data property
        let value = this.getValueFromRow(row, headerText);

        // Apply number formatting for specific columns
        value = this.formatValue(value, headerText);

        td.textContent = value !== null && value !== undefined ? value : '';

        // Apply red font color for negative values on specific columns
        this.applyNegativeValueStyling(td, value, headerText);

        // Apply bid type coloring to team name (first column) on NPI page
        this.applyBidTypeColoring(td, row, headerText);

        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    });

    // Apply initial alternating row colors
    this.reapplyRowColors();

    // Apply gradient coloring to Value Diff column on NPI page
    this.applyValueDiffGradient();
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

  // Apply red font color for negative values on specific columns
  applyNegativeValueStyling(td, value, headerText) {
    // Clean header text by removing sort indicators and other symbols
    const cleanHeader = headerText
      .replace(/[↕↑↓]/g, '')
      .toLowerCase()
      .trim();

    // Define which columns should have red font for negative values
    // Format: { 'page-identifier': ['column1', 'column2'] }
    // Note: 'value diff' uses gradient coloring instead, so it's not listed here
    const negativeValueColumns = {
      npi: ['rank diff'],
      current_season_rankings: ['value of results', 'stat'],
      conference_rankings: ['stat'],
    };

    // Get current page identifier
    const path = window.location.pathname;
    const currentPage =
      path.substring(path.lastIndexOf('/') + 1).replace('.html', '') || 'index';

    // Check if this column should have red font for negative values
    const pageColumns = negativeValueColumns[currentPage];
    if (pageColumns && pageColumns.includes(cleanHeader)) {
      // Parse the value and check if it's negative
      // Handle both standard negative notation (-5) and accounting notation (5)
      let isNegative = false;

      if (typeof value === 'string') {
        const trimmed = value.trim();
        // Check for accounting notation: (number) means negative
        if (/^\(\d+\.?\d*\)$/.test(trimmed)) {
          isNegative = true;
        } else {
          // Standard negative check
          const numericValue = parseFloat(trimmed.replace(/[^\d.-]/g, ''));
          isNegative = !isNaN(numericValue) && numericValue < 0;
        }
      } else {
        isNegative = typeof value === 'number' && value < 0;
      }

      if (isNegative) {
        td.style.color = 'red';
      }
    }
  }

  // Apply bid type coloring to team name on NPI page
  // Green for "A" (automatic qualifier), Blue for "C-01" through "C-21" (pool C bids)
  applyBidTypeColoring(td, row, headerText) {
    // Clean header text
    const cleanHeader = headerText
      .replace(/[↕↑↓]/g, '')
      .toLowerCase()
      .trim();

    // Only apply to Team column on NPI page
    if (cleanHeader !== 'team') {
      return;
    }

    // Check if we're on the NPI page
    const path = window.location.pathname;
    const currentPage =
      path.substring(path.lastIndexOf('/') + 1).replace('.html', '') || 'index';

    if (currentPage !== 'npi') {
      return;
    }

    // Get bid type from row data
    const bidType = row['Bid Type'] || row['bid type'] || row.bidType || '';

    if (bidType === 'A') {
      // Green for automatic qualifier
      td.style.color = '#228B22'; // Forest green
      td.style.fontWeight = 'bold';
    } else if (/^C-\d{2}$/.test(bidType)) {
      const bidNumber = parseInt(bidType.split('-')[1], 10);
      if (bidNumber >= 1 && bidNumber <= 21) {
        // Blue for Pool C bids (C-01 through C-21)
        td.style.color = '#1E90FF'; // Dodger blue
        td.style.fontWeight = 'bold';
      } else if (bidNumber >= 22 && bidNumber <= 36) {
        // Orange for Pool C bids (C-22 through C-36)
        td.style.color = '#FF8C00'; // Dark orange
        td.style.fontWeight = 'bold';
      }
    }
  }

  // Apply gradient coloring to Value Diff column on NPI page
  // Green for highest positive, red for most negative, white for zero
  applyValueDiffGradient() {
    // Only apply on NPI page
    const path = window.location.pathname;
    const currentPage =
      path.substring(path.lastIndexOf('/') + 1).replace('.html', '') || 'index';

    if (currentPage !== 'npi') {
      return;
    }

    // Find the Value Diff column index
    const headers = Array.from(this.table.querySelectorAll('th'));
    let valueDiffIndex = -1;

    headers.forEach((header, index) => {
      const headerText = header.textContent.replace(/[↕↑↓]/g, '').trim();
      if (headerText.toLowerCase() === 'value diff') {
        valueDiffIndex = index;
      }
    });

    if (valueDiffIndex === -1) {
      return;
    }

    // Get all values from the column
    const tbody = this.table.querySelector('tbody');
    const rows = tbody.querySelectorAll('tr');
    const values = [];

    rows.forEach(row => {
      const cell = row.cells[valueDiffIndex];
      if (cell) {
        const value = this.parseNumericValue(cell.textContent);
        if (!isNaN(value)) {
          values.push({ cell, value });
        }
      }
    });

    if (values.length === 0) {
      return;
    }

    // Find min and max values
    const allValues = values.map(v => v.value);
    const maxValue = Math.max(...allValues);
    const minValue = Math.min(...allValues);

    // Apply gradient colors
    values.forEach(({ cell, value }) => {
      const color = this.getGradientColor(value, minValue, maxValue);
      cell.style.backgroundColor = color;
      // Use dark text for readability
      cell.style.color = '#000';
    });
  }

  // Calculate gradient color from red (negative) through white (zero) to green (positive)
  getGradientColor(value, min, max) {
    // Handle edge case where all values are the same
    if (min === max) {
      return '#ffffff';
    }

    let r, g, b;

    if (value >= 0) {
      // Positive values: white to green
      // Normalize to 0-1 range (0 = white, 1 = green)
      const ratio = max > 0 ? value / max : 0;
      r = Math.round(255 - (255 - 34) * ratio); // 255 -> 34 (green)
      g = Math.round(255 - (255 - 139) * ratio); // 255 -> 139 (green)
      b = Math.round(255 - (255 - 34) * ratio); // 255 -> 34 (green)
    } else {
      // Negative values: white to red
      // Normalize to 0-1 range (0 = white, 1 = red)
      const ratio = min < 0 ? value / min : 0;
      r = Math.round(255 - (255 - 220) * ratio); // 255 -> 220 (red)
      g = Math.round(255 - (255 - 53) * ratio); // 255 -> 53 (red)
      b = Math.round(255 - (255 - 69) * ratio); // 255 -> 69 (red)
    }

    return `rgb(${r}, ${g}, ${b})`;
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

      rows.forEach(row => {
        if (!row.cells || row.cells.length === 0) {
          return;
        }

        // Get team name (usually first column)
        const teamCell = row.cells[0];
        const teamName = teamCell ? teamCell.textContent.toLowerCase() : '';

        // Get conference from data using the stored data index
        // This works correctly even after sorting because we store the original index
        let rowConference = '';
        const dataIndex = parseInt(row.getAttribute('data-index'));
        if (
          this.currentData &&
          !isNaN(dataIndex) &&
          this.currentData[dataIndex]
        ) {
          rowConference =
            this.currentData[dataIndex].conf ||
            this.currentData[dataIndex].conference ||
            this.currentData[dataIndex].Conf ||
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

  // Parse bid type value for sorting
  // Returns a numeric value where: A = 0, C-01 = 1, C-02 = 2, etc.
  // Non-bid values get a high number to sort last
  parseBidTypeValue(value) {
    if (typeof value !== 'string') {
      return 9999;
    }

    const trimmed = value.trim();

    // "A" (automatic qualifier) sorts first
    if (trimmed === 'A') {
      return 0;
    }

    // C-XX values sort by their numeric portion
    const cMatch = trimmed.match(/^C-(\d{2})$/);
    if (cMatch) {
      return parseInt(cMatch[1], 10);
    }

    // Everything else sorts last
    return 9999;
  }

  // Parse a numeric value, handling accounting notation where parentheses denote negatives
  // e.g., "(5.2)" becomes -5.2, "5.2" stays 5.2
  parseNumericValue(value) {
    if (typeof value !== 'string') {
      return parseFloat(value);
    }

    const trimmed = value.trim();

    // Check for accounting notation: (number) means negative
    // Match pattern like "(123.45)" or "(123)"
    const accountingMatch = trimmed.match(/^\((\d+\.?\d*)\)$/);
    if (accountingMatch) {
      return -parseFloat(accountingMatch[1]);
    }

    // Standard parsing: remove non-numeric characters except minus and decimal
    return parseFloat(trimmed.replace(/[^\d.-]/g, ''));
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

      // Check if sorting Bid Type column
      const headerText = header.textContent.replace(/[↕↑↓]/g, '').trim();
      const isBidTypeColumn = headerText.toLowerCase() === 'bid type';

      // Sort rows
      rows.sort((a, b) => {
        const aVal = a.cells[columnIndex].textContent.trim();
        const bVal = b.cells[columnIndex].textContent.trim();

        let result;

        // Use special sorting for Bid Type column
        if (isBidTypeColumn) {
          const aBid = this.parseBidTypeValue(aVal);
          const bBid = this.parseBidTypeValue(bVal);
          result = aBid - bBid;
        } else {
          // Try to parse as numbers, handling parentheses as negative values
          const aNum = this.parseNumericValue(aVal);
          const bNum = this.parseNumericValue(bVal);

          if (!isNaN(aNum) && !isNaN(bNum)) {
            result = aNum - bNum;
          } else {
            result = aVal.localeCompare(bVal);
          }
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
