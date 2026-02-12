@echo off
REM Kuma PWA 语音助手 - 一键部署并启动（Windows）
setlocal enabledelayedexpansion
set "ROOT_DIR=%~dp0"

REM 1. 环境准备
call "%ROOT_DIR%setup.bat" %*

REM 2. 提示填写 API Key（简单检查：若 .env 里仍包含占位符则提示）
findstr /b "ARK_API_KEY=your_ark_api_key_here" "%ROOT_DIR%.env" >nul 2>&1
if not errorlevel 1 (
    echo [提示] 请在 .env 中填入 ARK_API_KEY 后按任意键继续...
    pause >nul
)

REM 3. 启动服务
call "%ROOT_DIR%start.bat"
