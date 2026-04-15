const fs = require('fs');

/**
 * ChatML format: { "messages": [{ "role": "user", "content": "..." }, { "role": "assistant", "content": "..." }] }
 * Write pairs to a JSONL file (one JSON object per line).
 */
function writeChatml(pairs, filePath) {
  const lines = pairs.map(p => JSON.stringify({
    messages: [
      { role: 'user', content: p.input ? `${p.instruction}\n\n${p.input}` : p.instruction },
      { role: 'assistant', content: p.output },
    ],
  }));
  fs.writeFileSync(filePath, lines.join('\n') + '\n', 'utf8');
}

function appendChatml(pairs, filePath) {
  const lines = pairs.map(p => JSON.stringify({
    messages: [
      { role: 'user', content: p.input ? `${p.instruction}\n\n${p.input}` : p.instruction },
      { role: 'assistant', content: p.output },
    ],
  }));
  fs.appendFileSync(filePath, lines.join('\n') + '\n', 'utf8');
}

module.exports = { writeChatml, appendChatml };
