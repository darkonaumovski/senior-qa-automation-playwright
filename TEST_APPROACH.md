# Desktop TodoMVC test strategy

Scope: the desktop `/todo` experience in **Chromium, Firefox and WebKit**. Other kitchensink pages, mobile layouts, load tests, a complete screen-reader audit and general pixel comparisons remain outside this suite.

## Priorities and assertions

CRUD and valid filtering remain core regression coverage. Seed preconditions when data creation is not under test; drive every operation under test through its real UI control. Persistence cases add, toggle, edit and delete through the UI before reloading, so they protect the app's write path rather than the harness's storage seeding. Duplicate titles are established by editing a second distinct UI-created record; this avoids coupling record-identity coverage to the separately reproduced Firefox repeated-Enter defect.

Text trimming uses exact DOM text and stored values because normalized text assertions can hide whitespace defects. Special-character coverage protects its specific literal rendering example; it does not establish general XSS safety.

| Added or strengthened case | Distinct regression detected |
|---|---|
| Unknown hash, fresh page, All fallback | Saved writes become invisible; invalid route errors recur; view or storage changes across reload |
| Duplicate-title edit/delete/reload | Mutation targets the wrong record, edit is lost, deleted duplicate returns, or completion/identity is lost |
| Consecutive identical Enter submissions | Firefox drops the second same-title submission; a dedicated known-defect check preserves the failure |
| Add under Active | New active record fails to enter the active subset |
| Add under Completed | An active record leaks into completed rows; counter omits hidden active records |
| Individual toggles update bulk checked state | Bulk control stays checked with an active record, or never becomes checked |
| Existing “visually distinguish” test | Completed strike-through or completed/active label colors disappear despite correct row classes |
| Axe gate mutation controls | An unexpected unnamed input is hidden, or a repaired checkbox retains an obsolete exception |
| Keyboard add/complete/filter journey | Real Tab order, Space/Enter activation, or visible filter-link focus regresses |
| Known keyboard focus/access checks | Missing input/checkbox focus indicators and unreachable inline edit/delete stop being visible in reports |

Existing valid routes, empty filtered subsets, counters, bulk mutation and basic reload tests are reused rather than duplicated.

## Isolation and readiness

Each test gets a fresh browser context. The default fixture removes samples through the UI; dedicated lifecycle tests retain coverage of that cleanup and preservation of unrelated storage. Lifecycle cases that replace all records use `todoStart: 'as-is'`.

Readiness models the pinned app: empty stored data is reseeded on load. Nonempty storage may legitimately render zero rows under Active or Completed. Setup errors describe missing storage, unsupported routes, invalid JSON, expected sample initialization or a filtered row-count mismatch. When upstream introduces a valid empty startup signal, revise this contract alongside the dedicated seeding checks. Do not silently assume that static input visibility means startup is complete.

## Accessibility and product defects

Axe scans the base, inline editor and toggle-all surfaces with WCAG 2.0 A/AA and 2.1 AA tags. The `label` rule is active everywhere. Exceptions are matched to individual visible `.toggle` nodes on the exact reviewed app revision; unexpected nodes retain their full axe diagnostics. Naming a checkbox makes its exception obsolete. Injecting an unnamed input demonstrably fails the same gate.

The editor is a separate upstream naming defect. The keyboard journey uses real key events for input, navigation and activation. Separate checks record that `.new-todo` has no outline, row checkboxes have opacity zero without a focus proxy, edit requires a pointer double-click and destroy is hidden without hover. The keyboard precondition reload retains the app's natural input autofocus. On this Windows WebKit build, both Tab and Option-Tab cycle past filter links. The journey records this host limitation as an expected failure only at its final reachability assertion; all other assertions run before that marker. This is targeted keyboard coverage, not a screen-reader conformance claim. Safari's documented Option-Tab convention is described in [Apple Support](https://support.apple.com/guide/safari/keyboard-shortcuts-and-gestures-cpsh003/mac).

Unknown routes should fall back to All without exceptions, render the saved row and preserve data after reload. The known defect is tracked as [issue #7](https://github.com/darkonaumovski/senior-qa-automation-playwright/issues/7). Fresh-page reproduction bypasses fixture readiness. Known-defect assertions are conditional on the exact affected app revision and are placed after unrelated checks; unexpected errors fail normally and fixed defects produce unexpected passes.

## Reliability and delivery

Local default: automatic workers, zero retries. Headed script: one worker. PR CI: two shards, one worker each and two diagnostic retries, with retry-only passes surfaced in the step summary and first-attempt traces retained. Nightly: independent three-browser matrix, bounded 1–10 repeats, **zero retries**. Review evidence records the exact workers, retries, durations and outcomes, including failed attempts.

The Windows Firefox sandbox workaround is explicit opt-in. Linux and macOS retain normal settings even if that flag is present. Do not increase timeouts without trace evidence that the existing limit is the cause.

Combined-image and separate Compose smoke jobs check the actual served app revision, health, service networking, artifacts and a failing browser assertion's exit status. Local Docker verification and executed CI evidence must be distinguished from workflow code.

## Reporting and maintenance

Allure raw data is unique per run; generating a smoke report after a full run must select only the smoke directory. Static failure categories are triage hints until cause is confirmed.

Before publishing CI reports, validate two shard manifests, the exact full inventory and attempted raw-result counts. Publish complete evidence even when assertions fail. An incomplete shard set cannot replace the previous complete report.

Audit the suite lockfile separately from the pinned app's production closure and upstream development tooling. Keep the app pin until a reviewed replacement has audit and complete matrix evidence. Current findings and residual exposure are in [DEPENDENCY_AUDIT.md](DEPENDENCY_AUDIT.md); measurements and score are in [QA_AUTOMATION_REVIEW.md](QA_AUTOMATION_REVIEW.md).
