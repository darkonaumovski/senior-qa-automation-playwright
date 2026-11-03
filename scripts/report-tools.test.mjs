import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validateRepeat, mergeShards, validateRun } from './report-tools.mjs';

test('repeat count accepts only 1 through 10, including hostile shell strings', () => {
  for (const value of ['1', '3', '10']) assert.equal(validateRepeat(value), value);
  for (const value of ['', '0', '-1', '01', '11', '999', '1.5', ' 3', '3\n', '3; touch injected', '$(whoami)', '"; exit 0; #']) {
    assert.throws(() => validateRepeat(value), /integer from 1 to 10/);
  }
});

function shard(root, current, id, status = 'passed') {
  const directory = join(root, 'shard-' + current);
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, id + '-result.json'), JSON.stringify({ uuid: id, status, labels: [{ name: 'playwright_id', value: id }] }));
  writeFileSync(join(directory, 'run-manifest.json'), JSON.stringify({
    schema: 1, appCommit: 'verified-revision', status, shard: { current, total: 2 },
    tests: [{ id, attempts: [{ retry: 0, status }] }],
  }));
  return directory;
}

test('complete failing shards can publish; missing shard cannot replace a complete report', () => {
  const root = mkdtempSync(join(tmpdir(), 'todo-shards-'));
  const downloads = join(root, 'downloaded');
  const output = join(root, 'merged');
  shard(downloads, 1, 'first');
  assert.throws(() => mergeShards(downloads, ['first', 'second'], output), /two shard/);
  assert.equal(existsSync(output), false);
  shard(downloads, 2, 'second', 'failed');
  assert.equal(mergeShards(downloads, ['first', 'second'], output).length, 2);
  assert.equal(validateRun(output).tests.length, 2);
  assert.equal(validateRun(output).status, 'failed');
  const publication = join(root, 'published.html');
  writeFileSync(publication, 'previous complete publication');
  const incomplete = join(root, 'incomplete');
  shard(incomplete, 1, 'first');
  assert.throws(() => mergeShards(incomplete, ['first', 'second'], output), /two shard/);
  assert.equal(readFileSync(publication, 'utf8'), 'previous complete publication');
});

test('rejects wrong inventory, duplicate shards, unexecuted tests and contaminated raw results', () => {
  const root = mkdtempSync(join(tmpdir(), 'todo-inventory-'));
  const first = shard(root, 1, 'first');
  shard(root, 2, 'second');
  assert.throws(() => mergeShards(root, ['first', 'missing'], join(root, 'out')), /inventory/);
  const manifest = JSON.parse(readFileSync(join(first, 'run-manifest.json'), 'utf8'));
  manifest.tests[0].attempts = [];
  writeFileSync(join(first, 'run-manifest.json'), JSON.stringify(manifest));
  assert.throws(() => validateRun(first), /missing/);
  manifest.tests[0].attempts = [{ retry: 0, status: 'passed' }];
  writeFileSync(join(first, 'run-manifest.json'), JSON.stringify(manifest));
  writeFileSync(join(first, 'first-result.json'), JSON.stringify({ uuid: 'first', status: 'passed', labels: [{ name: 'playwright_id', value: 'wrong-test' }] }));
  assert.throws(() => validateRun(first), /outside the expected inventory/);
  writeFileSync(join(first, 'first-result.json'), JSON.stringify({ uuid: 'first', status: 'passed', labels: [{ name: 'playwright_id', value: 'first' }] }));
  writeFileSync(join(first, 'stale-result.json'), JSON.stringify({ uuid: 'stale', status: 'passed' }));
  assert.throws(() => validateRun(first), /contaminated/);
});
