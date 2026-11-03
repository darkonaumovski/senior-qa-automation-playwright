param([string]$RepeatPrefix = 'webkit-final')
# Run after final-native-run-paths.json exists and its two shards passed.
$evidence = 'evidence/review-2026-11-03'
$native = Get-Content "$evidence/final-native-run-paths.json" -Raw | ConvertFrom-Json
if (@($native.attempts | Where-Object exitCode -ne 0).Count) { throw 'Final native matrix has failures to investigate' }
$env:TODO_BASE_URL='http://localhost:8088'
$env:APP_SOURCE_DIR='kitchensink'
Remove-Item Env:FIREFOX_WINDOWS_SANDBOX_WORKAROUND -ErrorAction SilentlyContinue
$repeats=@()
foreach ($workers in 1,2) {
  $env:QA_RUN_ID="$RepeatPrefix-w$workers-" + [guid]::NewGuid().ToString()
  $watch=[Diagnostics.Stopwatch]::StartNew()
  npx playwright test tests/todo/lifecycle.spec.ts --project=webkit --grep 'seed todos while preserving|reload an empty filtered view|leave unrelated storage untouched when seeding' --repeat-each=3 --retries=0 "--workers=$workers" --trace=on "--output=$evidence/$RepeatPrefix-w$workers-artifacts" *> "$evidence/$RepeatPrefix-w$workers.log"
  $code=$LASTEXITCODE
  $watch.Stop()
  $repeats += @{workers=$workers; retries=0; repetitions=3; executions=9; exitCode=$code; seconds=$watch.Elapsed.TotalSeconds; resultsDir=".runs/$env:QA_RUN_ID/allure-results"}
}
$repeats | ConvertTo-Json -Depth 6 | Set-Content -Encoding utf8 "$evidence/$RepeatPrefix-repeats.json"
if (@($repeats | Where-Object exitCode -ne 0).Count) { throw 'WebKit repetitions need investigation' }

# Verify an unverified target is never attributed using the requested APP_COMMIT.
$env:TODO_BASE_URL='http://127.0.0.1:8088'
Remove-Item Env:APP_SOURCE_DIR -ErrorAction SilentlyContinue
Remove-Item Env:APP_REVISION_FILE -ErrorAction SilentlyContinue
$env:APP_COMMIT=(Get-Content .app-commit -Raw).Trim()
$env:QA_RUN_ID='unverified-target-' + [guid]::NewGuid().ToString()
npx playwright test tests/todo/add.spec.ts --project=chromium --grep 'single todo' --workers=1 --retries=0 "--output=$evidence/provenance-artifacts" *> "$evidence/provenance-run.log"
if ($LASTEXITCODE -ne 0) { throw 'Provenance control failed' }
$metadata=Get-Content ".runs/$env:QA_RUN_ID/allure-results/environment.properties" -Raw
if ($metadata -notmatch '(?m)^APP_COMMIT=unknown\r?$') { throw 'Unverified target was incorrectly attributed' }
$metadata | Set-Content -Encoding utf8 "$evidence/unverified-target-environment.properties"

# A complete full report, then the missing-shard publication check.
node scripts/generate-report.mjs $native.merged *> "$evidence/full-report.log"
if ($LASTEXITCODE -ne 0) { throw 'Full report generation failed' }
Copy-Item allure-report/widgets/summary.json "$evidence/full-report-summary.json"
$fullReport=".runs/full-report-" + [guid]::NewGuid().ToString()
Copy-Item allure-report $fullReport -Recurse
$before=(Get-FileHash allure-report/index.html).Hash
$missingOutput='.runs/missing-shard-' + [guid]::NewGuid().ToString()
node scripts/merge-shards.mjs "$($native.root)/shard1" "$evidence/final-native-expected-ids.json" $missingOutput *> "$evidence/missing-shard.log"
$missingCode=$LASTEXITCODE
$after=(Get-FileHash allure-report/index.html).Hash
@{exitCode=$missingCode; before=$before; after=$after; publicationUnchanged=($before -eq $after); mergeOutputAbsent=(!(Test-Path $missingOutput))} | ConvertTo-Json | Set-Content -Encoding utf8 "$evidence/missing-shard-proof.json"
if ($missingCode -ne 1 -or $before -ne $after -or (Test-Path $missingOutput)) { throw 'Incomplete run affected publication' }

# A fresh smoke run and report must contain exactly 10 cases x 3 engines.
$env:TODO_BASE_URL='http://localhost:8088'
$env:APP_SOURCE_DIR='kitchensink'
$env:QA_RUN_ID='smoke-isolation-' + [guid]::NewGuid().ToString()
npx playwright test --grep '@smoke' --workers=1 --retries=0 "--output=$evidence/smoke-artifacts" *> "$evidence/smoke-run.log"
if ($LASTEXITCODE -ne 0) { throw 'Smoke run failed' }
$smoke=".runs/$env:QA_RUN_ID/allure-results"
node scripts/generate-report.mjs $smoke *> "$evidence/smoke-report.log"
if ($LASTEXITCODE -ne 0) { throw 'Smoke report generation failed' }
Copy-Item allure-report/widgets/summary.json "$evidence/smoke-report-summary.json"
$summary=Get-Content allure-report/widgets/summary.json -Raw | ConvertFrom-Json
$count=@(Get-ChildItem $smoke -Filter '*-result.json').Count
@{fullReport=$fullReport; fullResults=$native.merged; smokeResults=$smoke; smokeReportTotal=$summary.statistic.total; smokeRawCount=$count; isolationPassed=($summary.statistic.total -eq 30 -and $count -eq 30)} | ConvertTo-Json -Depth 5 | Set-Content -Encoding utf8 "$evidence/report-isolation.json"
if ($summary.statistic.total -ne 30 -or $count -ne 30) { throw 'Smoke report contains stale results' }

