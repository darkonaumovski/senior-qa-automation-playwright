import process from 'node:process';
import { readFileSync } from 'node:fs';
import { findRuns, readJSON } from './report-tools.mjs';
const expected = process.argv[2];
if (!/^[a-f0-9]{40}$/.test(expected ?? '')) throw new Error('A full verified revision is required');
const environments = findRuns('.runs').filter((directory) => {
  const manifest = readJSON(directory + '/run-manifest.json');
  return manifest.appCommit === expected && manifest.tests.length > 0;
}).map((directory) => readFileSync(directory + '/environment.properties', 'utf8').replace(/\\([:= ])/g, '$1'));
for (const url of ['http://localhost:8080', 'http://app:8080']) {
  if (!environments.some((environment) => environment.includes('BASE_URL=' + url) && environment.includes('APP_COMMIT=' + expected))) {
    throw new Error('No Allure environment recorded the verified revision for ' + url);
  }
}
