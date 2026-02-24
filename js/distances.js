// distances.js - Distance calculator page logic
//
// Loads pre-computed driving distances between D3 WBB schools from distances.json
// (via the encoded data pipeline). Populates two dropdowns with sorted school names,
// enables a Calculate button when two different schools are selected, and performs
// bidirectional lookup using alphabetically-sorted pair keys ("SchoolA|SchoolB").

(function () {
  const schoolA = document.getElementById('school-a');
  const schoolB = document.getElementById('school-b');
  const calcBtn = document.getElementById('calculate-btn');
  const resultEl = document.getElementById('distance-result');
  const errorEl = document.getElementById('distance-error');
  const errorMsg = document.getElementById('distance-error-msg');
  const distanceValue = document.getElementById('distance-value');
  const distanceSchools = document.getElementById('distance-schools');
  const distanceSource = document.getElementById('distance-source');

  const requestBtn = document.getElementById('request-distance-btn');
  const requestStatus = document.getElementById('request-status');

  let distanceData = null;

  // Update Calculate button state: enabled only when two different schools are selected
  function updateButtonState() {
    const a = schoolA.value;
    const b = schoolB.value;
    calcBtn.disabled = !(a && b && a !== b);
  }

  // Populate both dropdowns with sorted team names
  function populateDropdowns(teams) {
    const defaultOption = '<option value="">Select a school...</option>';
    const options =
      defaultOption +
      teams.map(t => `<option value="${t}">${t}</option>`).join('');

    schoolA.innerHTML = options;
    schoolB.innerHTML = options;
    schoolA.disabled = false;
    schoolB.disabled = false;
  }

  // Build the alphabetically-sorted lookup key for a pair of schools
  function makeKey(a, b) {
    return [a, b].sort().join('|');
  }

  // Look up distance and display result or error
  function calculate() {
    const a = schoolA.value;
    const b = schoolB.value;

    // Hide previous results and reset request button state
    resultEl.style.display = 'none';
    errorEl.style.display = 'none';
    requestBtn.style.display = '';
    requestBtn.disabled = false;
    requestBtn.textContent = 'Request This Distance';
    requestStatus.style.display = 'none';

    if (!a || !b || a === b) {
      return;
    }

    const key = makeKey(a, b);
    const entry = distanceData.distances[key];

    // Clear previous color and verified classes
    resultEl.classList.remove(
      'distance-close',
      'distance-far',
      'distance-verified'
    );

    if (entry) {
      distanceValue.textContent = entry.miles.toLocaleString();
      distanceSchools.textContent = `${a} → ${b}`;
      distanceSource.textContent = `Source: ${entry.source}`;
      resultEl.classList.add(
        entry.miles <= 499 ? 'distance-close' : 'distance-far'
      );
      if (entry.source === 'ncaa_verified') {
        resultEl.classList.add('distance-verified');
      }
      resultEl.style.display = 'block';
    } else {
      errorMsg.textContent = `No distance data found for ${a} and ${b}.`;
      errorEl.style.display = 'block';
    }
  }

  // Send a distance request via the same Formspree endpoint the contact form uses.
  // No UI — just fires a POST with the two school names so the site owner knows
  // which pairs are missing from the CSV.
  async function requestDistance() {
    const a = schoolA.value;
    const b = schoolB.value;
    if (!a || !b) {
      return;
    }

    requestBtn.disabled = true;
    requestBtn.textContent = 'Sending...';
    requestStatus.style.display = 'none';

    try {
      const res = await fetch('https://formspree.io/f/xjkragkq', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          subject: 'Distance Request',
          message: `Missing distance pair requested: ${a} ↔ ${b}`,
          _replyto: 'noreply@thed3statlab.com',
        }),
      });

      if (res.ok) {
        requestStatus.textContent = 'Request sent — thanks!';
        requestStatus.className =
          'distance-request-status distance-request-success';
        requestBtn.style.display = 'none';
      } else {
        throw new Error('Non-OK response');
      }
    } catch {
      requestStatus.textContent = 'Could not send request. Try again later.';
      requestStatus.className = 'distance-request-status distance-request-fail';
      requestBtn.disabled = false;
      requestBtn.textContent = 'Request This Distance';
    }

    requestStatus.style.display = 'block';
  }

  // Initialize: load data and wire up events
  async function init() {
    try {
      distanceData = await window.dataLoader.loadData('distances');

      if (!distanceData || !distanceData.teams || !distanceData.distances) {
        throw new Error('Invalid distances data format');
      }

      populateDropdowns(distanceData.teams);

      schoolA.addEventListener('change', updateButtonState);
      schoolB.addEventListener('change', updateButtonState);
      calcBtn.addEventListener('click', calculate);
      requestBtn.addEventListener('click', requestDistance);
    } catch (err) {
      console.error('Failed to load distances data:', err);
      schoolA.innerHTML = '<option value="">Failed to load</option>';
      schoolB.innerHTML = '<option value="">Failed to load</option>';
    }
  }

  // Wait for DOMContentLoaded so data-loader and main.js are fully initialized
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
