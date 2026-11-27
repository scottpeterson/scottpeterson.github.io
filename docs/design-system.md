# Design system catalog and reference

<!-- ste-allow: JS, SVG, NCAA -->

> **Intent:** Treat this catalog as the single source of truth for the site's look and feel. It lists
> the components and visual primitives, names the token system, and tracks what is merged and what
> debt remains. When you add UI, use a token or component from this document before you invent a
> new value. It started as an audit of the whole codebase. The audit covered `styles.css` (about 2,600
> lines), all templates, `build.js`, `js/`, and `config/pages.json`. The **token foundation below is live in
> `styles.css`**.
>
> **Status note:** This document started as a plan for the merge work. The token layer (§1) and
> several cleanups shipped. **§4 Status and remaining debt** has the current status, and
> `docs/refactor-followup-plan.md` has the running ledger. The component target tables in §2
> still describe the intended end state, and they remain the target where it is not yet reached.

## Summary

The site has a strong visual identity. The merge work is **complete in practice**. Colors,
gradients, shadows, radii, type, and spacing are CSS custom properties in `:root` (§1). These
items are done:

- One button system. The legacy classes are grouped into one `.btn` base plus variants, with
  `:focus-visible` and a single `:disabled`.
- One rule for the identical `.explore-card` and `.home-card`.
- One base for `.eyebrow`.
- Tokens for the gradients, the footer stroke, and the icons.
- The near-duplicate gray and border literals moved onto the ramp.

The remaining items are **deliberate, documented decisions**, not open debt:

- The three dividers stay distinct on purpose.
- A few single-use warm accents stay raw.
- A generic `.card--lg` class for the large surfaces, which already use tokens, is deferred.

§4 has the full status, and `docs/refactor-followup-plan.md` has the ledger.

---

## 1. Design tokens (`:root`): the foundation, shipped

These tokens live in `styles.css` `:root`. They alias the values already in use, so they changed
**nothing visually**. All other styles point at them. Use these tokens and never a raw literal
(the rules are in `CLAUDE.md`).

