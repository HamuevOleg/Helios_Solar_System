@echo off
chcp 65001 >nul
setlocal

REM ════════════════════════════════════════════════════════════════
REM  HELIOS v2.4 — двойной клик для запуска всего стека на Windows
REM ════════════════════════════════════════════════════════════════

echo.
echo  ╔════════════════════════════════════════╗
echo  ║   HELIOS v2.4 — Solar Tracker launcher  ║
echo  ╚════════════════════════════════════════╝
echo.

REM ── Проверка наличия Bun ────────────────────────────────────────
where bun >nul 2>nul
if errorlevel 1 (
    echo [!] Bun не найден в PATH.
    echo     Установи его одной командой в PowerShell:
    echo.
    echo     powershell -c "irm bun.sh/install.ps1 ^| iex"
    echo.
    echo     Подробности: https://bun.sh
    pause
    exit /b 1
)

cd /d "%~dp0"

REM ── Установка зависимостей бэка ─────────────────────────────────
echo [1/4] Installing backend deps...
pushd backend
if not exist node_modules (
    call bun install
    if errorlevel 1 (
        echo [!] backend bun install failed
        popd
        pause
        exit /b 1
    )
) else (
    echo      already installed, skipping
)
popd

REM ── Установка зависимостей фронта ───────────────────────────────
echo [2/4] Installing frontend deps...
pushd frontend
if not exist node_modules (
    call bun install
    if errorlevel 1 (
        echo [!] frontend bun install failed
        popd
        pause
        exit /b 1
    )
) else (
    echo      already installed, skipping
)
popd

REM ── Запуск бэка и фронта в отдельных окнах ──────────────────────
echo [3/4] Starting backend on http://localhost:8787 ...
start "HELIOS backend" cmd /k "cd /d %~dp0backend && bun run dev"

REM Даём бэку время поднять MQTT
timeout /t 2 /nobreak >nul

echo [4/4] Starting frontend on http://localhost:5173 ...
start "HELIOS frontend" cmd /k "cd /d %~dp0frontend && bun run dev"

echo.
echo  ────────────────────────────────────────────
echo   Backend:   http://localhost:8787
echo   Frontend:  http://localhost:5173
echo  ────────────────────────────────────────────
echo.
echo   Дай фронту 3-5 сек на старт, потом открой в браузере:
echo   http://localhost:5173
echo.

REM ── Опционально: открыть браузер сразу ──────────────────────────
timeout /t 5 /nobreak >nul
start "" http://localhost:5173

echo Все процессы запущены в отдельных окнах. Это окно можно закрыть.
echo.
pause
