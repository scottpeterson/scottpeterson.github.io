# Design System — Catalog & Reference

> **Intent:** This is the single source of truth for the site's look & feel. It catalogs the
> components and visual primitives, names the token system, and tracks what's been consolidated
> versus what debt remains. When adding UI, reach for a token/component here before inventing a
> new value. Originally generated from a full-codebase audit (styles.css ~2,600 lines, all
> templates, build.js, js/, config/pages.json); the **token foundation described below is now
> live in `styles.css`**.
>
> **Status note:** This started as a forward-looking consolidation plan. The token layer (§1)
> and several sweeps are now shipped — see **§4 Status & remaining debt** for the live picture
> and `docs/refactor-followup-plan.md` for the running ledger. The component target tables in
> §2 still describe the intended end state and remain the north star where not yet reached.

## TL;DR

The site has a strong visual identity, and the **design-token foundation now exists** — colors,
gradients, shadows, radii, type, and spacing live as CSS custom properties in `:root` (§1), and
the brand/navy gradients, footer stroke, `:focus-visible`, and icon set have been consolidated
onto them. **Still outstanding:** the unified `.card` base is not yet built, the `.btn` system
hasn't absorbed every legacy button (`.premium-button` et al., plus a duplicate `:disabled`
block), dividers aren't unified, and a tail of near-duplicate grays/warm-tones/border-grays
remains raw. Fonts and the `.eyebrow` are consistent.

---

## 1. Design tokens (`:root`) — the foundation ✅ shipped

These now live in `styles.css` `:root` and alias the values already in use, so they changed
**nothing visually**. Everything else consolidates by pointing at them — use these, never a raw
literal (see the rules in `CLAUDE.md`).

```css
:root {
  /* Brand / chrome */
  --navy-900: #2c3e50;
  --navy-700: #34495e;
  --blue-500: #3498db;
  --blue-600: #2980b9;
  --blue-300: #7fc4ff;
  --orange-500: #ff4f00;
  --orange-300: #ff9a6b;

  /* Text ramp (replaces 15+ ad-hoc grays) */
  --text-1: #2c3e50; /* headings        */
  --text-2: #333; /* body            */
  --text-3: #666; /* secondary       */
  --text-4: #999; /* tertiary / hint */

  /* Lines & surfaces */
  --border: #e1e5e8;
  --surface: rgb(255 255 255 / 95%);
  --surface-line: rgb(255 255 255 / 20%);

  /* Status (collapse 3 greens -> 1, 5 warm tones -> 2) */
  --success: #27ae60;
  --danger: #e74c3c;
  --warning: #f0a500;

  /* Gradients (single definitions) */
  --grad-brand: linear-gradient(135deg, var(--blue-500), var(--blue-600));
  --grad-chrome: linear-gradient(
    135deg,
    var(--navy-900),
    var(--navy-700) 50%,
    var(--navy-900)
  );
  --grad-accent: linear-gradient(
    135deg,
    var(--blue-500),
    var(--blue-600),
    var(--orange-500)
  );

  /* Elevation scale */
  --elev-1: 0 4px 16px rgb(0 0 0 / 8%);
  --elev-2: 0 8px 32px rgb(0 0 0 / 10%);
  --elev-3: 0 12px 40px rgb(0 0 0 / 15%);
  --elev-modal: 0 25px 50px -12px rgb(0 0 0 / 50%);
  --shadow-action: 0 4px 16px rgb(52 152 219 / 35%);

  /* Radius scale (replaces 9 ad-hoc values) */
  --r-sm: 8px;
  --r-md: 12px;
  --r-lg: 16px;
  --r-pill: 999px;

  /* Type scale */
  --text-xs: 0.78rem;
  --text-sm: 0.9rem;
  --text-base: 1rem;
  --text-md: 1.1rem;
  --text-lg: 1.3rem;
  --text-xl: 1.5rem;
  --text-2xl: 2rem;

  /* Spacing rhythm (8px base) */
  --space-1: 8px;
  --space-2: 16px;
  --space-3: 24px;
  --space-4: 32px;
  --space-5: 48px;
}
```

---

## 2. Components

### Buttons — collapse ~7 systems into 1 ⚠️ partially done

The `.btn`/`.btn--*` system exists and `:focus-visible` rings have been added site-wide (the old
a11y gap). **Not yet finished:** the legacy classes haven't all been folded in — `.button`/
`.button-primary` (success/cancel), `.form-submit` (forms), `.premium-button` (checkout),
`.sample-button` (PDF), `.cta-button` (premium band) still exist, and `.premium-button:disabled`
is still defined more than once. Original state for reference: seven different paddings,
inconsistent hover shadows, no `:focus-visible` on any of them.

Target — one `.btn` base + variants:
| Variant | Replaces | Look |
|---|---|---|
| `.btn--primary` | `.btn--primary`, `.button-primary`, `.premium-button`, `.form-submit` | `--grad-brand`, white text |
| `.btn--secondary` | `.cta-button` | white bg, `--blue-600` text (for use on blue bands) |
| `.btn--ghost` | `.btn--ghost` | transparent + white border (on dark) |
| `.btn--success` | `.sample-button` | green — genuinely semantic, keep distinct |
| `.btn--lg` / `.btn--block` | size/full-width one-offs | modifiers, not new classes |

- Single padding scale, single hover (`translateY(-2px)` + `--shadow-action` deepen).
- **Add `:focus-visible` ring** (currently missing site-wide — a11y gap).
- Retire the reversed-direction hover gradient and the duplicate `.premium-button:disabled`
  (defined twice: `styles.css:1952` & `:2376`).

