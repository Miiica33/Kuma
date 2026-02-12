@echo off
REM Kuma PWA 语音助手 - Windows 一键启动脚本
REM 使用方法: start.bat

setlocal enabledelayedexpansion

REM 项目根目录
set "ROOT_DIR=%~dp0"
set "BACKEND_DIR=%ROOT_DIR%backend"
set "FRONTEND_DIR=%ROOT_DIR%frontend"

REM 端口配置
set "BACKEND_PORT=8000"
set "FRONTEND_PORT=3000"

REM PID 文件
set "BACKEND_PID_FILE=%ROOT_DIR%.backend.pid"
set "FRONTEND_PID_FILE=%ROOT_DIR%.frontend.pid"

echo ==================================
echo   Kuma PWA 语音助手 - 启动脚本
echo ==================================
echo.

REM 检查 Python
where python >nul 2>&1
if errorlevel 1 (
    echo [错误] Python 未安装
    pause
    exit /b 1
)

REM 检查 Node.js
where node >nul 2>&1
if errorlevel 1 (
    echo [错误] Node.js 未安装
    pause
    exit /b 1
)

REM 检查后端环境
echo [信息] 检查后端环境...
cd /d "%BACKEND_DIR%"
if not exist "venv" (
    echo [信息] 创建 Python 虚拟环境...
    python -m venv venv
)

call venv\Scripts\activate.bat

if not exist "venv\Scripts\uvicorn.exe" (
    echo [信息] 安装后端依赖...
    pip install -q -r requirements.txt
)

REM 检查前端环境
echo [信息] 检查前端环境...
cd /d "%FRONTEND_DIR%"
if not exist "node_modules" (
    echo [信息] 安装前端依赖...
    call npm install --silent
)

REM 检查 .env 文件
if not exist "%ROOT_DIR%.env" (
    echo [警告] .env 文件不存在，使用 .env.example
    if exist "%ROOT_DIR%.env.example" (
        copy "%ROOT_DIR%.env.example" "%ROOT_DIR%.env" >nul
    )
)

REM 启动后端
echo [信息] 启动后端服务 (端口 %BACKEND_PORT%)...
cd /d "%BACKEND_DIR%"
call venv\Scripts\activate.bat
start /B "" uvicorn app.main:app --host 0.0.0.0 --port %BACKEND_PORT% > "%ROOT_DIR%.backend.log" 2>&1

REM 等待后端启动
timeout /t 3 /nobreak >nul

REM 启动前端
echo [信息] 启动前端服务 (端口 %FRONTEND_PORT%)...
cd /d "%FRONTEND_DIR%"
set "NEXT_PUBLIC_API_URL=http://localhost:%BACKEND_PORT%"
start /B "" cmd /c "npm run dev > "%ROOT_DIR%.frontend.log" 2>&1"

REM 等待前端启动
timeout /t 5 /nobreak >nul

REM 打开浏览器
echo [信息] 打开浏览器...
start http://localhost:%FRONTEND_PORT%

echo.
echo ==================================
echo   服务运行中...
echo   前端: http://localhost:%FRONTEND_PORT%
echo   后端: http://localhost:%BACKEND_PORT%
echo   日志: .backend.log 和 .frontend.log
echo.
echo   关闭此窗口将停止所有服务
echo ==================================
echo.

REM 保持窗口打开
pause
