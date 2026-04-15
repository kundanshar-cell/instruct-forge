const fs = require('fs');

/**
 * Read a JSON file. Accepts either an array of objects or
 * an object with a single array property (e.g. { "vendors": [...] }).
 */
function readJson(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const parsed = JSON.parse(content);

  if (Array.isArray(parsed)) return parsed;

  // Unwrap single-key object: { "vendors": [...] }
  const keys = Object.keys(parsed);
  if (keys.length === 1 && Array.isArray(parsed[keys[0]])) {
    return parsed[keys[0]];
  }

  throw new Error(
    `JSON input must be an array of objects or an object wrapping a single array. ` +
    `Got: ${JSON.stringify(Object.keys(parsed))}`
  );
}

module.exports = { readJson };
