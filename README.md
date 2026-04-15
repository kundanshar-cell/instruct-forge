# instruct-forge

Generate instruction-tuning datasets (JSONL) from structured data using Claude — for fine-tuning local LLMs on your own domain data.

## What problem does this solve?

General-purpose LLMs (GPT, Claude, Llama) are trained on the open internet. They struggle with domain-specific structured data: ERP records, procurement tables, inventory exports, financial ledgers. Fine-tuning a smaller local model (Mistral, Phi, Llama 3) on your domain makes it faster, cheaper, and more accurate for your specific use case.

The challenge is **creating the training data**. Writing thousands of instruction-output pairs by hand is impractical.

instruct-forge solves this using a **teacher-student distillation** approach:
1. You provide your structured data (CSV or JSON export from any system)
2. Claude (the "teacher") reads each record and generates realistic, high-quality instruction-output pairs
3. You train your local model (the "student") on those pairs
4. The student learns to answer questions, extract fields, classify records, and summarise data — in your domain's language

## What datasets can you build?

instruct-forge works with any structured, tabular data. Common use cases:

| Domain | Example input | What you train the model to do |
|---|---|---|
| Procurement / ERP | Vendor master, purchase orders, invoices | Answer supplier queries, extract payment terms, flag anomalies |
| Finance | GL entries, cost centres, budgets | Classify spend, summarise transactions, answer "what was spent on X?" |
| HR | Employee records, job grades, org structure | Answer HR queries, extract role info, classify leave types |
| Healthcare | Patient records, clinical codes, drug lists | Extract diagnoses, classify procedures, answer clinical Q&A |
| Legal / Contracts | Contract metadata, clauses, parties | Extract key dates, classify contract type, summarise obligations |
| Inventory | SKU catalogue, stock levels, suppliers | Answer product queries, classify items, summarise availability |

The generated JSONL file is ready to feed directly into fine-tuning pipelines for Hugging Face Transformers, Axolotl, LLaMA-Factory, Unsloth, or any framework that accepts Alpaca or ChatML format.

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
