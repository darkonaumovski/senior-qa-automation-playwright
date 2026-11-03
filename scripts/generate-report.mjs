import { statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import process from 'node:process';
import { findRuns, validateRun } from './report-tools.mjs';
const latest = findRuns('.runs').sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0];
const input = process.argv[2] ?? latest;
if (!input) throw new Error('No run results available');
validateRun(input);
// Invoke the installed JavaScript launcher directly; avoid shell quoting on Windows.
const launcher = resolve('node_modules/allure-commandline/bin/allure');
const result = spawnSync(process.execPath, [launcher, 'generate', input, '--clean', '-o', 'allure-report'], { stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
