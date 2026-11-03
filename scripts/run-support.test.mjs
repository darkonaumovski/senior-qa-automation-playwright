import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import process from 'node:process';
import { appRevision, firefoxEnvironment } from './run-support.ts';

const original = { ...process.env };
afterEach(() => { process.env = { ...original }; });

test('requested pin cannot attribute an unverified remote target', () => {
  delete process.env.APP_REVISION_FILE;
  process.env.APP_SOURCE_DIR = 'kitchensink';
  process.env.APP_COMMIT = readFileSync('.app-commit', 'utf8').trim();
  assert.equal(appRevision('https://remote.example'), 'unknown');
});

test('revision file carries the built revision and rejects malformed or missing evidence', () => {
  const root = mkdtempSync(join(tmpdir(), 'todo-revision-'));
  const file = join(root, 'revision');
  process.env.APP_REVISION_FILE = file;
  const revision = readFileSync('.app-commit', 'utf8').trim();
  writeFileSync(file, revision + '\n');
  assert.equal(appRevision('http://localhost:8080'), revision);
  writeFileSync(file, 'not-a-revision');
  assert.equal(appRevision('http://localhost:8080'), 'unknown');
  process.env.APP_REVISION_FILE = join(root, 'missing');
  assert.equal(appRevision('http://localhost:8080'), 'unknown');
});

test('Firefox workaround is explicit and Windows only, preserving the host environment', () => {
  delete process.env.FIREFOX_WINDOWS_SANDBOX_WORKAROUND;
  assert.deepEqual(firefoxEnvironment('win32', undefined), {});
  assert.deepEqual(firefoxEnvironment('linux', '1'), {});
  assert.deepEqual(firefoxEnvironment('darwin', '1'), {});
  const result = firefoxEnvironment('win32', '1');
  assert.equal(result.env.MOZ_DISABLE_CONTENT_SANDBOX, '1');
  assert.equal(result.env.MOZ_DISABLE_GMP_SANDBOX, '1');
  assert.equal(result.env.PATH, process.env.PATH);
});
