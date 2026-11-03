import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { FullConfig, FullResult, Reporter, Suite, TestCase, TestResult } from '@playwright/test/reporter';

export default class EvidenceReporter implements Reporter {
  private config!: FullConfig;
  private suite!: Suite;
  private started = Date.now();
  onBegin(config: FullConfig, suite: Suite) {
    this.config = config;
    this.suite = suite;
    this.started = Date.now();
  }
  onTestEnd(test: TestCase, result: TestResult) {
    if (result.retry > 0 && result.status === test.expectedStatus) {
      process.stdout.write(`RETRY RECOVERY: ${test.titlePath().join(' > ')} (attempt ${result.retry + 1})\n`);
      if (process.env.GITHUB_ACTIONS) {
        const title = test.titlePath().join(' > ').replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A');
        process.stdout.write(`::warning title=Passed only on retry::${title}\n`);
      }
    }
  }
  onEnd(result: FullResult) {
    if (process.argv.includes('--list')) return;
    const tests = this.suite.allTests().map((test) => ({
      id: test.id, title: test.titlePath(), expectedStatus: test.expectedStatus,
      outcome: test.outcome(),
      attempts: test.results.map((attempt) => ({ retry: attempt.retry, status: attempt.status, duration: attempt.duration })),
    }));
    const directory = String(this.config.metadata.resultsDir);
    mkdirSync(directory, { recursive: true });
    writeFileSync(join(directory, 'run-manifest.json'), JSON.stringify({
      schema: 1, runId: String(this.config.metadata.runId), shard: this.config.shard,
      appCommit: String(this.config.metadata.appCommit), status: result.status,
      duration: Date.now() - this.started, tests,
    }, null, 2));
    const flaky = tests.filter((test) => test.outcome === 'flaky');
    const known = tests.filter((test) => test.expectedStatus === 'failed');
    const summary = process.env.GITHUB_STEP_SUMMARY;
    if (summary) {
      // appendFile avoids losing summaries written by other steps.
      appendFileSync(summary,
        `\n### Playwright retry recoveries: ${flaky.length}\n` + flaky.map((test) => `- ${test.title.join(' > ')}\n`).join('')
        + `\nExpected failures (see test annotations): ${known.length}\n` + known.map((test) => `- ${test.title.join(' > ')}\n`).join(''));
    }
  }
}
