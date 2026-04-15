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

## Step-by-step guide

### Step 1 — Get an Anthropic API key

Sign up at [console.anthropic.com](https://console.anthropic.com) and create an API key.
Set it as an environment variable (add this to your `.bashrc` / `.zshrc` to make it permanent):

```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

### Step 2 — Install instruct-forge

```bash
npm install -g instruct-forge
```

Or skip the install and use `npx` — it downloads and runs in one step:

```bash
npx instruct-forge --help
```

### Step 3 — Prepare your input data

Export your structured data as a **CSV or JSON file**. Any tabular export works — ERP system, spreadsheet, database query result.

Rules:
- CSV: first row must be column headers
- JSON: must be an array of objects `[{...}, {...}]`
- Each row becomes one unit of training data — richer rows produce better pairs
- Remove columns that are internal IDs with no semantic meaning (e.g. `ROW_ID`, `TIMESTAMP`)

Example CSV (`examples/vendors.csv` is included in this repo):
```
AccountNum,Name,Country,VATNum,Currency,PaymentTerms,Blocked,Category
V-000001,Acme Supplies Ltd,GB,GB123456789,GBP,Net30,No,Office Supplies
V-000002,Global Tech Inc,US,US987654321,USD,Net60,No,IT Hardware
```

### Step 4 — Run a test first (limit to 3 rows)

Before processing your full dataset, do a small test run to check the output quality:

```bash
instruct-forge \
  --input your-data.csv \
  --tasks qa \
  --pairs-per-row 3 \
  --limit 3 \
  --verbose \
  --output test.jsonl
```

Open `test.jsonl` and read through the pairs. Check:
- Are the instructions natural and varied?
- Are the outputs accurate and grounded in the data?
- Is the task type right for your use case?

Adjust `--tasks` and `--pairs-per-row` based on what you see.

### Step 5 — Run the full dataset

Once you're happy with the test output, run your full file:

```bash
instruct-forge \
  --input your-data.csv \
  --tasks qa,extraction,classification \
  --pairs-per-row 5 \
  --format alpaca \
  --output training.jsonl \
  --verbose
```

Progress is printed to stderr. The output file is written incrementally — if the run is interrupted, pairs generated so far are not lost.

### Step 6 — Inspect the output

Each line of `training.jsonl` is one training pair:

```json
{"instruction": "What currency does vendor V-000001 use?", "input": "{\"AccountNum\":\"V-000001\",\"Name\":\"Acme Supplies Ltd\",\"Currency\":\"GBP\",...}", "output": "GBP"}
{"instruction": "Summarise the payment terms for Acme Supplies Ltd.", "input": "{...}", "output": "Acme Supplies Ltd operates on Net30 payment terms, meaning invoices are due within 30 days."}
```

Count your pairs:
```bash
wc -l training.jsonl
```

### Step 7 — Fine-tune your local model

Feed `training.jsonl` into your preferred fine-tuning framework:

**[Axolotl](https://github.com/axolotl-ai-cloud/axolotl)** (recommended for Llama / Mistral):
```yaml
datasets:
  - path: training.jsonl
    type: alpaca
```

**[LLaMA-Factory](https://github.com/hiyouga/LLaMA-Factory)**:
```bash
llamafactory-cli train \
  --model_name_or_path meta-llama/Llama-3.2-3B \
  --dataset training.jsonl \
  --dataset_format alpaca
```

**[Unsloth](https://github.com/unslothai/unsloth)** (fast fine-tuning on consumer GPUs):
```python
from datasets import load_dataset
dataset = load_dataset("json", data_files="training.jsonl")
```

Use **ChatML format** (`--format chatml`) if your framework or model expects the messages array format instead of Alpaca.

## Quick start

```bash
export ANTHROPIC_API_KEY=sk-ant-...

npx instruct-forge \
  --input examples/vendors.csv \
  --tasks qa,extraction \
  --pairs-per-row 5 \
  --output training.jsonl \
  --verbose
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
