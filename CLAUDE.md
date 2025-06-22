# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

## Development Workflow

### Testing Changes

Since this is a static site, test changes by:
1. Opening HTML files directly in a browser, or
2. Using a local web server: `python -m http.server 8000` or `npx serve`
3. Testing mobile responsiveness using browser dev tools

### Making Changes

- **Styling**: Edit `styles.css` for visual changes
- **JavaScript**: Edit `script.js` for interactive functionality
- **Content**: Edit individual HTML files for page-specific content
- **Navigation**: Update all HTML files when changing navigation structure

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
3. Verify mobile navigation still functions properly

## Deployment

This site is deployed via GitHub Pages, so changes pushed to the main branch are automatically deployed. No build process is required.