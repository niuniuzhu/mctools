@echo off
setlocal

cd /d "%~dp0"

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

set "PID_FILE=%~dp0.mctools-server.pid"
set "LOG_FILE=%~dp0mctools-server.log"
set "MCTOOLS_PORT=3001"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$scriptDir = (Resolve-Path '.').Path;" ^
  "$pidFile = Join-Path $scriptDir '.mctools-server.pid';" ^
  "$logFile = Join-Path $scriptDir 'mctools-server.log';" ^
  "$port = [Environment]::GetEnvironmentVariable('MCTOOLS_PORT');" ^
  "if (Test-Path $pidFile) {" ^
  "  $existingPidText = Get-Content $pidFile -Raw -ErrorAction SilentlyContinue;" ^
  "  $existingPid = if ($null -eq $existingPidText) { '' } else { $existingPidText.Trim() };" ^
  "  if ($existingPid) {" ^
  "    try { Get-Process -Id ([int]$existingPid) -ErrorAction Stop | Out-Null; Write-Host ('mctools is already running in the background. PID: ' + $existingPid); Write-Host ('Log file: ' + $logFile); exit 0 } catch {}" ^
  "  }" ^
  "  Remove-Item $pidFile -Force -ErrorAction SilentlyContinue;" ^
  "}" ^
  "$commandLine = 'set PORT=' + $port + ' && npm start >> "' + $logFile + '" 2>&1';" ^
  "$process = Start-Process -FilePath 'cmd.exe' -ArgumentList @('/c', $commandLine) -WorkingDirectory $scriptDir -WindowStyle Hidden -PassThru;" ^
  "Set-Content -Path $pidFile -Value $process.Id -NoNewline;" ^
  "Write-Host ('mctools started in the background. PID: ' + $process.Id);" ^
  "Write-Host ('Log file: ' + $logFile);" ^
  "Write-Host ('URL: http://127.0.0.1:' + $port)"

if errorlevel 1 exit /b 1

endlocal