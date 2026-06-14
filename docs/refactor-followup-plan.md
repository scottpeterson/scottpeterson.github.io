# Refactor Follow-Up — Running Ledger

> **Intent:** A single place to track the build-system and design-system cleanup that grew out of
> the static-site refactor (and a follow-up code review). It records what's **done** versus what
> genuinely **remains**, so neither this agent nor a future one re-does finished work or loses the
> open threads. Update the tables here as items land. Design-token specifics live in
> `docs/design-system.md` (§4 mirrors the design rows below); build/deploy expectations live in
> `CLAUDE.md`.

## How the site builds (one-paragraph refresher)

`config/pages.json` + `templates/*.html` → `node build.js build` → Prettier-formatted HTML at the
repo root. Standalone reports go through `node wrap-reports.js`, which now **delegates** nav and
the reports index to `build.js` (single source of truth — `navConfig()`). GitHub Pages serves the
committed HTML directly; nothing rebuilds in CI, so the committed HTML must be regenerated and
committed by hand after any source change. There is intentionally **no** committed-HTML-equals-
fresh-build CI guard — see the decision row below.

## Done

| #   | Item                                                        | Notes                                                                                                                                                                                                                                                             |
| --- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| —   | `dev` / `clean` build commands                              | `node build.js dev` (watch templates/config/js/css) and `clean` (remove generated artifacts).                                                                                                                                                                     |
| —   | Generalized `handleConditionals`                            | Single data-driven loop over a `flags` map; handles `{{#TOKEN}}` and `{{^TOKEN}}`. Build asserts no `{{ }}` survives (`assertNoUnresolvedTokens`).                                                                                                                |
| —   | HTML-escape interpolated config values                      | `escapeHtml` applied to text mappings (titles, headings, nav labels, report/product fields). Markup mappings stay verbatim by design.                                                                                                                             |
| —   | CMD+K palette auto-syncs with nav                           | Palette reads `window.__NAV_ITEMS__` (emitted by build from `navConfig()`); `command-palette.js` enriches with icons/shortcuts. No more hand-maintained nav list to drift.                                                                                        |
| 5   | Consolidate reports generation                              | `build.js` is the sole owner of nav + `reports/index.html` (`renderNavShell`, `regenerateReportsIndex`); `wrap-reports.js` delegates. Removed the drifted hardcoded `generateNav` / `generateIndexPage`.                                                          |
| 6   | Fix Prettier drift in `command-palette.css` / `reports.css` | Root cause: `.stylelintrc.json` stylistic rules fought Prettier (pre-commit ran prettier then stylelint, leaving files dirty). Stripped to errors-only config.                                                                                                    |
| 7   | Read-only verification scripts                              | `lint:check`, `lint:check:js`, `lint:check:css`, `format:check`, `verify` — non-mutating CI-style checks.                                                                                                                                                         |
| 8   | Tokenize reports/palette CSS + table runtime colors         | `reports.css` and `command-palette.css` on tokens (conservatively for the dark/isolated palette); `table-controls.js` no-results color → `--text-3`; data-viz colors left raw on purpose (commented).                                                             |
| 9   | Update stale docs                                           | This file, plus `CLAUDE.md` deployment clarification and `docs/design-system.md` reframed from plan → reference + status.                                                                                                                                         |
| 10  | Build-check guard decision                                  | **Decided: no guard.** "Last updated" uses filesystem mtime, which isn't preserved on a fresh clone, so a "committed HTML == fresh build" CI check would false-positive. The commit-is-the-build discipline (documented in `CLAUDE.md`) is the safeguard instead. |

Design-system pieces already shipped (detail in `design-system.md` §4): token `:root` foundation,
brand/navy gradients → `--grad-*`, footer `border-image` → `background-clip`, `:focus-visible`
site-wide, emoji → inline-SVG icon set.

## Remaining

| Item                                | Why it matters                                                                                                                                                                                                                                               | Status         |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------- |
| **`.card` base component**          | Largest single source of CSS duplication — `.explore-card` and `.home-card` are identical; several large surfaces share a look with no shared class.                                                                                                         | ❌ not started |
| **Finish `.btn` migration**         | `.button`/`.button-primary`, `.form-submit`, `.premium-button`, `.sample-button`, `.cta-button` not yet folded into `.btn`; `.premium-button:disabled` defined more than once.                                                                               | ⚠️ partial     |
| **Finish `.eyebrow` consolidation** | `.eyebrow` exists but `.home-badge` / `.home-premium__eyebrow` duplicates remain and `templates/home-hero.html` still emits `home-badge`.                                                                                                                    | ⚠️ partial     |
| **Divider system**                  | `.product-divider` / `.legend-section h2` / `.dropdown-divider` are three unrelated divider treatments.                                                                                                                                                      | ❌ not started |
| **Color-sweep tail**                | Raw near-duplicates remain: grays `#777`/`#888`/`#aaa`/`#93a1b0`; warm `#f39c12`/`#d4a017`/`#d68910`/`#c75b12`; green `#229954`; border grays `#e0e0e0`/`#e9ecef`/`#dee2e6`. Fold into `--text-*` / `--orange-500` / `--warning` / `--success` / `--border`. | ⬜ partial     |

**Verification for any remaining item:** `npm run build`, then diff a representative page of each
type (home, a table page e.g. `npi`, `premium`, `contact`, `success`) before/after — the goal for
these sweeps is _zero_ intended visual change.
