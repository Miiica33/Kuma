# 一键启动指南

## 概述

项目提供了三种一键启动脚本，可以自动完成环境检查、依赖安装、服务启动和浏览器打开等操作。

## 脚本说明

### 1. start.sh (macOS / Linux)

适用于 macOS 和 Linux 系统的 Shell 脚本。

**使用方法：**
```bash
./start.sh
```

**功能：**
- ✅ 检查 Python 3 和 Node.js 环境
- ✅ 自动创建 Python 虚拟环境
- ✅ 自动安装后端和前端依赖
- ✅ 检查并创建 .env 文件
- ✅ 后台启动后端服务（端口 8000）
- ✅ 后台启动前端服务（端口 3000）
- ✅ 等待服务就绪后自动打开浏览器
- ✅ 优雅的进程管理和清理（Ctrl+C）

**日志文件：**
- `.backend.log` - 后端服务日志
- `.frontend.log` - 前端服务日志

**停止服务：**
按 `Ctrl+C` 即可停止所有服务

### 2. start.bat (Windows)

适用于 Windows 系统的批处理脚本。

**使用方法：**
```cmd
start.bat
```

**功能：**
- ✅ 检查 Python 和 Node.js 环境
- ✅ 自动创建 Python 虚拟环境
- ✅ 自动安装后端和前端依赖
- ✅ 检查并创建 .env 文件
- ✅ 启动后端服务（端口 8000）
- ✅ 启动前端服务（端口 3000）
- ✅ 自动打开浏览器

**日志文件：**
- `.backend.log` - 后端服务日志
- `.frontend.log` - 前端服务日志

**停止服务：**
关闭命令窗口即可停止所有服务

### 3. start.js (跨平台)

使用 Node.js 编写的跨平台启动脚本，适用于所有操作系统。

**使用方法：**
```bash
node start.js
```

**功能：**
- ✅ 跨平台支持（macOS、Linux、Windows）
- ✅ 检查 Python 和 Node.js 环境
- ✅ 自动创建 Python 虚拟环境
- ✅ 自动安装后端和前端依赖
- ✅ 检查并创建 .env 文件
- ✅ 启动后端服务（端口 8000）
- ✅ 启动前端服务（端口 3000）
- ✅ 等待服务就绪后自动打开浏览器
- ✅ 优雅的进程管理和清理（Ctrl+C）

**停止服务：**
按 `Ctrl+C` 即可停止所有服务

## 环境要求

### 必需软件

1. **Python 3.10+**
   - macOS/Linux: 通常已预装，或使用 `brew install python3`
   - Windows: 从 [python.org](https://www.python.org/downloads/) 下载安装

2. **Node.js 18+**
   - macOS/Linux: 使用 [nvm](https://github.com/nvm-sh/nvm) 或从 [nodejs.org](https://nodejs.org/) 下载
   - Windows: 从 [nodejs.org](https://nodejs.org/) 下载安装

3. **npm**（随 Node.js 一起安装）

### 可选软件

- **curl**（用于健康检查，大多数系统已预装）

## 首次运行

首次运行时，脚本会自动：

1. **创建 Python 虚拟环境**
   - 位置：`backend/venv/`
   - 如果已存在，会跳过此步骤

2. **安装后端依赖**
   - 从 `backend/requirements.txt` 安装所有 Python 包
   - 包括 FastAPI、FunASR、火山引擎 SDK 等

3. **安装前端依赖**
   - 从 `frontend/package.json` 安装所有 Node.js 包
   - 包括 Next.js、React、Tailwind CSS 等

4. **创建 .env 文件**
   - 如果不存在，会从 `.env.example` 复制
   - **重要**：需要手动编辑 `.env` 文件，填入火山引擎 API Key

## 常见问题

### 1. 端口被占用

如果端口 8000 或 3000 已被占用，需要：

**方法 1：停止占用端口的进程**
```bash
# macOS/Linux
lsof -ti:8000 | xargs kill -9
lsof -ti:3000 | xargs kill -9

# Windows
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

**方法 2：修改脚本中的端口配置**

编辑脚本文件，修改 `BACKEND_PORT` 和 `FRONTEND_PORT` 变量。

### 2. 权限错误（macOS/Linux）

如果遇到权限错误，确保脚本有执行权限：

```bash
chmod +x start.sh
chmod +x start.js
```

### 3. Python 虚拟环境创建失败

确保已安装 Python 3.10+：

```bash
python3 --version
```

如果版本过低，需要升级 Python。

### 4. 依赖安装失败

**后端依赖：**
```bash
cd backend
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install --upgrade pip
pip install -r requirements.txt
```

**前端依赖：**
```bash
cd frontend
npm cache clean --force
npm install
```

### 5. 浏览器未自动打开

脚本会尝试自动打开浏览器，如果失败：
- 手动访问：http://localhost:3000
- 检查防火墙设置
- 确保服务已成功启动（查看日志文件）

### 6. 服务启动失败

查看日志文件排查问题：

```bash
# 后端日志
tail -f .backend.log

# 前端日志
tail -f .frontend.log
```

常见原因：
- `.env` 文件配置错误
- 端口被占用
- 依赖未正确安装
- Python/Node.js 版本不兼容

## 手动启动（备选方案）

如果一键启动脚本无法正常工作，可以手动启动：

### 后端

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 前端

```bash
cd frontend
npm install
npm run dev
```

然后手动访问 http://localhost:3000

## 开发模式

脚本启动的服务支持热重载：

- **后端**：修改 Python 文件后自动重启
- **前端**：修改 React/Next.js 文件后自动刷新浏览器

## 生产部署

一键启动脚本仅用于开发环境。生产环境请使用：

- Docker Compose（推荐）
- PM2（Node.js 进程管理）
- systemd（Linux 服务管理）
- Supervisor（Python 进程管理）

详见 [README.md](README.md) 中的 Docker Compose 部分。
