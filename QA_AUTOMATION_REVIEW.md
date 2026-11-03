# Playwright remediation review

**98/100 · 3 November 2026 · original score: 83/100**

Assessment of the desktop TodoMVC automation, using the original six weights. The final suite has **207 expected outcomes: 193 ordinary passes and 14 explicit expected failures**, with zero retries. Those expected failures expose existing product defects and one Windows WebKit keyboard limitation; they do not establish that the application is defect-free.

## Scorecard

| Category | Original | Revised | Recovered evidence |
|---|---:|---:|---|
| Functional coverage and assertions | 21/25 | **25/25** | Fresh invalid-route contract; record identity after edit/delete/reload; adding under both filters; actual bulk checked state and visible completion styling |
| Design and isolation | 18/20 | **20/20** | Seeded lifecycle/keyboard preconditions skip UI cleanup; explicit readiness diagnostics; default cleanup and UI-driven persistence remain covered |
| Reliability and browsers | 17/20 | **19/20** | Retry-free three-engine matrix; one/two-worker WebKit traces; retry-recovery control; normal Firefox sandbox settings. One point remains open for the serving-process failure |
| CI and reproducibility | 13/15 | **14/15** | Bounded, quoted nightly input; target-provenance controls; implemented Compose/runtime checks. Actual Docker CI execution and production dependency remediation remain open |
| Accessibility and interaction | 6/10 | **10/10** | Active label rule, individual revision-scoped exceptions, editor defect, negative/obsolete-exception controls, real-key journeys and explicit unreachable operations |
| Reporting and maintenance | 8/10 | **10/10** | Fresh raw data, installed reporter option, per-run metadata, actual shard validation, complete failing report, missing-shard protection, full-to-smoke isolation and corrected instructions |
| **Total** | **83/100** | **98/100** | **15 points recovered; 2 withheld** |

## Baseline, provenance and preservation

- Suite commit: `92ada59a109ed96fc3e4cbce7b30b9bdffaaeeba`. Changes remain in the working tree; no new commit or CI run is represented as executed.
- Application pin and clean served checkout: `a89cccc91045a0a36ce559cd716aebc31fa302a8`. The pin was **not changed**. Both original app checkout paths are excluded from Docker context; the isolated candidate under `.runs/` is excluded too.
- Original inventory: **58 scenarios, nine files, 174 browser executions**. Final inventory: **69 scenarios, ten files, 207 executions**. Smoke remains **10 scenarios / 30 executions**.
- Final scenario inventory: 49 functional cases, six product accessibility/keyboard cases, two accessibility-gate controls and 12 lifecycle cases. The 14 harness cases are distinct from product coverage.
- Host: Windows, Node 24.20.0, npm 11.19.0, Playwright 1.62.1, axe adapter 4.13.0, Allure reporter 3.11.1 and CLI 2.43.0. HTML generation succeeded with the installed Java 8 runtime; CI specifies Java 17.
- Initial user changes were the untracked review and modified legacy environment metadata. The original review was copied verbatim to [original-review.md](evidence/review-2026-11-03/original-review.md). The retained legacy metadata matches its backup.
- **Preservation caveat:** initial discovery used the original Allure reporter before the legacy metadata backup. Its pre-discovery values were not captured, so preservation of those earlier values cannot be independently guaranteed. The revised runner never reads or writes that legacy file.

[Context](evidence/review-2026-11-03/context.json), [original inventory](evidence/review-2026-11-03/baseline-inventory.txt), [final manifest and outcomes](evidence/review-2026-11-03/acceptance-matrix-summary.json).

The initial baseline overlapped edits and package installation: 154/174 passed in 1,051.5 seconds. It is retained as diagnostic evidence, **excluded from the before/after comparison**. A second baseline ran immutable source extracted from the recorded commit, against the same pinned app: **172 passed, two WebKit axe timeouts, 677.1 seconds**, two workers, zero retries. Its reviewed lifecycle case at line 110 passed.

