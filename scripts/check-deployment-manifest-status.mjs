#!/usr/bin/env node
import { appendFileSync, readFileSync } from 'node:fs';

const manifestPath = process.argv[2] ?? 'infra/stable/DEPLOYMENT_MANIFEST.md';
const failingStatuses = ['failed', 'pending'];

function normalizeStatus(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function appendStepSummary(lines) {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryPath) {
    return;
  }

  try {
    appendFileSync(summaryPath, `${lines.join('\n')}\n`);
  } catch {
    // Ignore summary write errors.
  }
}

function fail(reason, details = []) {
  console.error(`::error title=Deployment Manifest Gate Failed::${reason}`);
  console.error(reason);
  for (const line of details) {
    console.error(line);
  }
  appendStepSummary([
    '## Deployment Manifest Gate Result',
    '',
    '**Status:** FAILED',
    '',
    `**Reason:** ${reason}`,
    '',
    ...details.map((line) => `- ${line}`),
  ]);
  process.exit(1);
}

let manifest;
try {
  manifest = readFileSync(manifestPath, 'utf8');
} catch (error) {
  fail(`Cannot read deployment manifest at ${manifestPath}`, [String(error)]);
}

const lines = manifest.split(/\r?\n/);
const row = lines.find((line) => /^\|\s*Container Apps\s*\|/i.test(line));

if (!row) {
  fail('Container Apps status row was not found in deployment manifest.', [
    `Expected a table row beginning with "| Container Apps |" in ${manifestPath}`,
  ]);
}

const columns = row.split('|').map((part) => part.trim());
const statusRaw = columns[2] ?? '';
const status = normalizeStatus(statusRaw);

if (!status) {
  fail('Container Apps status is empty in deployment manifest.', [`Row: ${row}`]);
}

const matchingFailure = failingStatuses.find((value) => status.includes(value));

if (matchingFailure) {
  const reason = `Container Apps deployment status is "${statusRaw}" (blocked: ${matchingFailure}).`;
  fail(reason, [
    `Manifest: ${manifestPath}`,
    'Action required: update deployment state before merging/deploying.',
  ]);
}

console.log(`Deployment manifest gate passed: Container Apps status is "${statusRaw}".`);
appendStepSummary([
  '## Deployment Manifest Gate Result',
  '',
  '**Status:** PASSED',
  '',
  `- Manifest: ${manifestPath}`,
  `- Container Apps status: ${statusRaw}`,
]);
