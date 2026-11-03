import { readdirSync, readFileSync, writeFileSync, mkdirSync, cpSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export function validateRepeat(value) {
  if (!/^(?:[1-9]|10)$/.test(value ?? '')) throw new Error('REPEAT_EACH must be an integer from 1 to 10');
  return value;
}

export function readJSON(file) {
  return JSON.parse(readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
}

export function findRuns(root) {
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const file = join(root, entry.name);
    return entry.isDirectory() ? findRuns(file) : entry.name === 'run-manifest.json' ? [root] : [];
  });
}

export function validateRun(directory) {
  const manifest = readJSON(join(directory, 'run-manifest.json'));
  if (manifest.schema !== 1 || !manifest.tests.length || !['passed', 'failed'].includes(manifest.status)) {
    throw new Error('Incomplete run: missing tests or interrupted execution in ' + directory);
  }
  const ids = manifest.tests.map((test) => test.id);
  if (new Set(ids).size !== ids.length || manifest.tests.some((test) => !test.attempts.length || test.attempts.some((attempt) => ['interrupted', 'skipped'].includes(attempt.status)))) {
    throw new Error('Incomplete run: missing, duplicate, or skipped execution in ' + directory);
  }
  const results = readdirSync(directory).filter((file) => file.endsWith('-result.json'));
  const attempts = manifest.tests.reduce((sum, test) => sum + test.attempts.length, 0);
  if (results.length !== attempts) throw new Error('Incomplete or contaminated Allure results in ' + directory);
  const counts = new Map();
  for (const file of results) {
    const result = readJSON(join(directory, file));
    if (!result.uuid || !result.status) throw new Error('Invalid Allure result: ' + file);
    const id = result.labels?.find((label) => label.name === 'playwright_id')?.value;
    if (!ids.includes(id)) throw new Error('Allure result outside the expected inventory: ' + file);
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  if (manifest.tests.some((test) => counts.get(test.id) !== test.attempts.length)) throw new Error('Allure per-test attempt inventory differs');
  return manifest;
}

/** Validate everything before touching the merge output or a publication. */
export function mergeShards(root, expectedIds, output) {
  const directories = findRuns(root);
  if (directories.length !== 2) throw new Error('Incomplete run: exactly two shard manifests required');
  const manifests = directories.map(validateRun);
  const shards = manifests.map((manifest) => manifest.shard?.current).sort();
  if (String(shards) !== '1,2' || manifests.some((manifest) => manifest.shard.total !== 2)) throw new Error('Invalid shard identities');
  if (new Set(manifests.map((manifest) => manifest.appCommit)).size !== 1) throw new Error('Shard application revisions differ');
  const ids = manifests.flatMap((manifest) => manifest.tests.map((test) => test.id));
  if (new Set(ids).size !== ids.length || ids.length !== expectedIds.length || expectedIds.some((id) => !ids.includes(id))) {
    throw new Error('Incomplete run: shard inventory differs from this checkout');
  }
  if (existsSync(output)) throw new Error('Merge output must be fresh');
  mkdirSync(output, { recursive: true });
  for (const directory of directories) {
    for (const file of readdirSync(directory)) {
      if (file !== 'run-manifest.json') cpSync(join(directory, file), join(output, file), { recursive: true });
    }
  }
  writeFileSync(join(output, 'run-manifest.json'), JSON.stringify({
    schema: 1, runId: manifests.map((manifest) => manifest.runId).join('+'), shard: null,
    appCommit: manifests[0].appCommit,
    status: manifests.some((manifest) => manifest.status === 'failed') ? 'failed' : 'passed',
    duration: manifests.reduce((total, manifest) => total + (manifest.duration ?? 0), 0),
    tests: manifests.flatMap((manifest) => manifest.tests),
  }, null, 2));
  return manifests;
}
