@echo off
REM Kuma PWA 语音助手 - 一键环境准备脚本（Windows）
REM 用法: setup.bat 或 setup.bat /download-asr
setlocal enabledelayedexpansion

set "ROOT_DIR=%~dp0"
set "BACKEND_DIR=%ROOT_DIR%backend"
set "FRONTEND_DIR=%ROOT_DIR%frontend"
set "DOWNLOAD_ASR=0"
if /i "%1"=="/download-asr" set "DOWNLOAD_ASR=1"

echo ==========================================
echo   Kuma - 一键环境准备
echo ==========================================
echo.

REM ---------- 检查 Python ----------
where python >nul 2>&1
if errorlevel 1 (
    echo [错误] 未检测到 Python。请先安装 Python 3.10+
    echo 下载: https://www.python.org/downloads/
    echo 或执行: winget install Python.Python.3.10
    pause
    exit /b 1
)
for /f "tokens=2 delims= " %%v in ('python --version 2^>^&1') do set PYVER=%%v
echo [OK] Python %PYVER%

REM ---------- 检查 Node.js ----------
where node >nul 2>&1
if errorlevel 1 (
    echo [错误] 未检测到 Node.js。请先安装 Node.js 18+
    echo 下载: https://nodejs.org/
    echo 或执行: winget install OpenJS.NodeJS.LTS
    pause
    exit /b 1
)
echo [OK] Node.js
node -v

REM ---------- 检查 ffmpeg ----------
where ffmpeg >nul 2>&1
if errorlevel 1 (
    echo [警告] 未检测到 ffmpeg，语音识别可能不可用。
    echo 下载: https://ffmpeg.org/download.html 或 winget install Gyan.FFmpeg
) else (
    echo [OK] ffmpeg
)

REM ---------- 创建 .env ----------
if not exist "%ROOT_DIR%.env" (
    echo [信息] 创建 .env...
    copy "%ROOT_DIR%.env.example" "%ROOT_DIR%.env" >nul
    echo [OK] .env 已创建，请编辑并填入 ARK_API_KEY
) else (
    echo [OK] .env 已存在
)

REM ---------- 后端虚拟环境与依赖 ----------
echo [信息] 准备后端环境...
cd /d "%BACKEND_DIR%"
if not exist "venv" (
    echo [信息] 创建 Python 虚拟环境...
    python -m venv venv
)
call venv\Scripts\activate.bat
python -c "import uvicorn" 2>nul
if errorlevel 1 (
    echo [信息] 安装后端依赖（首次较慢）...
    pip install -q -r requirements.txt
)
echo [OK] 后端环境就绪

REM ---------- 可选：下载 ASR 模型 ----------
if exist "models\SenseVoiceSmall\model.pt" (
    echo [OK] ASR 模型已存在
) else (
    if "%DOWNLOAD_ASR%"=="1" (
        echo [信息] 下载语音识别模型（约 893MB）...
        python scripts\download_sense_voice_small.py
        echo [OK] ASR 模型已就绪
    ) else (
        set /p ASR="是否下载语音识别模型（约 893MB）？[y/N]: "
        if /i "!ASR!"=="y" (
            python scripts\download_sense_voice_small.py
            echo [OK] ASR 模型已就绪
        ) else (
            echo [信息] 已跳过。可稍后在 backend 目录运行: python scripts\download_sense_voice_small.py
        )
    )
)

REM ---------- 前端依赖 ----------
echo [信息] 准备前端环境...
cd /d "%FRONTEND_DIR%"
if not exist "node_modules" (
    echo [信息] 安装前端依赖（首次较慢）...
    call npm install --silent
)
echo [OK] 前端环境就绪

echo.
echo ==========================================
echo   环境准备完成
echo ==========================================
echo.
echo   1. 若尚未填写，请编辑 .env 填入 ARK_API_KEY
echo   2. 启动应用: start.bat
echo   或一键部署并启动: deploy.bat
echo.
pause
