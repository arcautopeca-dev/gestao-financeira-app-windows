@echo off
chcp 65001 >nul
title Criando instalador - Gestao Financeira
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js nao encontrado. Instale a versao LTS em https://nodejs.org e execute este arquivo novamente.
  pause & exit /b 1
)
echo [1/2] Instalando dependencias...
call npm install || (echo Falha no npm install & pause & exit /b 1)
echo [2/2] Gerando instalador do Windows...
call npm run dist || (echo Falha ao gerar o instalador & pause & exit /b 1)
echo.
echo Pronto! O instalador esta na pasta "dist" (Gestao Financeira Setup 1.0.0.exe).
start "" "%~dp0dist"
pause
