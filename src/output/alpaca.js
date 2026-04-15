const fs = require('fs');

/**
 * Alpaca format: { "instruction": "...", "input": "...", "output": "..." }
 * Write pairs to a JSONL file (one JSON object per line).
 */
function writeAlpaca(pairs, filePath) {
  const lines = pairs.map(p => JSON.stringify({
    instruction: p.instruction,
    input: p.input || '',
    output: p.output,
  }));
  fs.writeFileSync(filePath, lines.join('\n') + '\n', 'utf8');
}

function appendAlpaca(pairs, filePath) {
  const lines = pairs.map(p => JSON.stringify({
    instruction: p.instruction,
    input: p.input || '',
    output: p.output,
  }));
  fs.appendFileSync(filePath, lines.join('\n') + '\n', 'utf8');
}

module.exports = { writeAlpaca, appendAlpaca };
