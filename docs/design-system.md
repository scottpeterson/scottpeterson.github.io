# Design System — Catalog & Consolidation Plan

> **Intent:** This is the single source of truth for the site's look & feel. It catalogs the
> components and visual primitives **as they exist today**, flags inconsistencies, and defines
> the **target token system** to consolidate toward. When adding UI, reach for a token/component
> here before inventing a new value. Generated from a full-codebase audit (styles.css ~2,600
> lines, all templates, build.js, js/, config/pages.json).

## TL;DR

The site has a strong visual identity but **no design tokens** — every color/gradient/shadow/
radius is a hardcoded literal, copy-pasted (the brand blue gradient appears **11×**, the navy
gradient **3×**). Consolidating to CSS custom properties + a unified `.btn` and `.card` is the
highest-leverage cleanup. Fonts and eyebrows are already consistent; icons are the most
fragmented dimension.

---

## 1. Proposed tokens (`:root`) — the foundation

Introducing these changes **nothing visually** (they alias the values already in use). Everything
else consolidates by pointing at them.

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

### Buttons — collapse ~7 systems into 1

Today: `.btn`/`.btn--*` (home), `.button`/`.button-primary` (success/cancel), `.form-submit`
(forms), `.premium-button` (checkout), `.sample-button` (PDF), `.cta-button` (premium band), nav
links. Seven different paddings, inconsistent hover shadows, **no `:focus-visible` on any of them.**

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

### Cards — collapse 24+ into 1 base + modifiers

`.explore-card` and `.home-card` are **identical**. `table-section`, `home-content`, `contact-form`
share the large-surface look. Target:
| Class | Tokens | Replaces |
|---|---|---|
| `.card` | `--surface`, `--r-md`, `--elev-2`, `--space-3` pad | explore-card, home-card, feature-card |
| `.card--lg` | `--r-lg`, `--elev-3`, `--space-4` pad | table-section, home-content, contact-form/info, progress-indicators |
| `.card--interactive` | adds hover lift | explore-card behavior |
| status borders | `--success`/`--danger` left/edge | distance-close/far (already semantic — keep) |

### Eyebrow — share the duplicate

`.home-badge` and `.home-premium__eyebrow` are identical except color → one `.eyebrow` class
(`--text-xs`, 700, `0.08em`, uppercase) + a color set per context.

---

## 3. Foundations — inconsistency hit-list (with file:line)

**Gradients (copy-paste → token):**

- Brand blue `135deg #3498db→#2980b9` ×11: styles.css:86, 151, 246, 617, 639, 1116, 1463, 1934, 2125, 2401, 2435
- Navy chrome gradient ×3 (identical): `.main-nav` :26, `.home-premium` :412, `footer` :761

**Strokes:**

- ⚠️ **Footer uses `border-image`** (:764) → breaks on rounded corners / mobile. Apply the
  `background-clip` technique already used on `header` (:190).
- No divider system: `.product-divider` (4px top), `.legend-section h2` (2px bottom),
  `.dropdown-divider` (1px gray) — unify.
- Left-border accents are OK where semantic (`.urgency-note` amber, `.premium-intro-box`) — keep,
  don't extend to plain cards.

**Color near-duplicates to collapse:**

- Grays: `#555 #666 #777 #888 #999 #aaa #93a1b0 #aebac6` → `--text-2/3/4`
- Warm tones: `#ff4f00 #f39c12 #d4a017 #d68910 #f0a500 #c75b12` → `--orange-500` + `--warning`
- Greens: `#27ae60 #229954 #2ecc71` → `--success`
- Border grays: `#e0e0e0 #e1e5e8 #e9ecef #dee2e6` → `--border`

**Radius outliers** to fold into 8/12/16/pill: 3px, 4px, 6px, 10px, 20px (nav pill → `--r-pill`).

**Shadows:** ~15 values → `--elev-1/2/3` + `--elev-modal`; brand-blue button shadow → `--shadow-action`.

**Type:** ✅ one font stack. 30+ ad-hoc sizes + mixed px/rem → map to `--text-*`. Weights
500/600/700/800 used without rule → body 400, links/labels 500, h2/h3/buttons 600, h1/eyebrow 700,
hero/price 800.

**Icons (most fragmented):** four methods — emoji (📊🔮📈👥 in config/pages.json premium features),
SVG data-URIs (select arrows, styles.css:882 & :2326, two sizes of the same glyph), HTML entities
(→ ↓ ▾), CSS `content` (✓). Needs a single deliberate approach (decision required — see plan).

---

## 4. Staged refactor plan (each phase independently shippable)

0. **Tokens** — add `:root` block; no visual change. _(Foundation for all below.)_
1. **Buttons** — one `.btn` system; map all button classes; add `:focus-visible`; fix the
   double `:disabled`.
2. **Cards** — `.card` / `.card--lg` / `.card--interactive`; merge identical definitions.
3. **Strokes & eyebrow** — footer `border-image` → `background-clip`; unify dividers; `.eyebrow`.
4. **Color/shadow/radius sweep** — replace literals with tokens; collapse near-duplicates.
5. **Icons** — implement the chosen single approach.

**Verification per phase:** `npm run build`, then diff a representative page of each type
(home, a table page e.g. npi, premium, contact, success) before/after — the goal is _zero_
intended visual change in phases 0–4 except the footer-corner fix.
