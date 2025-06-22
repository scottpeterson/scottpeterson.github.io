# Development Guide

## Refactored Architecture

This codebase has been refactored for better maintainability and ease of change. Here's the new structure:

### Directory Structure

```
├── templates/          # HTML templates
│   ├── base.html       # Main page template
│   └── table-page.html # Statistics table template
├── config/             # Configuration files
│   └── pages.json      # Page metadata and settings
├── data/               # JSON data files
│   ├── teams.json      # Team statistics
│   ├── conferences.json # Conference data
│   └── ...             # Other data files
├── js/                 # Modular JavaScript
│   ├── navigation.js   # Mobile navigation
│   ├── table-controls.js # Search/filter/sort
│   ├── data-loader.js  # Data loading
│   └── main.js         # App initialization
├── build.js            # Build system
└── package.json        # Project configuration
```

### Key Improvements

1. **Template System**: All HTML pages are generated from templates
2. **Data Separation**: Table data is stored in JSON files
3. **Configuration-Driven**: Page settings in `config/pages.json`
4. **Modular JavaScript**: Separated concerns into focused modules
5. **Build System**: Automated page generation

## Development Workflow

### Setup
```bash
npm install
```

### Build Pages
```bash
npm run build
```

### Development Server
```bash
npm start
```

### Adding New Pages

1. Add page configuration to `config/pages.json`:
```json
"page12": {
  "title": "New Stats",
  "heading": "New Statistics Page",
  "description": "Description of the new page",
  "sectionTitle": "New Data Section",
  "hasSearch": true,
  "searchPlaceholder": "Search for items...",
  "dataSource": "newdata",
  "columns": ["Column1", "Column2", "Column3"]
}
```

2. Create data file `data/newdata.json`:
```json
[
  {
    "column1": "value1",
    "column2": "value2",
    "conf": "CONFERENCE"
  }
]
```

3. Run build:
```bash
npm run build
```

### Updating Data

1. Export your Excel data to CSV
2. Convert CSV to JSON (use online tools)
3. Replace the appropriate file in `data/`
4. Rebuild: `npm run build`

### Modifying Styles

Edit `styles.css` directly - no rebuild needed for CSS changes.

### Customizing Templates

- Edit `templates/base.html` for page structure changes
- Edit `templates/table-page.html` for table layout changes
- Run `npm run build` after template changes

## Benefits of This Architecture

### Easy to Understand
- Clear separation of concerns
- Self-documenting structure
- Consistent patterns across all pages

### Easy to Change
- Add new pages by editing config
- Update all navigation in one place
- Modify table structure globally
- Single source of truth for data

### Maintenance
- No HTML duplication
- Centralized configuration
- Type-safe data loading
- Automated page generation

## Build System Commands

- `npm run build` - Generate all HTML pages
- `npm run dev` - Development mode (future: file watching)
- `npm run clean` - Clean generated files
- `npm run serve` - Start local server
- `npm start` - Build and serve

## Data File Schema

Each data file should follow this pattern:

```json
[
  {
    "team": "Team Name",        // Main identifier
    "conf": "CONFERENCE",       // Conference (for filtering)
    "otherField": "value"       // Additional data fields
  }
]
```

The build system automatically maps JSON fields to table columns based on header names.