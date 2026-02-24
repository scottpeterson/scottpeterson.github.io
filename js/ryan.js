// ryan.js - Tournament proximity page logic
//
// Loads tournament_proximity.json (via the encoded data pipeline) which contains
// 64 tournament teams and their nearby opponents within 499 driving miles.
// Populates a dropdown with teams sorted alphabetically (with quadrant seed shown),
// and on selection displays nearby teams in two side-by-side tables sorted by quadrant seed.

(function () {
  const teamSelect = document.getElementById('ryan-team-select');
  const resultsDiv = document.getElementById('ryan-results');
  const resultsHeading = document.getElementById('ryan-results-heading');
  const bodyLeft = document.getElementById('ryan-table-body-left');
  const bodyRight = document.getElementById('ryan-table-body-right');
  const tableLeft = document.getElementById('ryan-table-left');
  const tableRight = document.getElementById('ryan-table-right');
  const noResults = document.getElementById('ryan-no-results');

  let proximityData = null;

  // Populate dropdown with all 64 teams in alphabetical order
  function populateDropdown(data) {
    const teams = Object.keys(data).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: 'base' })
    );

    const defaultOption = '<option value="">Select a team...</option>';
    const options = teams
      .map(t => {
        const seed = data[t].quadrant_seed;
        return `<option value="${t}">${t} (Q${seed})</option>`;
      })
      .join('');

    teamSelect.innerHTML = defaultOption + options;
    teamSelect.disabled = false;
  }

  // Render rows for a table body element
  function renderRows(rows) {
    return rows
      .map(
        t =>
          `<tr>
            <td>${t.team}</td>
            <td>Q${t.quadrant_seed}</td>
            <td>${t.conference}</td>
            <td>${t.distance_miles}</td>
          </tr>`
      )
      .join('');
  }

  // Show nearby teams split across two side-by-side tables
  function showNearbyTeams(teamName) {
    const team = proximityData[teamName];
    if (!team) {
      return;
    }

    const nearby = team.nearby_teams;

    resultsHeading.textContent =
      teamName +
      ' (Q' +
      team.quadrant_seed +
      ') \u2014 Nearby Tournament Teams';

    if (nearby.length === 0) {
      bodyLeft.innerHTML = '';
      bodyRight.innerHTML = '';
      tableLeft.style.display = 'none';
      tableRight.style.display = 'none';
      noResults.style.display = '';
      resultsDiv.style.display = '';
      return;
    }

    // Sort by quadrant seed ascending
    const sorted = nearby
      .slice()
      .sort((a, b) => a.quadrant_seed - b.quadrant_seed);

    // Split into two halves — left gets the extra row if odd count
    const mid = Math.ceil(sorted.length / 2);
    const leftRows = sorted.slice(0, mid);
    const rightRows = sorted.slice(mid);

    bodyLeft.innerHTML = renderRows(leftRows);
    bodyRight.innerHTML = renderRows(rightRows);

    tableLeft.style.display = '';
    tableRight.style.display = rightRows.length > 0 ? '' : 'none';
    noResults.style.display = 'none';
    resultsDiv.style.display = '';
  }

  // Handle dropdown change
  teamSelect.addEventListener('change', function () {
    if (this.value) {
      showNearbyTeams(this.value);
    } else {
      resultsDiv.style.display = 'none';
    }
  });

  // Load data on page ready
  async function init() {
    try {
      proximityData = await window.dataLoader.loadData('tournament_proximity');
      populateDropdown(proximityData);
    } catch (err) {
      console.error('Failed to load tournament proximity data:', err);
      teamSelect.innerHTML = '<option value="">Error loading teams</option>';
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
