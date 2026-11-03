import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/** A requested build pin is not evidence of what a target is running. */
export function appRevision(baseURL: string): string {
  try {
    if (process.env.APP_REVISION_FILE) {
      const revision = readFileSync(process.env.APP_REVISION_FILE, 'utf8').trim();
      return /^[a-f0-9]{40}$/.test(revision) ? revision : 'unknown';
    }
    if (['localhost', '127.0.0.1', '[::1]'].includes(new URL(baseURL).hostname) && process.env.APP_SOURCE_DIR) {
      const cwd = resolve(process.env.APP_SOURCE_DIR);
      const revision = execFileSync('git', ['rev-parse', 'HEAD'], { cwd, encoding: 'utf8' }).trim();
      const dirty = execFileSync('git', ['status', '--porcelain', '--', 'app', 'scripts', 'package.json', 'package-lock.json'], { cwd, encoding: 'utf8' }).trim();
      return dirty ? 'unknown (modified app checkout)' : revision;
    }
  } catch { /* Unknown is safer than attributing a remote run to a local pin. */ }
  return 'unknown';
}

export function firefoxEnvironment(platform = process.platform, optIn = process.env.FIREFOX_WINDOWS_SANDBOX_WORKAROUND) {
  if (platform !== 'win32' || optIn !== '1') return {};
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) env[key] = value;
  }
  return { env: { ...env, MOZ_DISABLE_CONTENT_SANDBOX: '1', MOZ_DISABLE_GMP_SANDBOX: '1' } };
}
