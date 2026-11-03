# Dependency audit — 3 November 2026

The suite, the pinned application's production closure, and an isolated candidate upstream checkout were audited separately. No upstream source or application pin was changed.

| Scope | Command | Result |
|---|---|---|
| Suite before remediation | `npm audit --json` | 13 affected packages: 1 high, 12 moderate |
| Suite after in-range lint updates and transitive patch fix | `npm audit --json --cache .cache/npm` | 12 moderate, 0 high/critical |
| Pinned app production lockfile | `npm --prefix kitchensink audit --omit=dev --json --cache .cache/npm` | 7 affected packages: 1 critical, 4 high, 2 moderate |
| Candidate upstream production lockfile | `npm --prefix .runs/upstream-source audit --omit=dev --json --cache .cache/npm` | 4 affected packages: 0 critical, 2 high, 2 moderate |

Audit JSON, installation logs and the candidate checkout log are in `evidence/review-2026-11-03/`. Findings make `npm audit` exit 1; that is not a clean audit. Counts include transitive dependants and are not counts of independently exploitable issues. Upstream development dependencies were excluded from both production audits.

## Critical first: shell-quote

The pinned closure contains vulnerable `shell-quote` through `npm-run-all2`. [GHSA-pqg4-j6r4-53mv](https://github.com/advisories/GHSA-pqg4-j6r4-53mv) affects versions >=1.8.4 and <1.11.0. Exploitation requires a line terminator in an attacker-controlled string after a comment object in one `quote()` call.

Inspection of the checked-out scripts establishes that `npm start` runs `scripts/start.js`, which launches `serve` directly; it does not run `npm-run-all2`. Inspection of `npm-run-all2/lib/index.js` found `quote()` calls over CLI argument strings and placeholder values. No path from a TodoMVC browser input or an HTTP request to the advisory's required comment-token sequence was demonstrated. This narrows the observed exposure; it does not remove the vulnerable production package or establish general safety.

The candidate upstream commit starts `cd24a0a`; `git ls-remote ... HEAD` and the isolated clone resolved the same revision. Its production lockfile removes the critical finding. It still reports a high-severity `compression` finding and transitive `serve` exposure, plus moderate `minimatch` / `serve-handler` findings. It was audited, not adopted or represented as fully tested.

## Remaining application exposure

Pinned production findings also include `compression`, `fast-uri`, `brace-expansion`, `minimatch`, `serve-handler` and `serve`. The compression advisory concerns memory retention when a response closes prematurely, so the serving path deserves priority after the critical package. Its patched range starts at 1.8.2, according to the recorded advisory.

Required closure: reviewed upstream production dependency remediation (or an explicitly reviewed repository-owned runtime lock overlay), a fresh production audit, verification of the exact checkout and the complete three-browser matrix on that runtime. A pin change alone is insufficient. Existing Docker and CI installs now use `npm ci --ignore-scripts --omit=dev` to reproduce the upstream lockfile rather than re-resolving it.

## Suite remediation and accepted limitation

Updated the lint packages within their declared ranges, then ran `npm audit fix --ignore-scripts` and `npm ci --ignore-scripts`. The high-severity `brace-expansion` finding is removed. Typecheck, lint and harness verification are recorded separately in the review.

Twelve moderate findings remain in the lint dependency closure around `minimatch`. npm proposes breaking or inappropriate downgrades for several parent packages; `npm audit fix --force` was not applied. These packages operate on repository source patterns during linting; the suite does not accept untrusted runtime glob patterns from TodoMVC. A compatible patched lint closure and a fresh clean audit are the remaining maintenance condition. This is recorded residual exposure, not a zero-vulnerability claim.
