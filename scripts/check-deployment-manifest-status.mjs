#!/usr/bin/env node
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const defaultManifestPath = 'infra/stable/DEPLOYMENT_MANIFEST.md';
const cliArgs = process.argv.slice(2);
const escalate = cliArgs.includes('--escalate');
const manifestArg = cliArgs.find((arg) => !arg.startsWith('--'));
const manifestPath = manifestArg ?? defaultManifestPath;
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

function toTimestampSlug(timestampIso) {
  return timestampIso.replace(/[:.]/g, '-');
}

function createEscalationArtifact(reason) {
  const timestamp = new Date().toISOString();
  const escalationDir = '.squad/work-routing/escalations';
  const fileName = `deployment-manifest-${toTimestampSlug(timestamp)}.md`;
  const artifactPath = `${escalationDir}/${fileName}`;
  const owner = 'Neo';
  const nextAction = 'Triage deployment blockers and update deployment manifest status with remediation details.';
  const sla = '4h triage SLA from escalation timestamp.';

  mkdirSync(escalationDir, { recursive: true });

  const artifact = [
    '# Deployment Manifest Escalation',
    '',
    `- Timestamp: ${timestamp}`,
    `- Reason: ${reason}`,
    `- Source Manifest: ${manifestPath}`,
    `- Assigned Owner: ${owner}`,
    `- SLA/Next Action: ${sla} ${nextAction}`,
    '',
  ].join('\n');

  writeFileSync(artifactPath, artifact, 'utf8');

  const handoffLogPath = '.squad/work-routing/handoffs.log';
  const handoffEntry = [
    '---',
    `Cycle: ${timestamp}`,
    'From: DeploymentManifestGate',
    `To: ${owner}`,
    'Status: ESCALATED',
    `Source: ${manifestPath}`,
    `Reason: ${reason}`,
    `SLA: ${sla}`,
    `Next: ${nextAction}`,
    `Escalation Artifact: ${artifactPath}`,
  ].join('\n');
  appendFileSync(handoffLogPath, `\n${handoffEntry}\n`, 'utf8');

  return { artifactPath, owner };
}

function fail(reason, details = []) {
  let escalationResult;
  if (escalate) {
    try {
      escalationResult = createEscalationArtifact(reason);
    } catch (error) {
      details = [...details, `Escalation write failed: ${String(error)}`];
    }
  }

  console.error(`::error title=Deployment Manifest Gate Failed::${reason}`);
  console.error(reason);
  for (const line of details) {
    console.error(line);
  }
  if (escalationResult) {
    console.error(`Escalation artifact created: ${escalationResult.artifactPath}`);
    console.error(`Assigned owner: ${escalationResult.owner}`);
  }
  appendStepSummary([
    '## Deployment Manifest Gate Result',
    '',
    '**Status:** FAILED',
    '',
    `**Reason:** ${reason}`,
    '',
    ...details.map((line) => `- ${line}`),
    ...(escalationResult
      ? [
          '',
          `- Escalation artifact: ${escalationResult.artifactPath}`,
          `- Assigned owner: ${escalationResult.owner}`,
        ]
      : []),
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
