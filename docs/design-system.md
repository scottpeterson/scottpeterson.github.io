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

The site has a strong visual identity and the consolidation is **effectively complete.** Colors,
gradients, shadows, radii, type, and spacing live as CSS custom properties in `:root` (§1). The
button system is unified (legacy classes grouped into one `.btn` base + variants, `:focus-visible`
added, single `:disabled`), the identical `.explore-card`/`.home-card` duplication is merged, the
`.eyebrow` shares one base, gradients/footer-stroke/icons are tokenized, and the near-duplicate
gray/border literals have been snapped to the ramp. What remains is **deliberate, documented
decisions** rather than open debt: the three dividers are kept distinct on purpose, a handful of
single-use warm accents stay raw, and the generic `.card--lg` extraction across already-tokenized
large surfaces is deferred. See §4 for the full status and `docs/refactor-followup-plan.md` for
the ledger.

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

  /* Shadow system — see §3 "Shadows" for the full set + reuse rules.
     Neutral ladder: --elev-0 (resting) .. --elev-3 (raised) + --elev-modal,
     plus role tokens --elev-hover/-bar/-top/-menu/-inset/-drawer.
     Colored: --shadow-action(+ -hover), --shadow-success(+ -hover),
     --shadow-gold, --shadow-focus, --glow-blue, --glow-success/-warning/-danger. */
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

### Buttons — collapse ~7 systems into 1 ✅ done

Shipped — see the `BUTTON SYSTEM` block in `styles.css`. Rather than rename the legacy classes
(which would break JS selectors in `premium.js` / `distances.js` / `ryan.js` and the HTML), they
are **grouped into shared rules**: `.btn, .button, .cta-button, .premium-button, .sample-button,
.form-submit` share one base (padding / radius / gradient / shadow / hover), with `--primary`,
`--secondary`, `--success`, `--ghost`, and `--lg`/`--block` variants layered on. `:focus-visible`
rings were added for buttons **and** links (the old site-wide a11y gap), and the duplicate
`.premium-button:disabled` was collapsed to a single `:disabled` rule. For any NEW button, use
`.btn` + a variant — do not add a bespoke button class. Reference mapping:
| Variant | Replaces | Look |
|---|---|---|
| `.btn--primary` | `.btn--primary`, `.button-primary`, `.premium-button`, `.form-submit` | `--grad-brand`, white text |
| `.btn--secondary` | `.cta-button` | white bg, `--blue-600` text (for use on blue bands) |
| `.btn--ghost` | `.btn--ghost` | transparent + white border (on dark) |
| `.btn--success` | `.sample-button` | green — genuinely semantic, keep distinct |
| `.btn--lg` / `.btn--block` | size/full-width one-offs | modifiers, not new classes |

Single padding scale, single hover (`translateY(-2px)` + a deeper `--shadow-action`). The
reversed-direction hover gradient is gone.

### Cards — duplication merged ✅ done (generic `.card` extraction deferred)

The actual debt — `.explore-card` and `.home-card` being **identical** — is fixed: they now share
one rule (the "Surface card" block in `styles.css`, `var(--surface)` / `var(--r-md)` /
`var(--elev-2)` / `var(--space-3)`) so they can no longer drift apart.

The larger surfaces (`.table-section`, `.contact-form`, `.contact-info`, `home-content`) share the
same frosted look but differ in padding / shadow / extras and are **already fully tokenized** (no
raw literals). Pulling them under a single generic `.card` / `.card--lg` base would require adding
the class throughout the templates for marginal gain, so it's **intentionally deferred** — not
open debt. The idea is kept here as the north-star target if a future change touches these anyway:
| Class | Tokens | Would replace |
|---|---|---|
| `.card` | `--surface`, `--r-md`, `--elev-2`, `--space-3` pad | explore-card, home-card (already merged) |
| `.card--lg` | `--r-lg`, `--elev-3`, `--space-4` pad | table-section, home-content, contact-form/info |
| `.card--interactive` | adds hover lift | explore-card behavior |
| status borders | `--success`/`--danger` left/edge | distance-close/far (already semantic — keep) |

### Eyebrow — share the duplicate ✅ done

`.eyebrow` is the base treatment (`--text-xs`, 700, `0.08em`, uppercase); `.home-badge` and
`.home-premium__eyebrow` are grouped onto it and only add their per-context margin + accent color.
The templates keep emitting the named variants **by design** (the CSS comment says so) — they're
context variants sharing one base, not stray duplicates. New markup should use `.eyebrow`.

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
- ✅ **The three "dividers" are intentionally NOT unified.** They were reviewed and are distinct
  components, not one system: `.dropdown-divider` (1px navy separator _inside the dark menu_),
  `.legend-section h2` border-bottom (a 2px blue _heading underline_, i.e. typography), and
  `.product-divider` (a 4px blue centered _section `<hr>`_). They're all already tokenized
  (`--navy-700`, `--blue-500`); a shared `.divider` class would couple unrelated things for no
  real DRY win. Leave them be.
- Left-border accents are OK where semantic (`.urgency-note` amber, `.premium-intro-box`) — keep,
  don't extend to plain cards.

**Color near-duplicates:** ✅ done — true near-dupes collapsed, distinct accents kept

