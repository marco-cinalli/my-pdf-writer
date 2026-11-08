@echo off
setlocal
title FolioSign Studio - Launcher
color 0B

:: Navigate automatically to the script directory
cd /d "%~dp0"

echo ========================================================
echo   FolioSign Studio - Automatic Update ^& App Launcher
echo ========================================================
echo.

:: 1. Optional GitHub update if inside a git repository
where git >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    if exist ".git" (
        echo [1/4] Checking for updates from GitHub ^(git pull^)...
        git pull
        echo.
    ) else (
        echo [1/4] Local folder ^(no .git detected^), skipping git pull.
        echo.
    )
) else (
    echo [1/4] Git not detected in PATH, skipping automatic update.
    echo.
)

:: 2. Install/verify dependencies using --legacy-peer-deps
echo [2/4] Installing and verifying dependencies ^(npm install^)...
call npm install --legacy-peer-deps
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo.
    echo [ERROR] A problem occurred during "npm install".
    pause
    exit /b %ERRORLEVEL%
)

:: 3. Ensure a Desktop Shortcut with foliosign.ico exists on Windows Desktop
echo.
echo [3/4] Verifying Windows Desktop shortcut with FolioSign icon...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$desktop = [Environment]::GetFolderPath('Desktop'); $lnkPath = Join-Path $desktop 'FolioSign Studio.lnk'; if (-not (Test-Path $lnkPath)) { $ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut($lnkPath); $s.TargetPath = '%~dp0start_foliosign.bat'; $s.WorkingDirectory = '%~dp0'; if (Test-Path '%~dp0foliosign.ico') { $s.IconLocation = '%~dp0foliosign.ico,0' }; $s.Description = 'FolioSign Studio - Local PDF Workspace'; $s.Save(); Write-Host '   -> Created Desktop shortcut: FolioSign Studio' }" 2>nul

:: 4. Detect Chrome or Edge executable for isolated standalone window (--app mode)
set "BROWSER_EXE="
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    set "BROWSER_EXE=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
) else if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
    set "BROWSER_EXE=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
) else if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" (
    set "BROWSER_EXE=%LocalAppData%\Google\Chrome\Application\chrome.exe"
) else if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
    set "BROWSER_EXE=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
) else if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
    set "BROWSER_EXE=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
)

echo.
echo [4/4] Launching FolioSign Studio in an isolated full-screen window...
echo.
echo   - Local URL: http://localhost:3000
echo   - Desktop Icon: foliosign.ico ^(shortcut created on your Desktop^)
echo   - Close this terminal window when you finish working.
echo ========================================================
echo.

if defined BROWSER_EXE (
    start "" /b cmd /c "timeout /t 3 /nobreak >nul & start "" "%BROWSER_EXE%" --app=http://localhost:3000 --start-maximized"
) else (
    start "" /b cmd /c "timeout /t 3 /nobreak >nul & start msedge --app=http://localhost:3000 --start-maximized"
)

:: Run Vite dev server on port 3000
call npm run dev

pause
