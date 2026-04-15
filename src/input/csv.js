const fs = require('fs');
const { parse } = require('csv-parse/sync');

/**
 * Read a CSV file and return an array of row objects.
 * Headers become object keys.
 */
function readCsv(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  return parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
}

module.exports = { readCsv };