An early revised run inside the restricted execution sandbox returned 134/204 expected results in 835.5 seconds: Chromium 68/68, Firefox 0/68 (page creation failures), WebKit 66/68. Normal Firefox page creation succeeded in the host execution context without sandbox-disabling variables. Host-level diagnostic runs exposed the keyboard setup, Firefox route-message and repeated-title issues subsequently addressed below. These failed attempts and their traces remain available; they are not hidden by retries or used to estimate a flake rate.

## 1. Accessibility — four points recovered

**Baseline:** the base and editing scans disabled the whole `label` rule, concealing the visible unnamed editor as well as individual todo checkboxes.

**Change and verification:**

1. Keep `label` enabled in both scans. Except only the exact affected revision's individual visible todo checkbox nodes, using record IDs, direct-child structure and checkbox type. Unexpected nodes retain axe HTML, targets and failure summaries.
2. Track the unnamed `.edit` input independently as `UPSTREAM-A11Y-EDIT`. Other unexpected nodes and obsolete checkbox exceptions fail before its expected-failure marker.
3. Inject an extra unnamed input and demonstrate that the **same gate assertion throws**. Give a known checkbox an accessible name and demonstrate that its exception becomes obsolete and fails that gate.
4. Exercise real typing, Tab navigation, Space/Enter activation and visible filter-link focus. Separate known-defect checks cover missing input/checkbox focus and inaccessible row edit/delete operations.

