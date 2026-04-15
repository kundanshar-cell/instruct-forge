# instruct-forge

Generate instruction-tuning datasets (JSONL) from structured data using Claude.

Feed in a CSV or JSON file, choose task types, and instruct-forge calls Claude to produce high-quality training pairs — ready to fine-tune a local LLM.

## Quick start

```bash
# Set your API key
export ANTHROPIC_API_KEY=sk-ant-...

# Run on the example vendor file
npx instruct-forge \
  --input examples/vendors.csv \
  --tasks qa,extraction \
  --format alpaca \
  --pairs-per-row 5 \
  --output training.jsonl
```

## Install

```bash
npm install -g instruct-forge
# or just use npx instruct-forge
```

## Options

| Flag | Default | Description |
|---|---|---|
| `-i, --input <file>` | required | CSV or JSON input file |
| `-t, --tasks <list>` | `qa` | Comma-separated tasks: `qa`, `extraction`, `classification`, `summarisation` |
| `-f, --format <fmt>` | `alpaca` | Output format: `alpaca` or `chatml` |
| `-p, --pairs-per-row <n>` | `5` | Training pairs generated per row per task |
| `-b, --batch-size <n>` | `5` | Rows per Claude call |
| `-o, --output <file>` | `training.jsonl` | Output JSONL file |
| `-m, --model <model>` | `claude-haiku-4-5-20251001` | Claude model to use |
| `--limit <n>` | — | Process only first N rows (for testing) |
| `-v, --verbose` | `false` | Print row-level progress to stderr |

## Task types

| Task | What it generates |
|---|---|
| `qa` | Question-answer pairs grounded in the data |
| `extraction` | Instructions to extract specific fields |
| `classification` | Instructions to classify or categorise the record |
| `summarisation` | Instructions to summarise the record in plain language |

## Output formats

### Alpaca (default)
```json
{"instruction": "What is the payment term for vendor V-000001?", "input": "{...vendor record...}", "output": "Net30"}
```

### ChatML
```json
{"messages": [{"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}]}
```

## How it works

1. Reads rows from your CSV/JSON file
2. Processes rows in batches (configurable)
3. For each row × task, calls Claude with the row data
4. The system prompt is [prompt-cached](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching) — you only pay for it once per batch
5. Parsed JSON pairs are written to your output JSONL file as they arrive

## Cost estimate

Using the default `claude-haiku-4-5` model at $1/M input tokens:
- ~500 input tokens per row (system prompt cached after first call)
- ~500 output tokens per row for 5 pairs
- **1000 rows with qa+extraction = ~$1–2**

## Requirements

- Node.js 18+
- `ANTHROPIC_API_KEY` environment variable

## License

MIT
