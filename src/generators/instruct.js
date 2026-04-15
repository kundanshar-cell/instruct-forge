const Anthropic = require('@anthropic-ai/sdk');

// ── Task definitions ──────────────────────────────────────────────────────────
// Each task type has a prompt template that tells Claude what kind of
// instruction-output pairs to generate from the supplied data row.

const TASK_PROMPTS = {
  qa: `Generate question-and-answer pairs about this data record.
Each question should be answerable from the data alone.
Vary question style: factual lookups, comparisons, yes/no, "what if" scenarios.`,

  extraction: `Generate instruction-output pairs that practise field extraction.
Instructions should ask Claude to extract or identify specific fields.
Outputs should be the exact field value(s) from the data.`,

  classification: `Generate instruction-output pairs that practise classification.
Instructions should ask Claude to classify, categorise, or label the record.
Outputs should be a short category label or explanation.`,

  summarisation: `Generate instruction-output pairs that practise summarisation.
Instructions should ask Claude to summarise or describe the record in plain language.
Outputs should be a concise 1-3 sentence summary.`,
};

// ── Cached system prompt (sent once, reused across batch calls) ───────────────
const SYSTEM_PROMPT = `You are an expert at creating instruction-tuning datasets for fine-tuning language models.
Given a structured data record and a task type, you generate high-quality training pairs.

Rules:
1. Each pair must be fully self-contained — the instruction and output must make sense without external context.
2. Instructions must be natural, varied, and realistic — as a real user might phrase them.
3. Outputs must be accurate, grounded strictly in the provided data. Never invent values.
4. Return ONLY a JSON array. No commentary, no markdown fences, no extra text.

Output format:
[
  { "instruction": "...", "input": "...", "output": "..." },
  ...
]

The "input" field should contain the relevant data context if the instruction refers to specific data.
Leave "input" as an empty string "" only if the instruction is fully self-contained.`;

// ── Main generator ────────────────────────────────────────────────────────────

/**
 * Generate instruction-tuning pairs for a batch of rows.
 *
 * @param {object[]} rows        - Array of data objects
 * @param {string[]} tasks       - e.g. ['qa', 'extraction']
 * @param {number}   pairsPerRow - Number of pairs per row per task
 * @param {object}   options
 * @param {string}   options.model
 * @param {boolean}  options.verbose
 * @returns {Promise<object[]>}  - Flat array of { instruction, input, output }
 */
async function generatePairs(rows, tasks, pairsPerRow, options = {}) {
  const model   = options.model   || 'claude-haiku-4-5-20251001';
  const verbose = options.verbose || false;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set.');
  }

  const client = new Anthropic({ apiKey });

  const allPairs = [];

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];
    const rowJson = JSON.stringify(row, null, 2);

    for (const task of tasks) {
      const taskPrompt = TASK_PROMPTS[task];
      if (!taskPrompt) {
        throw new Error(`Unknown task "${task}". Valid tasks: ${Object.keys(TASK_PROMPTS).join(', ')}`);
      }

      if (verbose) {
        process.stderr.write(`  row ${rowIndex + 1}/${rows.length} · task=${task}\n`);
      }

      const userMessage = `Task: ${task}
${taskPrompt}

Generate exactly ${pairsPerRow} instruction-tuning pairs for the following data record:

\`\`\`json
${rowJson}
\`\`\``;

      let responseText;
      try {
        const response = await client.messages.create({
          model,
          max_tokens: 2048,
          system: [
            {
              type: 'text',
              text: SYSTEM_PROMPT,
              // Cache the system prompt — it never changes between calls
              cache_control: { type: 'ephemeral' },
            },
          ],
          messages: [
            { role: 'user', content: userMessage },
          ],
        });
        responseText = response.content[0].text;
      } catch (err) {
        process.stderr.write(`  [warn] API error for row ${rowIndex + 1}, task=${task}: ${err.message}\n`);
        continue;
      }

      // Parse the JSON array Claude returned
      let pairs;
      try {
        // Strip markdown fences if Claude wrapped the JSON anyway
        const cleaned = responseText
          .replace(/^```(?:json)?\s*/i, '')
          .replace(/\s*```$/, '')
          .trim();
        pairs = JSON.parse(cleaned);
        if (!Array.isArray(pairs)) throw new Error('Response is not a JSON array');
      } catch (err) {
        process.stderr.write(`  [warn] Could not parse response for row ${rowIndex + 1}, task=${task}: ${err.message}\n`);
        if (verbose) process.stderr.write(`  Raw: ${responseText.slice(0, 200)}\n`);
        continue;
      }

      allPairs.push(...pairs);
    }
  }

  return allPairs;
}

module.exports = { generatePairs };
