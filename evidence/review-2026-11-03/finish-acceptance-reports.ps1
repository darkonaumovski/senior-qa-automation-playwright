$evidence='evidence/review-2026-11-03'
$native=Get-Content "$evidence/acceptance-native-run-paths.json" -Raw | ConvertFrom-Json
if (@($native.attempts | Where-Object exitCode -ne 0).Count) { throw 'Acceptance matrix needs investigation' }
Copy-Item "$evidence/report-isolation.json" "$evidence/initial-report-isolation.json"
Copy-Item "$evidence/missing-shard-proof.json" "$evidence/initial-missing-shard-proof.json"
node scripts/generate-report.mjs $native.merged *> "$evidence/full-report.log"
if ($LASTEXITCODE -ne 0) { throw 'Full report generation failed' }
Copy-Item allure-report/widgets/summary.json "$evidence/full-report-summary.json"
$fullSummary=Get-Content allure-report/widgets/summary.json -Raw | ConvertFrom-Json
if ($fullSummary.statistic.total -ne 207) { throw 'Full report inventory mismatch' }
$fullReport='.runs/full-report-' + [guid]::NewGuid().ToString()
Copy-Item allure-report $fullReport -Recurse
$before=(Get-FileHash allure-report/index.html).Hash
$missingOutput='.runs/missing-shard-' + [guid]::NewGuid().ToString()
node scripts/merge-shards.mjs "$($native.root)/shard1" "$evidence/acceptance-native-expected-ids.json" $missingOutput *> "$evidence/missing-shard.log"
$code=$LASTEXITCODE
$after=(Get-FileHash allure-report/index.html).Hash
@{exitCode=$code; before=$before; after=$after; publicationUnchanged=($before -eq $after); mergeOutputAbsent=(!(Test-Path $missingOutput))} | ConvertTo-Json | Set-Content -Encoding utf8 "$evidence/missing-shard-proof.json"
if ($code -ne 1 -or $before -ne $after -or (Test-Path $missingOutput)) { throw 'Missing shard affected publication' }
$env:TODO_BASE_URL='http://localhost:8088'
$env:APP_SOURCE_DIR='kitchensink'
Remove-Item Env:APP_REVISION_FILE -ErrorAction SilentlyContinue
Remove-Item Env:FIREFOX_WINDOWS_SANDBOX_WORKAROUND -ErrorAction SilentlyContinue
$env:INVENTORY_FILE="$evidence/smoke-expected-ids.json"
npx playwright test --list --grep '@smoke' --reporter=./scripts/inventory-reporter.ts
if ($LASTEXITCODE -ne 0) { throw 'Smoke discovery failed' }
$env:QA_RUN_ID='acceptance-smoke-' + [guid]::NewGuid().ToString()
npx playwright test --grep '@smoke' --workers=1 --retries=0 "--output=$evidence/acceptance-smoke-artifacts" *> "$evidence/acceptance-smoke-run.log"
if ($LASTEXITCODE -ne 0) { throw 'Smoke execution failed' }
$smoke=".runs/$env:QA_RUN_ID/allure-results"
node scripts/generate-report.mjs $smoke *> "$evidence/smoke-report.log"
if ($LASTEXITCODE -ne 0) { throw 'Smoke report generation failed' }
Copy-Item allure-report/widgets/summary.json "$evidence/smoke-report-summary.json"
$summary=Get-Content allure-report/widgets/summary.json -Raw | ConvertFrom-Json
$raw=@(Get-ChildItem $smoke -Filter '*-result.json' | ForEach-Object { Get-Content $_.FullName -Raw | ConvertFrom-Json })
$ids=@($raw | ForEach-Object { @($_.labels | Where-Object name -eq 'playwright_id')[0].value })
$expected=@(Get-Content "$evidence/smoke-expected-ids.json" -Raw | ConvertFrom-Json)
$tagged=@($raw | Where-Object { @($_.labels | Where-Object { $_.name -eq 'tag' -and $_.value -in @('smoke','@smoke') }).Count -gt 0 }).Count
$reportFiles=@(Get-ChildItem allure-report/data/test-cases -Filter '*.json').Count
$matches=(@(Compare-Object $expected $ids).Count -eq 0 -and $expected.Count -eq 30 -and $ids.Count -eq 30)
$passed=($summary.statistic.total -eq 30 -and $raw.Count -eq 30 -and $tagged -eq 30 -and $reportFiles -eq 30 -and $matches)
@{fullReport=$fullReport;fullResults=$native.merged;fullTotal=$fullSummary.statistic.total;smokeResults=$smoke;smokeReportTotal=$summary.statistic.total;smokeRawCount=$raw.Count;smokeReportCaseFiles=$reportFiles;allSmokeTagged=($tagged -eq 30);matchesCurrentSmokeInventory=$matches;isolationPassed=$passed} | ConvertTo-Json -Depth 6 | Set-Content -Encoding utf8 "$evidence/report-isolation.json"
if (!$passed) { throw 'Smoke contains stale or unexpected results' }

