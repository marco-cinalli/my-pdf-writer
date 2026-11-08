@echo off
chcp 65001 >nul
title FolioSign Studio - Local App Launcher

:: Set working directory to the folder containing this .bat file
cd /d "%~dp0"

echo ========================================================
echo   FolioSign Studio - Auto Update ^& Standalone Launch
echo ========================================================
echo.

:: Verify that npm is installed
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] npm was not found. Please make sure Node.js is installed.
    pause
    exit /b 1
)

:: Pull latest updates if this folder is a Git repository
if exist ".git" (
    where git >nul 2>nul
    if %errorlevel% equ 0 (
        echo [1/3] Checking for updates from GitHub ^(git pull^)...
        call git pull
        echo.
    )
)

echo [2/3] Verifying and installing dependencies ^(npm install^)...
call npm install --legacy-peer-deps
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] A problem occurred during "npm install".
    pause
    exit /b %errorlevel%
)

echo.
echo [3/3] Launching FolioSign Studio in an isolated desktop window...
echo       ^(Keep this console window open while using the app; press CTRL+C to stop^)
echo.

:: Launch in an isolated, maximized standalone app window (Chrome or Edge --app mode) after 2 seconds
start "" cmd /c "timeout /t 2 /nobreak >nul & (where chrome >nul 2>nul && start "" chrome --app=http://localhost:3000 --start-maximized || (where msedge >nul 2>nul && start "" msedge --app=http://localhost:3000 --start-maximized || (if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" --app=http://localhost:3000 --start-maximized) else if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" --app=http://localhost:3000 --start-maximized) else if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (start "" "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" --app=http://localhost:3000 --start-maximized) else (start http://localhost:3000))))"

call npm run dev

pause
