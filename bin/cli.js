#!/usr/bin/env node
'use strict';

const path    = require('path');
const fs      = require('fs');
const { program } = require('commander');

const { readCsv }        = require('../src/input/csv');
const { readJson }       = require('../src/input/json');
const { generatePairs }  = require('../src/generators/instruct');
const { appendAlpaca }   = require('../src/output/alpaca');
const { appendChatml }   = require('../src/output/chatml');
const { chunk }          = require('../src/utils/batcher');

const pkg = require('../package.json');

program
  .name('instruct-forge')
  .version(pkg.version)
  .description('Generate instruction-tuning datasets (JSONL) from structured data using Claude')
  .requiredOption('-i, --input <file>',         'Input file (CSV or JSON)')
  .option('-t, --tasks <tasks>',                'Comma-separated task types: qa,extraction,classification,summarisation', 'qa')
  .option('-f, --format <format>',              'Output format: alpaca | chatml', 'alpaca')
  .option('-p, --pairs-per-row <n>',            'Training pairs per row per task', '5')
  .option('-b, --batch-size <n>',               'Rows processed per Claude call', '5')
  .option('-o, --output <file>',                'Output JSONL file', 'training.jsonl')
  .option('-m, --model <model>',                'Claude model to use', 'claude-haiku-4-5-20251001')
  .option('--limit <n>',                        'Only process the first N rows (useful for testing)')
  .option('-v, --verbose',                      'Print progress to stderr')
  .parse(process.argv);

const opts = program.opts();

async function main() {
  // ── Load input ─────────────────────────────────────────────────────────────
  const inputPath = path.resolve(opts.input);
  if (!fs.existsSync(inputPath)) {
    console.error(`Error: input file not found: ${inputPath}`);
    process.exit(1);
  }

  const ext = path.extname(inputPath).toLowerCase();
  let rows;
  if (ext === '.csv') {
    rows = readCsv(inputPath);
  } else if (ext === '.json') {
    rows = readJson(inputPath);
  } else {
    console.error(`Error: unsupported file type "${ext}". Use .csv or .json`);
    process.exit(1);
  }

  if (opts.limit) {
    rows = rows.slice(0, parseInt(opts.limit, 10));
  }

  const tasks       = opts.tasks.split(',').map(t => t.trim()).filter(Boolean);
  const pairsPerRow = parseInt(opts.pairsPerRow, 10);
  const batchSize   = parseInt(opts.batchSize, 10);
  const outputPath  = path.resolve(opts.output);

  // Clear/create output file
  fs.writeFileSync(outputPath, '', 'utf8');

  const append = opts.format === 'chatml' ? appendChatml : appendAlpaca;

  if (opts.verbose || true) {
    process.stderr.write(`instruct-forge v${pkg.version}\n`);
    process.stderr.write(`  input      : ${inputPath} (${rows.length} rows)\n`);
    process.stderr.write(`  tasks      : ${tasks.join(', ')}\n`);
    process.stderr.write(`  pairs/row  : ${pairsPerRow} × ${tasks.length} task(s) = ${pairsPerRow * tasks.length} per row\n`);
    process.stderr.write(`  format     : ${opts.format}\n`);
    process.stderr.write(`  model      : ${opts.model}\n`);
    process.stderr.write(`  output     : ${outputPath}\n`);
    process.stderr.write(`  batch size : ${batchSize}\n\n`);
  }

  // ── Process in batches ─────────────────────────────────────────────────────
  const batches    = chunk(rows, batchSize);
  let totalPairs   = 0;
  let batchNum     = 0;

  for (const batch of batches) {
    batchNum++;
    if (opts.verbose) {
      process.stderr.write(`Batch ${batchNum}/${batches.length} (${batch.length} rows)...\n`);
    }

    const pairs = await generatePairs(batch, tasks, pairsPerRow, {
      model   : opts.model,
      verbose : opts.verbose,
    });

    if (pairs.length > 0) {
      append(pairs, outputPath);
      totalPairs += pairs.length;
    }

    process.stderr.write(`  → batch ${batchNum}/${batches.length} done · ${pairs.length} pairs written (total: ${totalPairs})\n`);
  }

  process.stderr.write(`\nDone. ${totalPairs} pairs written to ${outputPath}\n`);
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