All three engines exercised the gate controls in the final matrix. Known-defect markers are limited to the reviewed revision and placed after unrelated assertions. A repaired known defect produces an unexpected pass. On this Windows WebKit build, both Tab and Option-Tab skip filter links; the journey records that precise host limitation at its final assertion. Chrome and Firefox complete the filter journey. Safari on Mac documents Option-Tab for links ([Apple Support](https://support.apple.com/guide/safari/keyboard-shortcuts-and-gestures-cpsh003/mac)); the Windows observation is not a claim about macOS Safari.

**Remaining product work:** name the individual checkboxes/editor, supply visible focus indicators and keyboard access to row editing/deletion. This is targeted automated coverage, not a complete WCAG or screen-reader conformance claim.

## 2. Functional coverage — four points recovered

| Protection | Distinct regression caught | Verification |
|---|---|---|
| Invalid hash should fall back to All | A successful write stays invisible, the fallback view is wrong, reload loses saved data, or the route exception recurs | Fresh page directly opens the unknown route; captures view/rows/errors before and after reload; asserts stored data and unexpected errors before the known failure |
| Duplicate-title identity | Editing/deleting the wrong record, resurrecting the removed record, losing the edit or completion after reload | UI creates two records and edits the second into a duplicate; edits/completes the survivor, deletes the other, reloads, checks ID/title/completion and exact stored record |
| Add under Active and Completed | New active row omitted from Active, leaked into Completed, hidden records omitted from the counter | Assert exact visible subset and remaining count, then all records after returning to All |
| Bulk state and existing visual case | Checkbox state diverges from individual rows; strike-through or completed/active colors disappear while classes remain correct | Individual toggles assert the actual bulk checkbox state in both directions; existing styling case asserts computed decoration and colors |

The fallback is specified as **All**, with the saved row visible and no route exception. The known route defect is [issue #7](https://github.com/darkonaumovski/senior-qa-automation-playwright/issues/7). Its exception recognizer checks both the browser-specific message and the controller source in the stack, preserving unrelated errors.

An additional discovered defect is now gated separately: Firefox drops the second consecutive identical Enter submission. The check uses real key typing and records DOM, storage and input state; consistency, unique IDs and unexpected completion fail before the narrowly scoped expected failure. The identity scenario uses UI edits to establish duplicates so it can independently protect edit/delete persistence. No persistence setup writes localStorage directly.

Existing valid-route, counter, bulk-action and reload coverage is reused. See [TEST_APPROACH.md](TEST_APPROACH.md) and [FINDINGS.md](FINDINGS.md).

## 3. Fixture dependencies — two points recovered

**Baseline:** lifecycle cases seeded over records immediately after the fixture had hovered/deleted samples. The initial diagnostic run reproduced a hover stall in the same cleanup path for the unrelated-storage case. The exact reviewed line-110 timeout did not reproduce in the immutable baseline; its original root cause remains unproven.

**Change:** group immediately seeded lifecycle cases under `todoStart: 'as-is'`; keyboard preconditions also seed without cleanup and retain the app's natural input autofocus. Dedicated lifecycle cases retain default cleanup, unrelated storage and leaked-init-script checks.

Readiness now reports the unmet condition: missing storage, invalid JSON, expected nonempty initialization, unsupported route or mismatched filtered row count. It allows zero visible rows with nonempty filtered storage. The pinned app still seeds samples on empty reload and `seedTodos([])` still rejects that request; no unsupported empty-startup behavior was invented.

**Trace verification:** three affected lifecycle cases, three repetitions each, at both one and two workers: **18 traces, zero hover actions**. All six repetitions of the reviewed seed/filter case complete its filter, count, title and storage assertions. [Trace proof](evidence/review-2026-11-03/lifecycle-trace-proof.json). Trace archives are retained locally under the artifact directories.

## 4. Reliability — two of three points recovered

Final native host execution, normal browser protections, **zero retries**:

| Engine | Executions | Ordinary passes | Expected failures | Unexpected failures | Sum of attempt durations |
|---|---:|---:|---:|---:|---:|
| Chromium | 69 | 65 | 4 | 0 | 87.696 s |
| Firefox | 69 | 64 | 5 | 0 | 140.613 s |
| WebKit | 69 | 64 | 5 | 0 | 133.267 s |
| **Total** | **207** | **193** | **14** | **0** | **361.576 s** |

The two sequential shards used one worker each: **104 executions in 199.662 seconds; 103 in 193.937 seconds** including CLI overhead. Both exit codes were zero. Each test had one attempt. Expected failures comprise 12 original product-contract checks, one Firefox repeated-Enter defect and one Windows WebKit keyboard limitation.

| WebKit repetition run | Workers | Repeats per case | Retries | Result | Command wall time |
|---|---:|---:|---:|---|---:|
| Initial process, before restart | 1 | 3 | 0 | 3/9 passed; six connection failures | 42.932 s |
| Initial process, already down | 2 | 3 | 0 | 0/9 passed; nine connection failures | 30.028 s |
| Fresh host app process | 1 | 3 | 0 | **9/9 passed** | 32.751 s |
| Fresh host app process | 2 | 3 | 0 | **9/9 passed** | 30.996 s |

The serving process exited with **EMFILE** while opening `app/assets/js/todo/app.js` after extended execution. Subsequent traces fail at navigation because the server is unavailable. [Outage record](evidence/review-2026-11-03/server-outage.json), [initial outcomes](evidence/review-2026-11-03/webkit-repeats.json), [fresh outcomes](evidence/review-2026-11-03/webkit-final-repeats.json). No dependency-advisory exploit or underlying handle-leak cause is claimed.

Firefox's workaround is explicit opt-in: `FIREFOX_WINDOWS_SANDBOX_WORKAROUND=1`. The final Firefox matrix uses normal settings. Harness checks verify Windows-only opt-in and normal Linux/macOS settings.

PR jobs now surface retry recoveries in the step summary and warning annotations and always upload first-attempt failure evidence. An isolated, intentionally flaky control failed attempt zero, passed retry one, emitted the warning/summary and retained its first trace: [summary](evidence/review-2026-11-03/retry-recovery-summary.md), [log](evidence/review-2026-11-03/retry-probe.log). This control is outside the product inventory. Nightly remains retry-free. **No test or action timeout was increased.**

**One point withheld:** investigate the serving-process EMFILE failure and establish a supported runtime/environment with sustained retry-free execution and health evidence. The fresh short repeats establish the fixture improvement; they do not establish that the extended-run serving failure is fixed.

## 5. Delivery and dependencies — one of two points recovered

- Manual nightly count travels through `REPEAT_EACH`, is validated as an integer **1–10**, then quoted in the runner command. Harness checks include valid, malformed, out-of-range, newline and shell-like values. Actual CLI controls returned zero for 1/3/10 and nonzero for invalid values: [CLI outcomes](evidence/review-2026-11-03/repeat-cli-results.json).
- CI now runs Chromium smoke against the separate healthy Compose app service, collects raw results/traces/reports, and injects a failing browser assertion to require exit code 1. Compose uses service networking and its own entrypoint.
- Both images record the actual resolved checkout. Combined execution uses that revision file; Compose retrieves the independent service's revision. CI checks default and overridden image/service Allure environment panels. A requested `APP_COMMIT` alone never attributes an external target.
- An actual unverified-target control, using a local server without declared source provenance, passed its browser case and wrote **APP_COMMIT=unknown**. The remote-URL decision is separately covered by the harness: [environment panel](evidence/review-2026-11-03/unverified-target-environment.properties).
- Application installs use the upstream lockfile with `npm ci --ignore-scripts --omit=dev`. Historical SHA evidence is allowed in documentation; deployment configuration still reads the single app pin.

| Audit scope | Findings |
|---|---|
| Suite lockfile before | 13 affected packages: one high, 12 moderate |
| Suite after in-range lint updates/transitive patch and clean install | **12 moderate; zero high/critical** |
| Pinned application's production lockfile, development dependencies omitted | **Seven: one critical, four high, two moderate** |
| Isolated candidate upstream production lockfile | Four: zero critical, two high, two moderate |

Critical `shell-quote` was triaged first. It is present through production `npm-run-all2`; `npm start` launches `serve` directly. No browser/HTTP path to the advisory's required comment-token/line-terminator sequence was demonstrated. This narrows observed exposure without removing the vulnerable package. The candidate `cd24a0a` removes the critical finding but retains serving dependency findings; it was audited, **not adopted or represented as matrix-tested**.

[Full audit scopes, paths, advisory and residual exposure](DEPENDENCY_AUDIT.md). The remaining suite findings belong to lint tooling; a clean audit is not claimed.

**One point withheld:** no Docker CLI exists on this host, and the edited workflows have no new executed CI link. Run the actual combined/Compose/default/override/failure-exit paths in CI; remediate the critical production closure and serving exposure through a reviewed upstream pin or reviewed runtime lock remediation, then repeat the production audit and full browser matrix. Resolve or explicitly accept the remaining compatible-tooling audit exposure. Static YAML/shell checks alone do not close this point.

## 6. Reports and instructions — two points recovered

Each invocation writes fresh `.runs/<id>/allure-results`, uses the installed reporter's **resultsDir** option and generates environment metadata. Static categories moved to `reporting/categories.json`; their names are triage hints until diagnosis.

Actual native shards were validated against the complete current inventory before merging: shard identities, attempted tests, matching application revision, per-test raw IDs and attempt counts. Missing, skipped, interrupted or contaminated runs cannot replace a complete publication. Complete failing runs are accepted: an earlier diagnostic iteration generated a complete **204-case report with four failures**, verified in [its summary](evidence/review-2026-11-03/complete-failing-report-summary.json).

The final proof generated a **207-case full report**, then a fresh **30-case smoke report**. The smoke raw count, physical report-case count, tags and current smoke inventory all match exactly. [Isolation proof and full-report location](evidence/review-2026-11-03/report-isolation.json).

A real one-shard subset of the final run was rejected with exit 1 before merge output was created. The existing complete report's index hash stayed unchanged: [missing-shard proof](evidence/review-2026-11-03/missing-shard-proof.json). Pages deployment is conditional on successful completeness validation, while a complete failing test run still reaches generation/publication and retains a failing workflow status.

README, strategy and architecture now describe all three browsers, installation of WebKit, one headed worker, actual CI worker/retry settings, provenance and implemented Docker commands. Container runtime verification remains explicitly pending.

## Exact commands and evidence

Run from the suite root. Host-level validation used the normal host execution context, without browser sandbox overrides.

```powershell
# Immutable original baseline; pinned app serving on 8087
git archive --format=tar --output=.runs/baseline-source.tar HEAD
tar -xf .runs/baseline-source.tar -C .runs/baseline-checkout
$env:TODO_BASE_URL='http://localhost:8087'
$env:PLAYWRIGHT_JSON_OUTPUT_FILE='evidence/review-2026-11-03/baseline-frozen-results.json'
npx playwright test --config=.runs/baseline-checkout/playwright.config.ts --workers=2 --retries=0 --reporter=line,json --output=evidence/review-2026-11-03/baseline-frozen-artifacts

# Final matrix: driver records unique result paths, exact inventory, exits and durations
& './evidence/review-2026-11-03/run-native-matrix.ps1' -EvidencePrefix 'acceptance-native'
# Its runner commands:
# npx playwright test --shard=1/2 --workers=1 --retries=0
# npx playwright test --shard=2/2 --workers=1 --retries=0

$env:TODO_BASE_URL='http://localhost:8088'
$env:APP_SOURCE_DIR='kitchensink'
npx playwright test tests/todo/lifecycle.spec.ts --project=webkit --grep 'seed todos while preserving|reload an empty filtered view|leave unrelated storage untouched when seeding' --repeat-each=3 --retries=0 --workers=1 --trace=on
npx playwright test tests/todo/lifecycle.spec.ts --project=webkit --grep 'seed todos while preserving|reload an empty filtered view|leave unrelated storage untouched when seeding' --repeat-each=3 --retries=0 --workers=2 --trace=on

& './evidence/review-2026-11-03/finish-acceptance-reports.ps1'
npm run typecheck
npm run lint
npm run test:harness
npm audit --json --cache .cache/npm
npm --prefix kitchensink audit --omit=dev --json --cache .cache/npm
npm --prefix .runs/upstream-source audit --omit=dev --json --cache .cache/npm
```

The controlled server command, from `kitchensink`, was `node node_modules/serve/build/main.js -l 8088 --no-request-logging --no-clipboard app`. The replacement process used the same source and dependencies.

Typecheck, lint and all **six harness checks** exit zero. Both workflows and Compose parse as YAML; shell files use LF and were syntax-checked where the local Bash was available. [Static exits](evidence/review-2026-11-03/static-checks.json). Exact output paths, JSON reports, audit responses, failure logs and trace summaries are under [evidence/review-2026-11-03](evidence/review-2026-11-03).

Historical links retained from the original review: [main CI](https://github.com/darkonaumovski/senior-qa-automation-playwright/actions/runs/39144041429), [nightly](https://github.com/darkonaumovski/senior-qa-automation-playwright/actions/runs/41622790609). They do not verify these working-tree changes. No new CI publication is claimed.

## Conditions for 100/100

1. **Reliability +1:** diagnose/remediate or establish the supported-environment cause of the extended-run EMFILE exit, then retain sustained retry-free browser/nightly evidence with the server healthy. Keep the exact original WebKit timeout's cause unconfirmed unless a trace establishes it.
2. **CI/reproducibility +1:** execute the edited Docker/Compose/provenance/failure-exit paths in CI with artifacts and links, and close the production dependency remediation/audit/matrix conditions above.

Upstream UI defects remain separately visible in [FINDINGS.md](FINDINGS.md): unnamed controls, invalid-route fallback, missing focus, inaccessible row operations and Firefox repeated submissions. The empty-reload sample seeding is a documented app constraint. No upstream product source was patched to make the suite green.
