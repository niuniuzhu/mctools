@echo off
setlocal

cd /d "%~dp0"

if "%~1"=="" (
	call "%~dp0stop-server.bat" 3000
	if errorlevel 1 exit /b 1
	call "%~dp0stop-server.bat" 3001
	if errorlevel 1 exit /b 1
	call "%~dp0stop-server.bat" 3002
	if errorlevel 1 exit /b 1
	call "%~dp0stop-server.bat" 3003
	if errorlevel 1 exit /b 1
	call "%~dp0start-server.bat" 3000
	if errorlevel 1 exit /b 1
	call "%~dp0start-server.bat" 3001
	if errorlevel 1 exit /b 1
	call "%~dp0start-server.bat" 3002
	if errorlevel 1 exit /b 1
	call "%~dp0start-server.bat" 3003
	if errorlevel 1 exit /b 1
	endlocal
	exit /b 0
)

call "%~dp0stop-server.bat" %1
if errorlevel 1 exit /b 1

call "%~dp0start-server.bat" %1
if errorlevel 1 exit /b 1

endlocal