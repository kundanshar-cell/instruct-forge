# Contributing to instruct-forge

Thank you for your interest in contributing. All contributions are welcome — bug fixes, new task types, new output formats, documentation improvements, or example datasets.

## Getting started

```bash
git clone https://github.com/kundanshar-cell/instruct-forge.git
cd instruct-forge
npm install
```

Set your API key to run tests against the live API:
```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

## Ways to contribute

### Add a new task type
Task types live in `src/generators/instruct.js` in the `TASK_PROMPTS` object. Each task is a short prompt that tells Claude what kind of instruction-output pairs to generate.

```js
// Example: add a 'translation' task
translation: `Generate instruction-output pairs that practise field-level translation.
Instructions should ask Claude to translate a field value or label into plain language.
Outputs should be a clear, jargon-free explanation of the field's meaning.`,
```

Then add it to the task list in the README.

### Add a new output format
Output writers live in `src/output/`. Each file exports a `write<Format>` and `append<Format>` function that takes an array of `{ instruction, input, output }` pairs and a file path.

Copy `src/output/alpaca.js` as a starting point, then wire it up in `bin/cli.js`.

### Add an example dataset
Example input files live in `examples/`. Add a CSV or JSON file with realistic domain data and a short comment at the top explaining the domain and fields. Good examples:
- Purchase orders
- Invoice headers
- Employee records
- Product catalogue / SKU list
- Contract metadata

### Improve the system prompt
The system prompt in `src/generators/instruct.js` controls output quality. If you find that certain task types produce poor pairs for a specific domain, open an issue with examples and a proposed improvement.

## Pull request guidelines

- Keep PRs focused — one feature or fix per PR
- Test your change with `--limit 5` before submitting
- Update the README if you add a task type, output format, or example
- No new dependencies without discussion first

## Reporting issues

Open a GitHub issue with:
- Your input file structure (column names, not real data)
- The command you ran
- The unexpected output or error

## Code style

- Plain Node.js — no TypeScript, no build step
- `require` / `module.exports` (CommonJS, matching the existing codebase)
- Keep functions small and single-purpose
- Comments where the logic isn't obvious
