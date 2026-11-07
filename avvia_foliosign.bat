@echo off
chcp 65001 >nul
title FolioSign Studio - Avvio Locale

:: Imposta la cartella di lavoro nella directory in cui si trova questo file .bat
cd /d "%~dp0"

echo ========================================================
echo   FolioSign Studio - Aggiornamento e Avvio Automatico
echo ========================================================
echo.

:: Verifica che Node/NPM siano presenti nel PATH
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERRORE] npm non trovato. Assicurati che Node.js sia installato.
    pause
    exit /b 1
)

:: Se la cartella è un repository Git, prova ad aggiornare dal repository remoto
if exist ".git" (
    where git >nul 2>nul
    if %errorlevel% equ 0 (
        echo [1/3] Controllo aggiornamenti da GitHub ^(git pull^)...
        call git pull
        echo.
    )
)

echo [2/3] Installazione e verifica dipendenze ^(npm install^)...
call npm install
if %errorlevel% neq 0 (
    echo.
    echo [ERRORE] Si e' verificato un problema durante "npm install".
    pause
    exit /b %errorlevel%
)

echo.
echo [3/3] Avvio di FolioSign Studio su http://localhost:3000 ...
echo       ^(Premi CTRL+C in questa finestra per arrestare il server^)
echo.

:: Apre automaticamente il browser predefinito su http://localhost:3000 dopo 2 secondi
start "" cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:3000"

call npm run dev

pause
