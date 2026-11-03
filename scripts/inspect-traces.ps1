param([Parameter(Mandatory=$true)][string]$TraceRoot, [Parameter(Mandatory=$true)][string]$OutputFile)
Add-Type -AssemblyName System.IO.Compression.FileSystem
$reports = foreach ($file in Get-ChildItem -LiteralPath $TraceRoot -Filter trace.zip -Recurse) {
  $archive = [System.IO.Compression.ZipFile]::OpenRead($file.FullName)
  $actions = @()
  $index = @{}
  try {
    foreach ($entry in $archive.Entries | Where-Object { $_.FullName -like '*.trace' }) {
      $reader = [System.IO.StreamReader]::new($entry.Open())
      try {
        while (($line = $reader.ReadLine()) -ne $null) {
          $event = $line | ConvertFrom-Json
          $key = $entry.FullName + ':' + $event.callId
          if ($event.type -eq 'before') {
            $action = [pscustomobject]@{
              entry=$entry.FullName; callId=$event.callId; method=$event.method; apiName=$event.apiName
              title=$event.title; selector=$event.params.selector; completed=$false; error=$null
            }
            $actions += $action
            $index[$key] = $action
          } elseif ($event.type -eq 'after' -and $index.ContainsKey($key)) {
            $index[$key].completed = $true
            $index[$key].error = $event.error.message
          }
        }
      } finally { $reader.Dispose() }
    }
  } finally { $archive.Dispose() }
  [pscustomobject]@{
    trace=$file.FullName
    hoverCount=@($actions | Where-Object { $_.method -eq 'hover' -or $_.apiName -like '*hover*' }).Count
    assertions=@($actions | Where-Object { $_.entry -eq 'test.trace' -and $_.method -eq 'expect' })
    actions=$actions
  }
}
ConvertTo-Json -InputObject @($reports) -Depth 8 | Set-Content -Encoding utf8 -LiteralPath $OutputFile
