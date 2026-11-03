import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import type { FullConfig } from '@playwright/test';

export default function freshResults(config: FullConfig) {
  const directory = String(config.metadata.resultsDir);
  if (existsSync(directory) && readdirSync(directory).length) throw new Error('Allure results directory must be fresh: ' + directory);
  mkdirSync(directory, { recursive: true });
}
