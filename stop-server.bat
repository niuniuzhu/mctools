@echo off
setlocal

cd /d "%~dp0"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$scriptDir = (Resolve-Path '.').Path;" ^
  "$pidFile = Join-Path $scriptDir '.mctools-server.pid';" ^
  "$timeoutSeconds = 5;" ^
  "if (-not (Test-Path $pidFile)) { Write-Host 'mctools is not running.'; exit 0 }" ^
  "$serverPidText = Get-Content $pidFile -Raw -ErrorAction SilentlyContinue;" ^
  "$serverPid = if ($null -eq $serverPidText) { '' } else { $serverPidText.Trim() };" ^
  "if (-not $serverPid) { Remove-Item $pidFile -Force -ErrorAction SilentlyContinue; Write-Host 'Removed empty PID file.'; exit 0 }" ^
  "try { Get-Process -Id ([int]$serverPid) -ErrorAction Stop | Out-Null } catch { Remove-Item $pidFile -Force -ErrorAction SilentlyContinue; Write-Host ('Removed stale PID file for process ' + $serverPid + '.'); exit 0 }" ^
  "taskkill /PID $serverPid /T > $null 2>&1;" ^
  "$deadline = (Get-Date).AddSeconds($timeoutSeconds);" ^
  "while ((Get-Date) -lt $deadline) {" ^
  "  try { Get-Process -Id ([int]$serverPid) -ErrorAction Stop | Out-Null; Start-Sleep -Milliseconds 250 } catch { break }" ^
  "}" ^
  "try { Get-Process -Id ([int]$serverPid) -ErrorAction Stop | Out-Null; taskkill /F /PID $serverPid /T > $null 2>&1 } catch {}" ^
  "try { Get-Process -Id ([int]$serverPid) -ErrorAction Stop | Out-Null; Write-Host ('Failed to stop mctools. PID: ' + $serverPid); exit 1 } catch {}" ^
  "Remove-Item $pidFile -Force -ErrorAction SilentlyContinue;" ^
  "Write-Host ('mctools stopped. PID: ' + $serverPid)"

if errorlevel 1 exit /b 1

endlocal