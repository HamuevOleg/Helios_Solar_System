@echo off
chcp 65001 >nul

REM Грубо, но работает: закрываем все окна с заголовком HELIOS и заодно
REM прибиваем bun-процессы на 8787/5173.

echo Killing bun processes on ports 8787 and 5173...

for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8787" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a 2>nul
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a 2>nul
)

REM На всякий случай закроем окна с этими заголовками
taskkill /F /FI "WINDOWTITLE eq HELIOS backend*" 2>nul
taskkill /F /FI "WINDOWTITLE eq HELIOS frontend*" 2>nul

echo Done.
pause
