// conference-bids.js - Conference Bids card on the Season Simulations page
//
// INTENT: show how many NCAA Tournament bids each conference averages per
// simulation, split into its automatic bid (AQ) and its at-large bids. The
// numbers come from the team rows the main table already loaded: a team's AQ%
// is its share of simulations with the automatic bid, so the sum of AQ% over a
// conference's teams is that conference's average automatic bids per
// simulation. The same holds for At-Large%. No second data file exists, so the
// card always agrees with the table above it.
//
// The published percentages are rounded to 0.1%, so raw sums drift by a few
// thousandths (42.993 automatic bids where the field has 43). Two rules remove
// the drift:
//   1. A conference's AQ is a whole number: it has one automatic bid or none.
//   2. The at-large column is scaled to the at-large bids left in the field
//      (FIELD_SIZE minus the automatic bids), then rounded with the largest
//      remainder method so the displayed cells add up to the displayed total.
// If the raw at-large sum is not within AT_LARGE_TOLERANCE of that count, the
// data does not describe a FIELD_SIZE-team field and the card shows plain
// rounded sums instead.

(function () {
  const FIELD_SIZE = 64;
  const AT_LARGE_TOLERANCE = 0.25;

  // "82.1%" -> 0.821; "-" or blank -> 0
  function share(value) {
    const number = parseFloat(String(value).replace('%', ''));
    return Number.isFinite(number) ? number / 100 : 0;
  }

  // Round values to hundredths so they add up to `target` (largest remainder).
  // Works in whole hundredths to stay clear of floating point error.
  function roundToTotal(values, target) {
    const exact = values.map(value => value * 100);
    const floors = exact.map(Math.floor);
    let left = Math.round(target * 100) - floors.reduce((a, b) => a + b, 0);
    const order = exact
      .map((value, index) => ({ index, remainder: value - floors[index] }))
      .sort((a, b) => b.remainder - a.remainder);
    for (const { index } of order) {
      if (left <= 0) {
        break;
      }
      floors[index] += 1;
      left -= 1;
    }
    return floors.map(hundredths => hundredths / 100);
  }

  function summarize(teams) {
    const byConference = new Map();
    for (const team of teams) {
      if (!team.Conf) {
        continue;
      }
      const row = byConference.get(team.Conf) || { aq: 0, atLarge: 0 };
      row.aq += share(team['AQ%']);
      row.atLarge += share(team['At-Large%']);
      byConference.set(team.Conf, row);
    }

    const rows = [...byConference].map(([conf, sums]) => ({
      conf,
      aq: Math.round(sums.aq),
      atLarge: sums.atLarge,
    }));
    const aqTotal = rows.reduce((sum, row) => sum + row.aq, 0);
    const rawAtLarge = rows.reduce((sum, row) => sum + row.atLarge, 0);
    const atLargeTotal = FIELD_SIZE - aqTotal;

    let atLarge;
    if (
      rawAtLarge > 0 &&
      Math.abs(rawAtLarge - atLargeTotal) <= AT_LARGE_TOLERANCE
    ) {
      const scale = atLargeTotal / rawAtLarge;
      atLarge = roundToTotal(
        rows.map(row => row.atLarge * scale),
        atLargeTotal
      );
    } else {
      atLarge = rows.map(row => Math.round(row.atLarge * 100) / 100);
    }
    rows.forEach((row, index) => {
      row.atLarge = atLarge[index];
      row.total = Math.round((row.aq + row.atLarge) * 100) / 100;
    });
    return rows;
  }

  function cell(tag, text, isNumber) {
    const element = document.createElement(tag);
    element.textContent = isNumber ? text.toFixed(2) : text;
    return element;
  }

  function drawRows(tbody, rows) {
    tbody.replaceChildren(
      ...rows.map(row => {
        const tr = document.createElement('tr');
        tr.append(
          cell('th', row.conf, false),
          cell('td', row.aq, true),
          cell('td', row.atLarge, true),
          cell('td', row.total, true)
        );
        tr.firstChild.scope = 'row';
        return tr;
      })
    );
  }

  function sortRows(rows, key, descending) {
    const direction = descending ? -1 : 1;
    rows.sort((a, b) => {
      const order =
        key === 'conf' ? a.conf.localeCompare(b.conf) : a[key] - b[key];
      // Ties fall back to total bids, then the conference code.
      return (
        order * direction || b.total - a.total || a.conf.localeCompare(b.conf)
      );
    });
  }

  function render(teams) {
    const section = document.getElementById('conferenceBids');
    const table = document.getElementById('conferenceBidsTable');
    if (!section || !table || !Array.isArray(teams) || teams.length === 0) {
      return;
    }
    const rows = summarize(teams);
    if (rows.length === 0) {
      return;
    }

    const sum = key =>
      Math.round(rows.reduce((total, row) => total + row[key], 0) * 100) / 100;
    const footer = document.createElement('tr');
    footer.append(
      cell('th', 'Total', false),
      cell('td', sum('aq'), true),
      cell('td', sum('atLarge'), true),
      cell('td', sum('total'), true)
    );
    footer.firstChild.scope = 'row';
    table.querySelector('tfoot').replaceChildren(footer);

    const tbody = table.querySelector('tbody');
    const headers = [...table.querySelectorAll('thead th')];
    const sortBy = (header, descending) => {
      sortRows(rows, header.dataset.key, descending);
      headers.forEach(other => other.removeAttribute('aria-sort'));
      header.setAttribute('aria-sort', descending ? 'descending' : 'ascending');
      drawRows(tbody, rows);
    };

    headers.forEach(header => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'conference-bids-sort';
      button.textContent = header.textContent;
      header.replaceChildren(button);
      button.addEventListener('click', () => {
        const current = header.getAttribute('aria-sort');
        // A first click sorts numbers from the most bids, names from A.
        const descending = current
          ? current === 'ascending'
          : header.dataset.key !== 'conf';
        sortBy(header, descending);
      });
    });

    sortBy(
      headers.find(header => header.dataset.key === 'total'),
      true
    );
    section.hidden = false;
  }

  window.conferenceBids = { render, summarize };
})();
