// Display formats for numbers a reader sees in the data tables and the team
// summary. Scott approved one format per kind of value on 2026-11-12 (the
// "Formats" section of TERMINOLOGY.md in the d3-bball-npi repo); the D3 WBB
// sites and the team PDFs all follow it, so keep this file in step with it:
//
//   rank                  #54
//   percentage            81%   (whole number)
//   simulation chance     <1% and >99% when it rounds to 0 or 100
//   value that can be     +9.9, -3.2 (always signed)
//   below zero
//   height                5'9  (feet and inches, no inch mark)
//
// INTENT: these functions change only the text in a cell. The raw value stays
// in the data and in the cell's data-sort attribute (table-controls.js), so
// sorting and coloring never parse the display text. Do not "simplify" the
// sort back to textContent: "#54", "<1%", and "5'8.1" do not parse as numbers.
//
// The spreadsheet exports write negatives in accounting style, "(1.99)", and
// errors as "#N/A" or "#DIV/0!". toNumber reads the first and returns NaN for
// the second, and every formatter returns a value it cannot read unchanged.
(function () {
  function toNumber(value) {
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value !== 'string') {
      return NaN;
    }
    const trimmed = value.trim().replace(/,/g, '');
    if (trimmed === '' || trimmed === '-' || trimmed.startsWith('#')) {
      return NaN;
    }
    const accounting = trimmed.match(/^\((\d+\.?\d*)\)$/);
    if (accounting) {
      return -parseFloat(accounting[1]);
    }
    // Only a plain number, optionally signed or followed by %, counts.
    if (/^[-+]?\d*\.?\d+%?$/.test(trimmed)) {
      return parseFloat(trimmed);
    }
    return NaN;
  }

  // Round half away from zero, so 70.5 shows as 71 and -2.25 as -2.3.
  // toFixed alone rounds 1.005 down because of binary floating point.
  function fixed(value, decimals) {
    const n = toNumber(value);
    if (isNaN(n)) {
      return value;
    }
    const factor = Math.pow(10, decimals);
    const rounded =
      (Math.sign(n) * Math.round(Math.abs(n) * factor + 1e-9)) / factor;
    // Avoid "-0.0" for a value that rounds to zero.
    return (rounded === 0 ? 0 : rounded).toFixed(decimals);
  }

  function signed(value, decimals) {
    const n = toNumber(value);
    if (isNaN(n)) {
      return value;
    }
    const text = fixed(n, decimals);
    return parseFloat(text) > 0 ? '+' + text : text;
  }

  function rank(value) {
    const n = toNumber(value);
    return isNaN(n) ? value : '#' + fixed(n, Number.isInteger(n) ? 0 : 1);
  }

  // A percentage given as "68.62%", 68.62, or a fraction such as 0.75.
  // Pass fraction=true when the source stores 0..1 (preseason Win%).
  function percentNumber(value, fraction) {
    const n = toNumber(value);
    if (isNaN(n)) {
      return NaN;
    }
    return fraction ? n * 100 : n;
  }

  function percent(value, fraction) {
    const n = percentNumber(value, fraction);
    return isNaN(n) ? value : fixed(n, 0) + '%';
  }

  // A simulation chance. A simulated 0.0% or 100.0% does not mean a team is
  // eliminated or has clinched, so those show as <1% and >99%.
  function chance(value) {
    const n = percentNumber(value, false);
    if (isNaN(n)) {
      return value;
    }
    if (n < 0.5) {
      return '<1%';
    }
    if (n >= 99.5) {
      return '>99%';
    }
    return fixed(n, 0) + '%';
  }

  // Inches to feet and inches: 69 -> 5'9, 68.1 -> 5'8.1 (team averages keep
  // one decimal of inches).
  function height(value) {
    const n = toNumber(value);
    if (isNaN(n)) {
      return value;
    }
    const tenths = Math.round(n * 10);
    const feet = Math.floor(tenths / 120);
    const inches = (tenths - feet * 120) / 10;
    const inchText = Number.isInteger(inches) ? inches : inches.toFixed(1);
    return `${feet}'${inchText}`;
  }

  // An Excel error the workbook exports wrote as text, such as "#N/A" (no
  // value yet) or "#DIV/0!" (a team with no wins). Readers see a blank.
  function isExcelError(value) {
    return (
      typeof value === 'string' &&
      /^#(N\/A|DIV\/0!|VALUE!|REF!|NAME\?|NUM!|NULL!)$/.test(value.trim())
    );
  }

  window.D3Formats = {
    isExcelError,
    toNumber,
    fixed,
    signed,
    rank,
    percent,
    chance,
    height,
  };
})();
