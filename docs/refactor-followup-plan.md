# Refactor follow-up ledger

<!-- ste-allow: CMD, JS -->

> **Intent:** This ledger tracks the build-system and design-system cleanup that grew out of the
> static-site refactor and a follow-up code review. It records what is **done** and what still
> **remains**. With it, no agent repeats finished work or loses an open item. Update the tables
> here as items land. Design-token details are in `docs/design-system.md`, where §4 mirrors the
> design rows below. Build and deploy expectations are in `CLAUDE.md`.

## Site build

1. `node build.js build` reads `config/pages.json` and `templates/*.html`.
2. It writes Prettier-formatted HTML at the repository root.

Standalone reports go through `node wrap-reports.js`. That script **delegates** the nav and the
reports index to `build.js`, which is the single source for both (`navConfig()`). GitHub Pages
serves the committed HTML directly.

Nothing rebuilds in CI. So after any source change, regenerate
the HTML and commit it by hand. The repository has **no** CI check that compares the committed
HTML with a fresh build. The decision row below gives the reason.

## Done

| #   | Item                                                          | Notes                                                                                                                                                                                                                                                                           |
| --- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| -   | `dev` and `clean` build commands                              | `node build.js dev` watches templates, config, JS, and CSS. `clean` removes generated files.                                                                                                                                                                                    |
| -   | Generalized `handleConditionals`                              | One data-driven loop over a `flags` map handles `{{#TOKEN}}` and `{{^TOKEN}}`. The build asserts that no `{{ }}` remains (`assertNoUnresolvedTokens`).                                                                                                                          |
| -   | HTML-escape interpolated config values                        | `escapeHtml` applies to text mappings. Those are titles, headings, nav labels, and report and product fields. Markup mappings stay verbatim by design.                                                                                                                          |
| -   | CMD+K palette syncs with the nav                              | The palette reads `window.__NAV_ITEMS__`, which the build emits from `navConfig()`. `command-palette.js` adds icons and shortcuts. No hand-maintained nav list is left to drift.                                                                                                |
| 5   | Consolidate reports generation                                | `build.js` alone generates the nav and `reports/index.html` (`renderNavShell`, `regenerateReportsIndex`). `wrap-reports.js` delegates to it. The drifted hardcoded `generateNav` and `generateIndexPage` are gone.                                                              |
| 6   | Fix Prettier drift in `command-palette.css` and `reports.css` | The stylistic rules in `.stylelintrc.json` conflicted with Prettier. The pre-commit hook ran prettier, then stylelint, and left files dirty. The config now has error rules only.                                                                                               |
| 7   | Read-only check scripts                                       | `lint:check`, `lint:check:js`, `lint:check:css`, `format:check`, and `verify` are CI-style checks that change no files.                                                                                                                                                         |
| 8   | Tokenize reports and palette CSS, and table runtime colors    | `reports.css` and `command-palette.css` use tokens. The dark, isolated palette uses them conservatively. The no-results color in `table-controls.js` is now `--text-3`. Data-viz colors stay raw on purpose, with a comment.                                                    |
| 9   | Update stale docs                                             | This file, a deployment note in `CLAUDE.md`, and `docs/design-system.md`, which changed from a plan to a reference with status.                                                                                                                                                 |
| 10  | Build-check decision                                          | **Decided: no check.** "Last updated" uses the filesystem mtime, which a fresh clone does not keep. So a CI check that compares committed HTML with a fresh build would report false failures. The rule that the commit is the build, in `CLAUDE.md`, is the safeguard instead. |

These design-system pieces shipped earlier. `design-system.md` §4 has the details.

- the token `:root` foundation
- brand and navy gradients moved to `--grad-*`
- the footer `border-image` replaced by `background-clip`
- `:focus-visible` on the whole site
- an inline-SVG icon set in place of emoji
- one `.btn` button system with a single `:disabled`
- one rule for `.explore-card` and `.home-card`
- a shared `.eyebrow` base
- the near-duplicate gray and border colors merged
- a full shadow token system, so every `box-shadow` resolves to a token (`design-system.md` §3
  "Shadows")

## Resolved items

> **Correction:** The first version of this table came from quick greps and listed too much open
> work. The CSS showed that an earlier pass already merged the buttons, cards, and eyebrow. That
> pass used _grouped selectors_ instead of new generic class names. Each item now has a final
> state. To check any claim below, read `styles.css`, not this table.

| Item                                       | Resolution                                                                                                                                                                                                                                                                                    |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.btn` migration                           | **Done.** The legacy classes are grouped into one `.btn` base plus variants. `:focus-visible` is added, with a single `:disabled`. The classes were grouped instead of renamed, so JS and HTML selectors keep working.                                                                        |
| `.explore-card` and `.home-card` duplicate | **Done.** The two share one rule. A generic `.card--lg` for the other large surfaces, which already use tokens, is **deferred**. The change would cost more than it gains.                                                                                                                    |
| `.eyebrow` consolidation                   | **Done.** An `.eyebrow` base has the context variants `.home-badge` and `.home-premium__eyebrow`. Templates emit the variants by design.                                                                                                                                                      |
| Divider system                             | **Declined.** The three treatments are separate components. They are the dark-menu separator, the heading underline, and the section `<hr>`. All three already use tokens. Merging them would couple unrelated components with no benefit.                                                    |
| Near-duplicate colors                      | **Done.** `#e0e0e0` (3 uses) and `#dee2e6` became `--border`. `#777` (2 uses), `#888`, and `#aaa` became `--text-3/4`. Distinct accents stay on purpose: the honor-gold family, the verified gold, the audience rust, `#93a1b0`, the `#e9ecef` surface tint, and the `#229954` gradient stop. |

## Deferred on purpose

These items are deferred on purpose. They are not debt. Do one only when a change already touches that
area.

- a generic `.card--lg` class
- a `--surface-2/3` family for the light-surface tints (`#e9ecef`, `#f8f9fa`, `#f5f5f5`)
- tokens for single-use warm accents

## Check after a change

1. Run `npm run build`.
2. Compare one page of each type before and after the change. Use the home page, a table page
   such as `npi`, `premium`, `contact`, and `success`.
3. Confirm _zero_ intended visual change. That is the goal of these cleanups.
