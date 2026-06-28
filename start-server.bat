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
  call "%~f0" 3003
  if errorlevel 1 exit /b 1
  endlocal
  exit /b 0
)

set "MCTOOLS_PORT=%~1"
if not defined MCTOOLS_PORT set "MCTOOLS_PORT=3001"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed or not in PATH.
    exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo npm is not installed or not in PATH.
    exit /b 1
)

set "PID_FILE=%~dp0.mctools-server-%MCTOOLS_PORT%.pid"
set "LOG_FILE=%~dp0mctools-server-%MCTOOLS_PORT%.log"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$scriptDir = (Resolve-Path '.').Path;" ^
  "$port = [Environment]::GetEnvironmentVariable('MCTOOLS_PORT');" ^
  "$pidFile = Join-Path $scriptDir ('.mctools-server-' + $port + '.pid');" ^
  "$logFile = Join-Path $scriptDir ('mctools-server-' + $port + '.log');" ^
  "$listenerPids = @();" ^
  "try { $listenerPids = @(Get-NetTCPConnection -State Listen -LocalPort ([int]$port) -ErrorAction Stop | Select-Object -ExpandProperty OwningProcess -Unique) } catch {}" ^
  "if (Test-Path $pidFile) {" ^
  "  $existingPidText = Get-Content $pidFile -Raw -ErrorAction SilentlyContinue;" ^
  "  $existingPid = if ($null -eq $existingPidText) { '' } else { $existingPidText.Trim() };" ^
  "  if ($existingPid) {" ^
  "    try { Get-Process -Id ([int]$existingPid) -ErrorAction Stop | Out-Null; Write-Host ('mctools is already running in the background. PID: ' + $existingPid); Write-Host ('Log file: ' + $logFile); exit 0 } catch {}" ^
  "  }" ^
  "  Remove-Item $pidFile -Force -ErrorAction SilentlyContinue;" ^
  "}" ^
  "if ($listenerPids.Count -gt 0) {" ^
  "  $processDetails = Get-CimInstance Win32_Process | Where-Object { $listenerPids -contains $_.ProcessId } | Select-Object ProcessId,Name,CommandLine;" ^
  "  $mctoolsProcess = $processDetails | Where-Object { ($_.CommandLine -like '*server.js*') -or ($_.CommandLine -like '*mctools*') } | Select-Object -First 1;" ^
  "  if ($mctoolsProcess) { Write-Host ('mctools already owns port ' + $port + '. PID: ' + $mctoolsProcess.ProcessId); exit 0 }" ^
  "  $recoverableBlockers = @($processDetails | Where-Object { $_.Name -eq 'Code.exe' -and $_.CommandLine -like '*node.mojom.NodeService*' });" ^
  "  if ($recoverableBlockers.Count -gt 0 -and $recoverableBlockers.Count -eq $processDetails.Count) {" ^
  "    foreach ($blocker in $recoverableBlockers) { try { Stop-Process -Id $blocker.ProcessId -Force -ErrorAction Stop } catch {} }" ^
  "    try { $listenerPids = @(Get-NetTCPConnection -State Listen -LocalPort ([int]$port) -ErrorAction Stop | Select-Object -ExpandProperty OwningProcess -Unique) } catch { $listenerPids = @() }" ^
  "    if ($listenerPids.Count -eq 0) { $processDetails = @() } else { $processDetails = Get-CimInstance Win32_Process | Where-Object { $listenerPids -contains $_.ProcessId } | Select-Object ProcessId,Name,CommandLine }" ^
  "  }" ^
  "  if ($processDetails.Count -eq 0) { $listenerPids = @() }" ^
  "}" ^
  "if ($listenerPids.Count -gt 0) {" ^
  "  $occupiedBy = $processDetails | ForEach-Object { $_.Name + ' (PID ' + $_.ProcessId + ')' };" ^
  "  Write-Host ('Port ' + $port + ' is already in use by: ' + ($occupiedBy -join ', '));" ^
  "  exit 1;" ^
  "}" ^
  "$commandLine = 'set PORT=' + $port + ' && node server.js >> \"' + $logFile + '\" 2>&1';" ^
  "$process = Start-Process -FilePath 'cmd.exe' -ArgumentList @('/c', $commandLine) -WorkingDirectory $scriptDir -WindowStyle Hidden -PassThru;" ^
  "Set-Content -Path $pidFile -Value $process.Id -NoNewline;" ^
  "Write-Host ('mctools started in the background. PID: ' + $process.Id);" ^
  "Write-Host ('Log file: ' + $logFile);" ^
  "Write-Host ('URL: http://127.0.0.1:' + $port)"

if errorlevel 1 exit /b 1

endlocal