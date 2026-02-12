# Kuma PWA 语音助手 - 设置指南

## 项目已完成实施

所有核心功能已实现，包括：

✅ 后端 FastAPI 应用
✅ WebSocket 实时通信
✅ FunASR 语音识别集成
✅ 火山引擎 LLM 集成
✅ 前端 Next.js 14 应用
✅ PWA 配置
✅ Docker 容器化部署

## 快速开始

### 1. 环境准备

确保已安装：
- Docker & Docker Compose
- Node.js 18+ (本地开发)
- Python 3.10+ (本地开发)

### 2. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件，填入火山引擎 API Key：

```env
VOLCANO_API_KEY=your_api_key_here
VOLCANO_API_ENDPOINT=https://api.volcengine.com
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 3. 使用 Docker Compose 启动

```bash
docker-compose up --build
```

服务将在以下地址可用：
- 前端: http://localhost:3000
- 后端 API: http://localhost:8000
- API 文档: http://localhost:8000/docs

### 4. 本地开发

#### 后端开发

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### 前端开发

```bash
cd frontend
npm install
npm run dev
```

## 项目结构

```
Kuma/
├── docker-compose.yml      # Docker 编排配置
├── .env.example            # 环境变量模板
├── README.md               # 项目说明
├── TESTING.md             # 测试指南
├── SETUP.md               # 本文件
├── backend/               # FastAPI 后端
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── main.py        # FastAPI 入口
│       ├── core/          # 核心配置和 WebSocket 管理
│       ├── api/           # API 路由
│       └── services/      # ASR、LLM 服务
└── frontend/              # Next.js 前端
    ├── Dockerfile
    ├── package.json
    ├── next.config.js     # Next.js 和 PWA 配置
    ├── public/
    │   ├── manifest.json # PWA Manifest
    │   └── icons/        # PWA 图标（需添加）
    └── src/
        ├── app/          # Next.js App Router
        ├── components/   # React 组件
        ├── lib/          # 工具函数和状态管理
        └── types/       # TypeScript 类型定义
```

## 功能说明

### WebSocket 协议

**客户端发送：**
```json
// 音频块
{"type": "audio", "payload": "base64_audio", "finish": false}

// 文本消息
{"type": "text", "payload": "你好"}
```

**服务端响应：**
```json
// ASR 识别结果
{"type": "asr_result", "text": "你好", "is_final": true}

// LLM 回复流
{"type": "llm_chunk", "text": "你好！", "is_final": false}
```

### 使用说明

1. **文本输入**：在输入框中输入消息，按 Enter 或点击发送按钮
2. **语音输入**：点击麦克风按钮，按住说话，松开结束录音
3. **PWA 安装**：在支持的浏览器中，点击地址栏的安装图标

## 注意事项

1. **FunASR 模型**：首次运行需要下载模型，可能需要较长时间
2. **火山引擎 API**：需要有效的 API Key 才能使用 LLM 功能
3. **PWA 图标**：需要将图标文件添加到 `frontend/public/icons/` 目录
4. **麦克风权限**：首次使用需要授予浏览器麦克风权限

## 故障排查

详见 [TESTING.md](TESTING.md) 文件中的故障排查部分。

## 下一步

1. 添加 PWA 图标文件
2. 配置火山引擎 API Key
3. 测试各项功能
4. 根据实际需求调整配置

## 技术支持

如有问题，请查看：
- [README.md](README.md) - 项目概述
- [TESTING.md](TESTING.md) - 测试指南
- API 文档: http://localhost:8000/docs
