# Kuma PWA 语音助手

一个跨平台的 PWA 语音助手应用，支持文本和语音输入，通过 FastAPI + Next.js 与大模型进行低延迟交互。

---

## 你将得到什么

- 文字和语音对话（支持流式回复）
- PWA 网页应用（可安装到桌面/主屏）
- 本地可选语音识别模型（SenseVoiceSmall）

---

## 0. 新手快速开始（推荐）

如果你只想尽快跑起来，按下面 4 步：

1. 安装依赖：Python 3.10+、Node.js 18+、ffmpeg（语音功能需要）。
2. 克隆项目并进入目录。
3. 运行一键启动脚本。
4. 在 `.env` 填好 `ARK_API_KEY` 后重启服务。

```bash
git clone <你的仓库地址>
cd Kuma
chmod +x deploy.sh
./deploy.sh
```

Windows 可直接运行 `deploy.bat`，或跨平台运行 `node deploy.js`。

---

## 1. 环境准备（含 conda 方式）

> 如果你是第一次配置开发环境，建议使用 conda 管理 Python 环境，能避免很多依赖冲突。

### 1.1 必装软件

| 软件 | 版本要求 | 用途 |
|------|----------|------|
| [Miniconda / Anaconda](https://docs.conda.io/en/latest/miniconda.html) | 最新版 | 管理 Python 环境 |
| [Node.js](https://nodejs.org/) | 18+（LTS） | 前端运行 |
| [ffmpeg](https://ffmpeg.org/download.html) | 任意 | 语音处理 |

### 1.2 验证安装

打开终端执行：

```bash
conda --version
python --version
node --version
ffmpeg -version
```

任一命令报错，先完成对应软件安装再继续。

### 1.3 创建 conda 环境（推荐）

在任意目录执行：

```bash
conda create -n kuma python=3.10 -y
conda activate kuma
```

看到终端前缀出现 `(kuma)` 说明激活成功。后续每次启动项目前，都先执行 `conda activate kuma`。

---

## 2. 拉取代码

```bash
git clone <你的仓库地址>
cd Kuma
```

---

## 3. 配置环境变量（必须，不在聊天里粘贴 Key）

先复制模板：

```bash
cp .env.example .env
```

Windows PowerShell 可用：

```powershell
copy .env.example .env
```

然后找到项目根目录下的 `.env` 文件并编辑，将其中 `ARK_API_KEY=` 替换为你自己的值（建议只在本地文件中填写，不要在聊天或截图中明文展示）：

```env
ARK_API_KEY=你的火山引擎Key
```

未填写 `ARK_API_KEY` 时，页面能打开，但无法正常对话。

---

## 4. 启动方式一：一键部署并启动（最省心）

该方式会自动完成：环境检查、安装依赖、创建/检查 `.env`、可选下载 ASR 模型、启动前后端。

| 系统 | 命令 |
|------|------|
| macOS / Linux | `chmod +x deploy.sh && ./deploy.sh` |
| Windows | `deploy.bat` |
| 跨平台（已装 Node） | `node deploy.js` |

启动成功后访问：

- 前端: http://localhost:3000
- 后端 API: http://localhost:8000
- API 文档: http://localhost:8000/docs

停止服务：终端按 `Ctrl+C`。

---

## 5. 启动方式二：手动启动（开发/排查）

适合想分别控制前后端进程的用户。

### 5.1 启动后端（终端 A）

```bash
conda activate kuma
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 5.2 启动前端（终端 B）

```bash
cd frontend
npm install
npm run dev
```

浏览器访问 http://localhost:3000。

---

## 6. 可选：下载本地语音识别模型

首次使用语音时，可按脚本提示下载 `SenseVoiceSmall`（约 893MB）。

也可手动触发：

```bash
./deploy.sh --download-asr
```

或：

```bash
node deploy.js --download-asr
```

---

## 7. 首次使用自检（建议照着做）

1. 打开 http://localhost:3000，确认页面正常显示。
2. 发送一条文字消息，确认能收到模型回复。
3. 点击麦克风说一句话，确认能识别并返回结果。
4. 若语音异常，检查浏览器麦克风权限与 `ffmpeg` 安装。

---

## 8. 常见问题排查

| 问题 | 处理方式 |
|------|----------|
| `conda: command not found` | 重新安装 Miniconda，并重启终端后再试。 |
| `node: command not found` | 安装 Node.js LTS，重开终端验证 `node --version`。 |
| 3000/8000 端口被占用 | 关闭占用程序，或修改启动端口。 |
| 页面能打开但对话失败 | 检查 `.env` 的 `ARK_API_KEY` 是否正确且无空格。 |
| 语音无反应 | 确认安装 `ffmpeg`、已授权麦克风，查看根目录 `.backend.log` 的 `[ASR]` 日志。 |
| macOS/Linux 脚本没权限 | 执行 `chmod +x setup.sh deploy.sh start.sh`。 |

---

## 9. 获取火山引擎 API Key

1. 登录 [火山引擎控制台](https://console.volcengine.com/)。
2. 进入「方舟大模型 / 模型推理」相关页面。
3. 创建或复制 API Key。
4. 回到项目根目录，找到 `.env` 文件，将 `ARK_API_KEY=` 替换为你的 Key（不要在对话窗口明文发送）。

---

## 10. 其他运行方式

### Docker Compose

已安装 Docker Desktop 时，在项目根目录执行：

```bash
cp .env.example .env
# 在项目根目录 .env 中手动替换 ARK_API_KEY（不要在聊天中粘贴 Key）
docker compose up --build
```

---

## 11. 项目结构

```text
Kuma/
├── deploy.sh / deploy.bat / deploy.js   # 一键部署并启动
├── setup.sh / setup.bat / setup.js      # 仅环境准备
├── start.sh / start.bat / start.js      # 仅启动（需先 setup）
├── .env.example / .env                  # 环境变量
├── docker-compose.yml
├── backend/                             # FastAPI 后端
│   ├── app/
│   ├── models/SenseVoiceSmall/          # 本地 ASR 模型（可选）
│   └── requirements.txt
└── frontend/                            # Next.js 前端
    ├── src/
    └── public/
```

---

## 12. 环境变量说明

| 变量 | 说明 |
|------|------|
| `ARK_API_KEY` | 火山引擎方舟 API Key（必填） |
| `VOLCANO_API_ENDPOINT` | 方舟 API 地址（默认已填） |
| `VOLCANO_MODEL` | 模型 ID（默认已填） |
| `NEXT_PUBLIC_API_URL` | 前端请求后端地址（默认 `http://localhost:8000`） |

完整示例见 `.env.example`。

---

## 许可证

MIT
