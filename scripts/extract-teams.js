#!/usr/bin/env node

/**
 * Extract Teams and Conferences Script
 *
 * This script extracts unique team and conference combinations from the data files
 * and generates a structured teams.json file for use in the premium page dropdown.
 * The output is organized by conference with teams as selectable options.
 */

const fs = require('fs');
const path = require('path');

// Read the publishingTracker data file
const dataPath = path.join(__dirname, '../data/publishingTracker.json');
const outputPath = path.join(__dirname, '../data/teams.json');

try {
  const rawData = fs.readFileSync(dataPath, 'utf8');
  const data = JSON.parse(rawData);

  // Create a map of conferences to teams
  const conferenceMap = {};

  data.forEach(item => {
    const conf = item.Conf;
    const team = item.Team;

    if (!conferenceMap[conf]) {
      conferenceMap[conf] = [];
    }

    // Add team if not already in the conference list
    if (!conferenceMap[conf].includes(team)) {
      conferenceMap[conf].push(team);
    }
  });

  // Sort conferences alphabetically
  const sortedConferences = Object.keys(conferenceMap).sort();

  // Create the output structure
  const output = sortedConferences.map(conf => ({
    conference: conf,
    teams: conferenceMap[conf].sort(), // Sort teams alphabetically within conference
  }));

  // Write to teams.json
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

  console.log('✅ Successfully extracted teams and conferences');
  console.log(`📁 Output written to: ${outputPath}`);
  console.log(`📊 Total conferences: ${output.length}`);
  console.log(
    `👥 Total teams: ${output.reduce((sum, conf) => sum + conf.teams.length, 0)}`
  );
} catch (error) {
  console.error('❌ Error extracting teams:', error.message);
  process.exit(1);
}
