@echo off
setlocal

cd /d "%~dp0"

call "%~dp0stop-server.bat"
if errorlevel 1 exit /b 1

call "%~dp0start-server.bat"
if errorlevel 1 exit /b 1

endlocal