@echo off
setlocal

cd /d "%~dp0"

if "%~1"=="" (
  call "%~f0" 3000
  if errorlevel 1 exit /b 1
  call "%~f0" 3001
  if errorlevel 1 exit /b 1
  call "%~f0" 3002
  if errorlevel 1 exit /b 1
  endlocal
  exit /b 0
)

set "MCTOOLS_PORT=%~1"
if not defined MCTOOLS_PORT set "MCTOOLS_PORT=3001"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$scriptDir = (Resolve-Path '.').Path;" ^
  "$port = [Environment]::GetEnvironmentVariable('MCTOOLS_PORT');" ^
  "$pidFile = Join-Path $scriptDir ('.mctools-server-' + $port + '.pid');" ^
  "$timeoutSeconds = 5;" ^
  "$serverPidText = if (Test-Path $pidFile) { Get-Content $pidFile -Raw -ErrorAction SilentlyContinue } else { '' };" ^
  "$serverPid = if ($null -eq $serverPidText) { '' } else { $serverPidText.Trim() };" ^
  "$candidatePids = @();" ^
  "if ($serverPid) { $candidatePids += [int]$serverPid }" ^
  "try { $candidatePids += @(Get-NetTCPConnection -State Listen -LocalPort ([int]$port) -ErrorAction Stop | Select-Object -ExpandProperty OwningProcess -Unique) } catch {}" ^
  "$candidatePids = @($candidatePids | Where-Object { $_ } | Sort-Object -Unique);" ^
  "if ($candidatePids.Count -eq 0) { if (Test-Path $pidFile) { Remove-Item $pidFile -Force -ErrorAction SilentlyContinue }; Write-Host ('mctools is not running on port ' + $port + '.'); exit 0 }" ^
  "$matchedPids = @();" ^
  "foreach ($candidatePid in $candidatePids) {" ^
  "  try {" ^
  "    $proc = Get-CimInstance Win32_Process -Filter ('ProcessId = ' + $candidatePid);" ^
  "    if ($proc -and (($proc.CommandLine -like '*server.js*') -or ($proc.CommandLine -like '*mctools*'))) { $matchedPids += $candidatePid }" ^
  "  } catch {}" ^
  "}" ^
  "if ($matchedPids.Count -eq 0) {" ^
  "  $foreignPids = $candidatePids | ForEach-Object { try { Get-CimInstance Win32_Process -Filter ('ProcessId = ' + $_) | Select-Object -First 1 } catch { $null } } | Where-Object { $_ };" ^
  "  if (Test-Path $pidFile) { Remove-Item $pidFile -Force -ErrorAction SilentlyContinue }" ^
  "  if ($foreignPids) {" ^
  "    $occupiedBy = $foreignPids | ForEach-Object { $_.Name + ' (PID ' + $_.ProcessId + ')' };" ^
  "    Write-Host ('Port ' + $port + ' is occupied by non-mctools process: ' + ($occupiedBy -join ', '));" ^
  "    exit 1;" ^
  "  }" ^
  "  Write-Host ('mctools is not running on port ' + $port + '.');" ^
  "  exit 0;" ^
  "}" ^
  "foreach ($matchedPid in $matchedPids) { taskkill /F /PID $matchedPid /T > $null 2>&1 }" ^
  "$deadline = (Get-Date).AddSeconds($timeoutSeconds);" ^
  "while ((Get-Date) -lt $deadline) {" ^
  "  $remainingPids = @();" ^
  "  try { $remainingPids = @(Get-NetTCPConnection -State Listen -LocalPort ([int]$port) -ErrorAction Stop | Select-Object -ExpandProperty OwningProcess -Unique) } catch {}" ^
  "  $remainingMctools = @();" ^
  "  foreach ($remainingPid in $remainingPids) {" ^
  "    try {" ^
  "      $remainingProc = Get-CimInstance Win32_Process -Filter ('ProcessId = ' + $remainingPid);" ^
  "      if ($remainingProc -and (($remainingProc.CommandLine -like '*server.js*') -or ($remainingProc.CommandLine -like '*mctools*'))) { $remainingMctools += $remainingPid }" ^
  "    } catch {}" ^
  "  }" ^
  "  if ($remainingMctools.Count -eq 0) { break }" ^
  "  Start-Sleep -Milliseconds 250;" ^
  "}" ^
  "foreach ($matchedPid in $matchedPids) { try { Get-Process -Id ([int]$matchedPid) -ErrorAction Stop | Out-Null; taskkill /F /PID $matchedPid /T > $null 2>&1 } catch {} }" ^
  "$failedPids = @();" ^
  "try {" ^
  "  $failedPids = @(Get-NetTCPConnection -State Listen -LocalPort ([int]$port) -ErrorAction Stop | Select-Object -ExpandProperty OwningProcess -Unique);" ^
  "} catch {" ^
  "  $failedPids = @();" ^
  "}" ^
  "$failedPids = @($failedPids | ForEach-Object { try { Get-CimInstance Win32_Process -Filter ('ProcessId = ' + $_) | Select-Object -First 1 } catch { $null } } | Where-Object { $_ -and (($_.CommandLine -like '*server.js*') -or ($_.CommandLine -like '*mctools*')) } | Select-Object -ExpandProperty ProcessId -Unique);" ^
  "if ($failedPids.Count -gt 0) { Write-Host ('Failed to stop mctools. PID: ' + ($failedPids -join ', ')); exit 1 }" ^
  "Remove-Item $pidFile -Force -ErrorAction SilentlyContinue;" ^
  "Write-Host ('mctools stopped. PID: ' + ($matchedPids -join ', ') + ' (port ' + $port + ')')"

if errorlevel 1 exit /b 1

endlocal