- Grays collapsed onto the ramp: `#555`, `#2ecc71`, `#777` (×2), `#888`, `#aaa` → `--text-3/4`.
- Border grays collapsed: `#e0e0e0` (×3), `#dee2e6` → `--border` (Δ 1–8 per channel; imperceptible).
- **Kept raw on purpose — these are distinct colors, NOT near-dupes, so do not "fix" them:**
  - Warm-accent family: `#fef9e7` / `#f39c12` / `#d68910` (premium honor section), `#d4a017`
    (NCAA-verified gold), `#c75b12` (audience-card rust). Single-use semantic accents; tokenizing
    each would add palette noise without reuse.
  - `#93a1b0` — desaturated blue-gray strikethrough price, tuned to sit on the dark navy band
    (not a neutral gray; `--text-*` would drop the blue tint).
  - `#229954` — the dark stop of `--grad-success` (a gradient definition, never was a stray literal).
  - `#e9ecef` — the table zebra-stripe **surface tint**, part of an untokenized light-surface
    family with `#f8f9fa` / `#f5f5f5`. A real but separate effort (would need `--surface-2/3`);
    out of scope for the near-dupe pass and mostly used as a background, not a border.

**Radius:** ⬜ mostly done — the big outliers (6px, 20px) are folded into `--r-*`; a small tail of
raw values remains (`3px`, `4px`, `10px`, each ×2). Low priority; fold in when nearby.

**Shadows:** ✅ done — **every `box-shadow` resolves to a token** (the `:root` "Shadow system"
block). Neutral elevation is a weight ladder (`--elev-0..3` + `--elev-modal`) plus role-named
tokens for shadows outside that ladder (`--elev-bar` nav/header, `--elev-top` footer, `--elev-menu`
dropdowns, `--elev-inset` progress track, `--elev-drawer` mobile slide-in, `--elev-hover` generic
hover lift). Colored shadows are semantic: `--shadow-action`(+`-hover`), `--shadow-success`
(+`-hover`), `--shadow-gold`, `--shadow-focus` (the compound input focus ring, used as
`var(--shadow-focus), var(--elev-1)`), `--glow-blue` (small brand accent), and
`--glow-success/-warning/-danger` (the command-palette status-pulse keyframes). Components reuse
them — a card hover lifts to `--elev-3`; each button colour has a rest + hover pair.

- _Tight-semantic snaps_ (sub-perceptual, chosen with the user): premium band `40px/22%`→`--elev-3`,
  faq `/5%` + audience-card legacy `rgba()` + report-card `/10%`→`--elev-0`/`--elev-1`, the `/40%`
  blue glows→`--glow-blue`, focus-ring alphas (`10/12%`)→`--shadow-focus` `/20%`, the `0 4px 20px`
  `/10%` callouts→`--elev-bar` `/15%`.
- _Out of scope (kept raw):_ the palette/modal **white hairline** `0 0 0 1px rgb(255 255 255 /10%)`
  (a 1px border-ring, not elevation; pairs with `var(--elev-modal)`), and two one-off **`text-shadow`s**
  (hero title depth, an orange text glow) — `text-shadow` is a separate property, not the elevation system.

**Type:** ✅ one font stack. 30+ ad-hoc sizes + mixed px/rem → map to `--text-*`. Weights
500/600/700/800 used without rule → body 400, links/labels 500, h2/h3/buttons 600, h1/eyebrow 700,
hero/price 800.

**Icons:** ✅ largely done — the emoji in `config/pages.json` premium features have been replaced
by a deliberate inline-SVG icon set (`featureIcon` in build.js; the command palette uses the same
approach). Remaining minor fragmentation: select-arrow SVG data-URIs at two sizes, plus HTML
entities (→ ↓ ▾) and CSS `content` (✓) used for small glyphs — acceptable, not a priority.

---

## 4. Status & remaining debt

The staged plan (phases 0–5) is effectively complete. Each item is now at a definite end state —
done, or a deliberate, documented decision to keep/defer. Nothing is left dangling.

| Phase | Item                                                              | Status                                                                              |
| ----- | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| 0     | **Tokens** — `:root` block, no visual change                      | ✅ done                                                                             |
| 1     | **Buttons** — `.btn` system; `:focus-visible`; single `:disabled` | ✅ done (legacy classes grouped, not renamed — see §2)                              |
| 2     | **Cards** — merge the identical `.explore-card` / `.home-card`    | ✅ done (shared rule); generic `.card`/`.card--lg` extraction **deferred** — see §2 |
| 3     | **Strokes** — footer `border-image` → `background-clip`           | ✅ done                                                                             |
| 3     | **Dividers** — unify the three divider treatments                 | ✅ resolved — **intentionally not unified** (distinct components, see §3)           |
| 3     | **Eyebrow** — single `.eyebrow`                                   | ✅ done (base + context variants by design)                                         |
| 4     | **Gradients** — literals → `--grad-*`                             | ✅ done                                                                             |
| 4     | **Color sweep** — collapse near-duplicate grays/borders           | ✅ done; distinct accents kept on purpose (see §3)                                  |
| 4     | **reports.css / command-palette.css** tokenized                   | ✅ done                                                                             |
| 5     | **Icons** — single deliberate approach                            | ✅ largely done (inline SVG set)                                                    |

**Consciously deferred (not debt, judgment calls):** (1) generic `.card`/`.card--lg` extraction
across the large surfaces — they're already tokenized, so it's churn for marginal gain; (2) a
`--surface-2/3` token family for the light-surface tints (`#e9ecef`/`#f8f9fa`/`#f5f5f5`); (3)
tokenizing the single-use warm-accent literals. Any of these is worth doing **only if** a change
is already touching that area. The running ledger lives in `docs/refactor-followup-plan.md`.

**Verification when you pick one up:** `npm run build`, then diff a representative page of each
type (home, a table page e.g. npi, premium, contact, success) before/after — the goal for the
remaining sweeps is _zero_ intended visual change (the near-dupe color collapse already shipped
accepted a sub-perceptual shift on a few muted grays; see its commit).
