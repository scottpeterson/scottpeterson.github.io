# Column Mapping Examples

## How the New Mapping System Works

You can now define exactly how your human-readable column headers map to JSON properties in `config/pages.json`.

## Example 1: Simple Mapping (Home Page)

**Human-readable headers:**
```json
"columns": ["Team Name", "Efficiency Rating", "National Rank", "Conference"]
```

**Maps to JSON properties:**
```json
"columnMappings": {
  "Team Name": "team",
  "Efficiency Rating": "adjEm", 
  "National Rank": "rank",
  "Conference": "conf"
}
```

**Your JSON can have any property names:**
```json
[
  {
    "team": "Scranton",
    "adjEm": 54.2,
    "rank": 2,
    "conf": "LAND"
  }
]
```

## Example 2: Complex Basketball Stats

**Human-readable headers:**
```json
"columns": [
  "Player Name", 
  "Points Per Game", 
  "Field Goal Percentage", 
  "Free Throw %", 
  "Conference"
]
```

**Maps to your JSON structure:**
```json
"columnMappings": {
  "Player Name": "playerName",
  "Points Per Game": "ppg",
  "Field Goal Percentage": "fgPct",
  "Free Throw %": "ftPct",
  "Conference": "conf"
}
```

**Your JSON structure:**
```json
[
  {
    "playerName": "Sarah Johnson",
    "ppg": 18.4,
    "fgPct": 0.485,
    "ftPct": 0.821,
    "conf": "NEWMAC"
  }
]
```

## Example 3: Excel-Friendly Naming

**Excel Column Headers (Human-readable):**
```
Team Name | Points Scored | Win Percentage | Conference Name
```

**JSON Properties (Code-friendly):**
```json
{
  "tm": "Scranton",
  "pts": 1847,
  "winPct": 0.875,
  "conference": "LAND"
}
```

**Mapping Configuration:**
```json
"columns": ["Team Name", "Points Scored", "Win Percentage", "Conference Name"],
"columnMappings": {
  "Team Name": "tm",
  "Points Scored": "pts", 
  "Win Percentage": "winPct",
  "Conference Name": "conference"
}
```

## Benefits

1. **Human-readable headers** - Your users see "Points Per Game" not "ppg"
2. **Flexible JSON keys** - Use whatever property names work for your data
3. **Excel compatibility** - Use natural column names from Excel exports
4. **Maintainability** - Clear mapping in one configuration file
5. **Fallback support** - System still tries to auto-match if no mapping provided

## Adding New Pages

1. Add your human-readable column headers to `columns` array
2. Add corresponding mappings to `columnMappings` object
3. Run `npm run build` to regenerate pages
4. Replace JSON data file with your Excel export

The system will handle the rest automatically!