```css
:root {
  /* Brand / chrome */
  --navy-900: #2c3e50;
  --navy-700: #34495e;
  --blue-500: #216a9c; /* white text on it 5.8:1; as link text on white 5.8:1 */
  --blue-600: #1a5f8f;
  --blue-300: #7fc4ff;
  --orange-500: #ff4f00;
  --orange-300: #ff9a6b;

  /* Text ramp (replaces 15+ ad-hoc grays) */
  --text-1: #2c3e50; /* headings        */
  --text-2: #333; /* body            */
  --text-3: #555; /* secondary; 4.7:1 on the dark end of the body gradient */
  --text-4: #707070; /* tertiary / hint; 4.9:1 on white */

  /* Lines & surfaces */
  --border: #e1e5e8; /* hairline for cards */
  --border-control: #8a9199; /* field edge, 3.2:1 on white (SC 1.4.11) */
  --surface: rgb(255 255 255 / 95%);
  --surface-line: rgb(255 255 255 / 20%);

  /* Status (collapse 3 greens -> 1, 5 warm tones -> 2) */
  --success: #1e8449; /* white text 4.7:1 */
  --danger: #b03a2e; /* white text 6.0:1; as text on white 6.0:1 */
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

  /* Brand type (IBM Plex), copied from ~/.claude/skills/design/assets/brand.css
     (version 2026-11-08). Type scale: 12, 14, 16, 20, 24, 32 px. */
  --font-sans: 'IBM Plex Sans', system-ui, sans-serif;
  --font-mono: 'IBM Plex Mono', ui-monospace, monospace;
  --fs-caption: 0.75rem; /* captions, badges, footer */
  --fs-small: 0.875rem; /* secondary text, notes */
  --fs-body: 1rem; /* body, table cells, buttons, inputs */
  --fs-h3: 1.25rem; /* subsection heading, the one headline number */
  --fs-h2: 1.5rem; /* section heading */
  --fs-h1: 2rem; /* page title, large prices and distances */
  --control-h: 36px;
  --control-gap: 8px;

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

### Buttons: about 7 systems merged into 1, done

The `BUTTON SYSTEM` block in `styles.css` holds the button rules. Renaming the legacy classes
would break JS selectors in `premium.js`, `distances.js`, and `ryan.js`, and in the HTML. So the
classes are **grouped into shared rules** instead.

- `.btn, .button, .cta-button, .premium-button, .sample-button, .form-submit` share one base for
  padding, radius, gradient, shadow, and hover.
- The variants `--primary`, `--secondary`, `--success`, `--ghost`, `--lg`, and `--block` add to
  that base.
- Buttons **and** links have `:focus-visible` rings. Before, the whole site lacked them, which
  was an accessibility gap.
- The duplicate `.premium-button:disabled` became a single `:disabled` rule.

For any NEW button, use `.btn` plus a variant. Do not add a custom button class. The mapping:

| Variant                    | Replaces                                                              | Look                                                 |
| -------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------- |
| `.btn--primary`            | `.btn--primary`, `.button-primary`, `.premium-button`, `.form-submit` | `--grad-brand`, white text                           |
| `.btn--secondary`          | `.cta-button`                                                         | white background, `--blue-600` text (for blue bands) |
| `.btn--ghost`              | `.btn--ghost`                                                         | transparent with a white border (on dark)            |
| `.btn--success`            | `.sample-button`                                                      | green, which has a meaning, so it stays distinct     |
| `.btn--lg` / `.btn--block` | size and full-width one-offs                                          | modifiers instead of new classes                     |

Buttons have one padding scale and one hover: `translateY(-2px)` plus a deeper `--shadow-action`.
The hover gradient that reversed direction is gone.

### Cards: duplicate merged, done (generic `.card` class deferred)

`.explore-card` and `.home-card` were **identical**. They now share one rule, the "Surface card"
block in `styles.css`. That rule uses `var(--surface)`, `var(--r-md)`, `var(--elev-2)`, and
`var(--space-3)`. The two classes can no longer drift apart.

The larger surfaces (`.table-section`, `.contact-form`, `.contact-info`, `home-content`) share the
same frosted look. They differ in padding, shadow, and extras, and they **already use tokens** with
no raw literals. A single generic `.card` or `.card--lg` base would mean adding the class
throughout the templates for a small gain. So that work is **deferred on purpose**. It is not
open debt. If a future change touches these surfaces anyway, this table is the target:

| Class                | Tokens                                             | Would replace                                  |
| -------------------- | -------------------------------------------------- | ---------------------------------------------- |
| `.card`              | `--surface`, `--r-md`, `--elev-2`, `--space-3` pad | explore-card, home-card (already merged)       |
| `.card--lg`          | `--r-lg`, `--elev-3`, `--space-4` pad              | table-section, home-content, contact-form/info |
| `.card--interactive` | adds hover lift                                    | explore-card behavior                          |
| status borders       | `--success`/`--danger` left/edge                   | distance-close/far (already semantic, keep)    |

### Eyebrow: duplicate shared, done

`.eyebrow` is the base treatment. It uses `--fs-caption`, weight 500, `0.06em`, and uppercase. `.home-badge`
and `.home-premium__eyebrow` are grouped onto it. They add only their own margin and accent color.

The templates keep emitting the named variants **by design**. The CSS comment says so. They
are context variants of one base. New markup should use `.eyebrow`.

---

## 3. Foundations: list of inconsistencies

> The line numbers from the original audit moved during the refactor, so this list omits
> them. A check mark (✅) marks a resolved item. To find current uses, grep for the token or
> literal.

**Gradients (copied literals replaced by tokens):** ✅ done

- The brand blue gradient is now `var(--grad-brand)`. No raw literals remain. The token has 7
  uses.
- The navy chrome gradient is now `var(--grad-chrome)`.

**Strokes:**

- ✅ **The footer no longer uses `border-image`.** It uses the `background-clip`
  padding-box/border-box technique from `header`, so the brand stroke follows the rounded corners.
- ✅ **The three dividers stay separate on purpose.** A review found them to be separate
  components:
  - `.dropdown-divider`: a 1px navy separator _inside the dark menu_
  - the `.legend-section h2` border-bottom: a 2px blue _heading underline_, that is, typography
  - `.product-divider`: a 4px blue centered _section `<hr>`_

  All three already use tokens (`--navy-700`, `--blue-500`). A shared `.divider` class would
  couple unrelated components and remove no real duplication. Leave them as they are.

- Left-border accents are fine where they have a meaning (`.urgency-note` amber,
  `.premium-intro-box`). Keep them, and do not add them to plain cards.

**Color near-duplicates:** ✅ done. True near-duplicates are merged, and distinct accents stay.

- `#555`, `#2ecc71`, `#777` (2 uses), `#888`, and `#aaa` moved onto the ramp as
  `--text-3/4`.
- Border grays merged: `#e0e0e0` (3 uses) and `#dee2e6` became `--border`. Each channel moved by
  1 to 8, which no one can see.
- **These colors stay raw on purpose. They are distinct colors and NOT near-duplicates, so do not
  "fix" them:**
  - The warm-accent family: `#fef9e7`, `#f39c12`, and `#d68910` (premium honor section),
    `#d4a017` (NCAA-verified gold), and `#c75b12` (audience-card rust). Each is a single-use
    accent with a meaning. A token for each would add colors to the palette with no reuse.
  - `#93a1b0`: a desaturated blue-gray for the struck-through price, tuned for the dark navy band.
    A `--text-*` token is a neutral gray and would lose the blue tint.
  - `#229954`: the dark stop of `--grad-success`. It is part of a gradient definition and was
    never a stray literal.
  - `#e9ecef`: the **surface tint** of the table zebra stripes. It belongs to a light-surface
    family with `#f8f9fa` and `#f5f5f5` that has no tokens yet. Tokens for that family
    (`--surface-2/3`) are a separate task. They were out of scope for the near-duplicate pass.
    The color is mostly a background, and rarely a border.

