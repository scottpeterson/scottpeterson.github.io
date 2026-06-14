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
site-wide, emoji → inline-SVG icon set, unified `.btn` button system (single `:disabled`),
merged `.explore-card`/`.home-card`, shared `.eyebrow` base, the near-duplicate gray/border
color collapse, and a full shadow token system (every `box-shadow` resolves to a token; see
`design-system.md` §3 "Shadows").

## Resolved (was "Remaining")

> **Correction:** the first cut of this table (written from shallow greps) overstated the open
> work — reading the actual CSS showed the buttons/cards/eyebrow consolidation was already shipped
> in a prior pass, just via _grouped selectors_ rather than new generic class names. Each item is
> now at a definite end state; verify any claim below by reading `styles.css`, not this table.

| Item                             | Resolution                                                                                                                                                                                                                                   |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.btn` migration                 | ✅ **done** — legacy classes grouped into one `.btn` base + variants; `:focus-visible` added; single `:disabled`. (They were grouped, not renamed, to keep JS/HTML selectors working.)                                                       |
| `.explore-card`/`.home-card` dup | ✅ **done** — share one rule. Generic `.card--lg` across the other (already-tokenized) large surfaces is **deferred** as churn-for-marginal-gain.                                                                                            |
| `.eyebrow` consolidation         | ✅ **done** — `.eyebrow` base + `.home-badge`/`.home-premium__eyebrow` context variants; templates emit the variants by design.                                                                                                              |
| Divider "system"                 | ✅ **resolved as decline** — the three treatments are distinct components (dark-menu separator / heading underline / section `<hr>`), already tokenized; unifying them would couple unrelated things for no win.                             |
| Color near-dupe tail             | ✅ **done** — `#e0e0e0`(×3)/`#dee2e6` → `--border`; `#777`(×2)/`#888`/`#aaa` → `--text-3/4`. Distinct accents (honor-gold family, verified gold, audience rust, `#93a1b0`, `#e9ecef` surface tint, `#229954` gradient stop) kept on purpose. |

**Consciously deferred (not debt):** generic `.card--lg` extraction; a `--surface-2/3` family for
the light-surface tints (`#e9ecef`/`#f8f9fa`/`#f5f5f5`); tokenizing single-use warm accents. Do
any of these only when a change is already in that area.

**Verification when revisiting:** `npm run build`, then diff a representative page of each type
(home, a table page e.g. `npi`, `premium`, `contact`, `success`) before/after — the goal for these
sweeps is _zero_ intended visual change.
