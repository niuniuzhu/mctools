@echo off
setlocal

cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
    echo Node.js 未安装或未加入 PATH，无法启动服务。
    pause
    exit /b 1
)

start "mctools-server" cmd /k "cd /d ""%~dp0"" && npm start"

endlocal