param([string]$EvidencePrefix = 'native')
# Run from the repository root in the supported host shell.
$env:TODO_BASE_URL = 'http://localhost:8088'
$env:APP_SOURCE_DIR = 'kitchensink'
Remove-Item Env:FIREFOX_WINDOWS_SANDBOX_WORKAROUND -ErrorAction SilentlyContinue
Remove-Item Env:APP_REVISION_FILE -ErrorAction SilentlyContinue
$evidenceDirectory = 'evidence/review-2026-11-03'
$runLabel = 'native-matrix-' + [guid]::NewGuid().ToString()
$env:INVENTORY_FILE = "$evidenceDirectory/$EvidencePrefix-expected-ids.json"
npx playwright test --list --reporter=./scripts/inventory-reporter.ts
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
$attempts = @()
foreach ($shard in 1,2) {
  $env:QA_RUN_ID = "$runLabel/shard$shard"
  $watch = [Diagnostics.Stopwatch]::StartNew()
  npx playwright test "--shard=$shard/2" --workers=1 --retries=0 "--output=$evidenceDirectory/$EvidencePrefix-shard-$shard-artifacts" *> "$evidenceDirectory/$EvidencePrefix-shard-$shard.log"
  $code = $LASTEXITCODE
  $watch.Stop()
  $attempts += [pscustomobject]@{ shard=$shard; exitCode=$code; seconds=$watch.Elapsed.TotalSeconds; workers=1; retries=0 }
}
$merged = ".runs/$runLabel-complete"
@{ root=".runs/$runLabel"; merged=$merged; attempts=$attempts } | ConvertTo-Json -Depth 6 | Set-Content -Encoding utf8 "$evidenceDirectory/$EvidencePrefix-run-paths.json"
node scripts/merge-shards.mjs ".runs/$runLabel" $env:INVENTORY_FILE $merged *> "$evidenceDirectory/$EvidencePrefix-merge.log"
exit $LASTEXITCODE

