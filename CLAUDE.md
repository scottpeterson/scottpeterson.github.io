# CLAUDE.md

<!-- ste-allow: IBM -->

Claude Code (claude.ai/code) reads these instructions when it works with code in this repository.

## Project Overview

This is a static HTML website for a D3 Women's Basketball Statistics Warehouse. The site is hosted on GitHub Pages and provides basketball statistics across multiple pages with data visualization tables.

## Architecture

- **Static Site**: Pure HTML/CSS/JavaScript with no build process
- **Multi-page Structure**: 12 pages total (index.html + page1-11.html)
- **Shared Components**: Common navigation, styling, and JavaScript functionality across all pages
- **Mobile-first Design**: Responsive navigation with hamburger menu for mobile devices

### Key Files

- `index.html` - Main landing page with sample team statistics
- `page1.html` through `page11.html` - Individual statistics pages (Conference Stats, Team Rankings, etc.)
- `styles.css` - Global CSS with responsive design and mobile navigation
- `script.js` - JavaScript for mobile navigation, search/filter functionality, and active page highlighting
- `README.md` - Basic project description

### Page Structure

All pages follow a consistent structure:

- Shared navigation header with logo and menu links
- Mobile hamburger menu with overlay
- Main content area with page-specific statistics tables
- Shared footer
- Common JavaScript functionality

### Navigation System

- **Desktop**: Horizontal navigation bar with all page links visible
- **Mobile**: Hamburger menu that slides in from the right with overlay
- **Active Page**: JavaScript automatically highlights the current page in navigation
- **Menu Behavior**: Closes automatically when links are clicked or overlay is tapped

### Table Functionality

Pages include interactive data tables with:

- Search functionality to filter teams by name
- Conference dropdown filter
- Sticky headers and first columns for better data visibility
- Responsive design for mobile viewing
- "No results" message when filters return empty results

## Design System

**Before any UI, CSS, or template change, read `docs/design-system.md`**. It is the catalog of
components and the design-token reference. The look & feel is intentional. Keep it consistent.

Rules (these override convenience):

- **Use the design tokens** defined in `:root` at the top of `styles.css`:
  - colors: `--navy-900`, `--blue-500`, `--orange-500`, and the text ramp `--text-1..4`
  - gradients: `--grad-brand`, `--grad-chrome`, `--grad-accent`
  - elevation: `--elev-1..3`
  - radius: `--r-sm/md/lg/pill`
  - type: `--font-sans`, `--font-mono`, and the `--fs-caption..h1` scale of 12, 14, 16, 20, 24, 32 px
  - spacing: `--space-1..5`

  **Never introduce a raw hex/rgb color, px radius, or one-off gradient/shadow when a token
  exists.** If a new value is needed, add a token instead of a literal.
- **Reuse components, don't fork them.** There is one button system (`.btn` + `.btn--*`), one
  card system (`.card` + modifiers), one `.eyebrow`. Do not create a new button/card class for a
  one-off. Use or extend the shared component.
- **Strokes are signal, used sparingly.** Rounded elements use the `background-clip`
  padding-box/border-box gradient technique (see `header` in `styles.css`), **never
  `border-image`** (it can't follow `border-radius`). Reserve left-border accents for genuine
  callouts (alerts/warnings), not default card chrome.
- **Match the type scale and the 8px spacing rhythm.** Do not add ad-hoc font sizes. Type is IBM
  Plex Sans (Plex Mono for code) at weights 400, 500, and 600. Use only that family and those weights.
- After CSS, template, or config changes, run `npm run build` and check the result locally. The
  build emits raw HTML. The pre-commit hook then formats it with prettier.

## Development Workflow

### Build System

This project uses a Node.js build system to generate HTML files from configuration:

- Run `npm run build` to regenerate all HTML files from `config/pages.json`
- The build system reads page configurations and generates corresponding HTML files
- Always run the build after you change `config/pages.json`

### Testing Changes

This is a static site. Test changes by:

1. Opening HTML files directly in a browser, or
2. Using a local web server: `python -m http.server 8000` or `npx serve`
3. Testing mobile responsiveness using browser dev tools

### Making Changes

- **Styling**: Edit `styles.css` for visual changes
- **JavaScript**: Edit `script.js` for interactive functionality
- **Page Configuration**: Edit `config/pages.json` for page-specific content, columns, legends, and metadata
- **Content**: NEVER directly edit generated HTML files (index.html, preseason_rankings.html, etc.) - they will be overwritten by the build system
- **Navigation**: Update all HTML files when changing navigation structure

**IMPORTANT**: All page content, table columns, legends, and metadata should be modified in `config/pages.json`, not in the generated HTML files. The HTML files are automatically generated by the build system and any direct edits will be lost when the build runs.

### Mobile Navigation

The mobile navigation system includes:

- Hamburger icon that transforms into a slide-out menu
- Aggressive hiding of hamburger during menu transitions to prevent visual glitches
- Overlay system to close menu when clicking outside
- Responsive design that switches between desktop and mobile layouts at 768px breakpoint

## Common Tasks

### Adding New Pages

1. Create new HTML file following the structure of existing pages
2. Update navigation links in ALL HTML files
3. Ensure JavaScript handles the new page for active link highlighting

### Modifying Table Data

1. Edit the HTML table structure in the target page
2. Ensure table maintains proper classes for styling and functionality
3. Test search and filter functionality with new data

### Updating Styles

1. Edit `styles.css` for visual changes
2. Test responsive behavior across different screen sizes
3. Check that mobile navigation still works

## Deployment

GitHub Pages serves the committed HTML directly, so the **hosting** needs no build step or CI
pipeline. Pushing to `main` publishes whatever HTML is in the repository.

That does **not** mean you can skip the build locally. The HTML files are generated artifacts.

After you edit `config/pages.json`, `templates/`, `build.js`, `styles.css`, or any input under
`data/`, run `npm run build`. When report inputs change, also run `npm run wrap-reports`. Then
commit the regenerated HTML. Nothing rebuilds in CI, so **the commit is the build**. If you
forget, the published site lags your source changes without any warning.

---

## Code Documentation Best Practices

### Add Comments on Tricky Parts

When you work in this codebase, **comment the code that is hard to follow**. The comments help you and future agents (including Claude) understand:

- Why certain approaches were chosen
- What edge cases are being handled
- Why seemingly redundant code is actually necessary
- Browser-specific workarounds or quirks
- Complex logic that isn't immediately obvious

Comments should explain **why** the code does something. The code already shows **what** it does.

### Document Intent to Protect Against Misguided Refactors

When creating new files or making significant changes, **add a section that explains the intent**. This protects the work from misguided refactors by:

- Clarifying the purpose of the file or feature
- Explaining what problem it solves
- Setting boundaries on when/how it should be used
- Preventing well-intentioned but incorrect "improvements"

This is especially important for:
- Configuration files
- Design system documents
- Build scripts
- Complex CSS that might look "redundant" but serves a purpose