### Cards — collapse 24+ into 1 base + modifiers ❌ not started

No unified `.card` base exists yet (`grep` finds zero `.card` selectors). This is the largest
piece of open debt. `.explore-card` and `.home-card` are **identical**. `table-section`, `home-content`, `contact-form`
share the large-surface look. Target:
| Class | Tokens | Replaces |
|---|---|---|
| `.card` | `--surface`, `--r-md`, `--elev-2`, `--space-3` pad | explore-card, home-card, feature-card |
| `.card--lg` | `--r-lg`, `--elev-3`, `--space-4` pad | table-section, home-content, contact-form/info, progress-indicators |
| `.card--interactive` | adds hover lift | explore-card behavior |
| status borders | `--success`/`--danger` left/edge | distance-close/far (already semantic — keep) |

### Eyebrow — share the duplicate ⚠️ partially done

A shared `.eyebrow` class (`--text-xs`, 700, `0.08em`, uppercase, color set per context) now
exists, but the old `.home-badge` and `.home-premium__eyebrow` definitions still live alongside
it and `templates/home-hero.html` still emits `home-badge`. Finish by migrating those usages to
`.eyebrow` and deleting the duplicates.

---

## 3. Foundations — inconsistency hit-list

> Line numbers from the original audit are omitted — they drifted as the refactor progressed.
> Resolved items are marked ✅; grep for the token/literal to find current call sites.

**Gradients (copy-paste → token):** ✅ done

- Brand blue gradient → `var(--grad-brand)` (0 raw literals remain; 7 token uses).
- Navy chrome gradient → `var(--grad-chrome)`.

**Strokes:**

- ✅ **Footer no longer uses `border-image`** — replaced with the `background-clip` padding-box/
  border-box technique used on `header`, so the brand stroke follows the rounded corners.
- ⬜ No divider system yet: `.product-divider` (4px top), `.legend-section h2` (2px bottom),
  `.dropdown-divider` (1px gray) — still to unify.
- Left-border accents are OK where semantic (`.urgency-note` amber, `.premium-intro-box`) — keep,
  don't extend to plain cards.

**Color near-duplicates to collapse:** ⬜ partially done — a tail remains raw

- Grays: `#555` and `#2ecc71` are gone; **still raw:** `#777` (×2), `#888`, `#aaa`, `#93a1b0`
  → fold into `--text-2/3/4`.
- Warm tones: **still raw:** `#f39c12`, `#d4a017`, `#d68910`, `#c75b12` → `--orange-500` /
  `--warning`.
- Greens: **still raw:** `#229954` → `--success`.
- Border grays: **still raw:** `#e0e0e0` (×3), `#e9ecef` (×7), `#dee2e6` → `--border`.

**Radius outliers** to fold into 8/12/16/pill: 3px, 4px, 6px, 10px, 20px (nav pill → `--r-pill`).

**Shadows:** ~15 values → `--elev-1/2/3` + `--elev-modal`; brand-blue button shadow → `--shadow-action`.

**Type:** ✅ one font stack. 30+ ad-hoc sizes + mixed px/rem → map to `--text-*`. Weights
500/600/700/800 used without rule → body 400, links/labels 500, h2/h3/buttons 600, h1/eyebrow 700,
hero/price 800.

**Icons:** ✅ largely done — the emoji in `config/pages.json` premium features have been replaced
by a deliberate inline-SVG icon set (`featureIcon` in build.js; the command palette uses the same
approach). Remaining minor fragmentation: select-arrow SVG data-URIs at two sizes, plus HTML
entities (→ ↓ ▾) and CSS `content` (✓) used for small glyphs — acceptable, not a priority.

---

## 4. Status & remaining debt

The original staged plan (phases 0–5) has been partially executed. Current state:

| Phase | Item                                                                                 | Status                                                                                             |
| ----- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| 0     | **Tokens** — `:root` block, no visual change                                         | ✅ done                                                                                            |
| 1     | **Buttons** — `.btn` system; `:focus-visible` site-wide                              | ⚠️ partial — legacy button classes not all folded in; duplicate `.premium-button:disabled` remains |
| 2     | **Cards** — `.card` / `.card--lg` / `.card--interactive`                             | ❌ not started — no `.card` base exists                                                            |
| 3     | **Strokes** — footer `border-image` → `background-clip`                              | ✅ done                                                                                            |
| 3     | **Dividers** — unify `.product-divider` / `.legend-section h2` / `.dropdown-divider` | ❌ not started                                                                                     |
| 3     | **Eyebrow** — single `.eyebrow`                                                      | ⚠️ partial — class exists, old duplicates + `home-badge` usage remain                              |
| 4     | **Gradients** — literals → `--grad-*`                                                | ✅ done                                                                                            |
| 4     | **Color sweep** — collapse near-duplicate grays/warm/green/border                    | ⬜ partial — tail of raw hexes remains (see §3)                                                    |
| 4     | **reports.css / command-palette.css** tokenized                                      | ✅ done                                                                                            |
| 5     | **Icons** — single deliberate approach                                               | ✅ largely done (inline SVG set)                                                                   |

**Highest-leverage open items:** (1) the `.card` base — biggest single source of duplication;
(2) finish the `.btn` migration and kill the duplicate `:disabled`; (3) the color-sweep tail.
The running ledger of these (and the broader build/docs cleanup they came from) lives in
`docs/refactor-followup-plan.md`.

**Verification when you pick one up:** `npm run build`, then diff a representative page of each
type (home, a table page e.g. npi, premium, contact, success) before/after — the goal for the
remaining color/component sweeps is _zero_ intended visual change.