**Radius:** ⬜ mostly done. The large outliers (6px, 20px) now use `--r-*`. A few raw values
remain. `3px`, `4px`, and `10px` have 2 uses each. They have low priority. Move them to tokens
when a change touches that code.

**Shadows:** ✅ done. **Every `box-shadow` resolves to a token**, in the "Shadow system" block of
`:root`.

- Neutral elevation is a ladder of weights: `--elev-0..3` and `--elev-modal`.
- Shadows outside that ladder have tokens named for their role:
  - `--elev-bar`: nav and header
  - `--elev-top`: footer
  - `--elev-menu`: dropdowns
  - `--elev-inset`: progress track
  - `--elev-drawer`: mobile slide-in
  - `--elev-hover`: generic hover lift
- Colored shadows have meanings:
  - `--shadow-action` and `-hover`
  - `--shadow-success` and `-hover`
  - `--shadow-gold`
  - `--shadow-focus`, the compound input focus ring, used as `var(--shadow-focus), var(--elev-1)`
  - `--glow-blue`, a small brand accent
  - `--glow-success/-warning/-danger`, for the command-palette status-pulse keyframes
- Components reuse these tokens. A card hover lifts to `--elev-3`. Each button color has a rest
  and hover pair.
- _Close matches moved to tokens._ Each shift is too small to see, and the user chose them:
  - the premium band `40px/22%` became `--elev-3`
  - the faq `/5%`, the audience-card legacy `rgba()`, and the report-card `/10%` became
    `--elev-0` or `--elev-1`
  - the `/40%` blue glows became `--glow-blue`
  - the focus-ring alphas (`10/12%`) became `--shadow-focus` `/20%`
  - the `0 4px 20px` `/10%` callouts became `--elev-bar` `/15%`
- _Out of scope (kept raw):_
  - The palette and modal **white hairline**, `0 0 0 1px rgb(255 255 255 /10%)`, stays raw. It
    is a 1px border ring that pairs with `var(--elev-modal)`.
  - Two one-off **`text-shadow`s**: hero title depth and an orange text glow. `text-shadow` is a
    separate property outside the elevation system.

**Type:** ✅ one font stack. The plan for the 30+ ad-hoc sizes and the mixed px and rem was to map
them to `--text-*`. Weights 500, 600, 700, and 800 had no rule. The plan set these weights:

- body: 400
- links and labels: 500
- h2, h3, and buttons: 600
- h1 and eyebrow: 700
- hero and price: 800

**Icons:** ✅ mostly done. A deliberate inline SVG icon set replaced the emoji in the
`config/pages.json` premium features (`featureIcon` in `build.js`). The command palette uses the
same approach. Small differences remain, and they are acceptable with low priority:

- select-arrow SVG data URIs at two sizes
- HTML entities (`→` `↓` `▾`) and CSS `content` (`✓`) for small glyphs

---

## 4. Status and remaining debt

The staged plan (phases 0 to 5) is complete in practice. Each item has a final state. It is done,
or a documented decision keeps or defers it. No item is left open.

| Phase | Item                                                                          | Status                                                                        |
| ----- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| 0     | **Tokens**: `:root` block, no visual change                                   | ✅ done                                                                       |
| 1     | **Buttons**: one `.btn` system with `:focus-visible` and a single `:disabled` | ✅ done (legacy classes grouped instead of renamed, see §2)                   |
| 2     | **Cards**: merge the identical `.explore-card` and `.home-card`               | ✅ done (shared rule). Generic `.card`/`.card--lg` class **deferred**, see §2 |
| 3     | **Strokes**: footer `border-image` replaced by `background-clip`              | ✅ done                                                                       |
| 3     | **Dividers**: unify the three divider treatments                              | ✅ resolved. **Kept separate on purpose** (separate components, see §3)       |
| 3     | **Eyebrow**: single `.eyebrow`                                                | ✅ done (base plus context variants by design)                                |
| 4     | **Gradients**: literals replaced by `--grad-*`                                | ✅ done                                                                       |
| 4     | **Color cleanup**: merge near-duplicate grays and borders                     | ✅ done. Distinct accents kept on purpose (see §3)                            |
| 4     | **reports.css / command-palette.css** use tokens                              | ✅ done                                                                       |
| 5     | **Icons**: single deliberate approach                                         | ✅ mostly done (inline SVG set)                                               |

**Deferred on purpose.** These are judgment calls, and they are not debt:

1. A generic `.card` or `.card--lg` class for the large surfaces. They already use tokens, so the
   change would cost more than it gains.
2. A `--surface-2/3` token family for the light-surface tints (`#e9ecef`, `#f8f9fa`, `#f5f5f5`).
3. Tokens for the single-use warm-accent literals.

Do one of these **only if** a change already touches that area. The running ledger is in
`docs/refactor-followup-plan.md`.

**Check when you start one of these items:**

1. Run `npm run build`.
2. Compare one page of each type before and after. Use the home page, a table page such as npi,
   premium, contact, and success.
3. Confirm _zero_ intended visual change. That is the goal for the remaining cleanups. The
   near-duplicate color merge accepted a shift too small to see on a few muted grays. Its commit
   has the details.
