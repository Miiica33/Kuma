# 测试指南

## 本地开发测试

### 1. 后端测试

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

访问 http://localhost:8000/docs 查看 API 文档。

### 2. 前端测试

```bash
cd frontend
npm install
npm run dev
```

访问 http://localhost:3000

### 3. WebSocket 测试

可以使用浏览器控制台测试 WebSocket 连接：

```javascript
const ws = new WebSocket('ws://localhost:8000/ws/chat');
ws.onopen = () => console.log('已连接');
ws.onmessage = (event) => console.log('收到消息:', JSON.parse(event.data));
ws.send(JSON.stringify({ type: 'text', payload: '你好' }));
```

## Docker 测试

### 1. 构建和启动

```bash
# 复制环境变量文件
cp .env.example .env
# 编辑 .env 文件，填入火山引擎 API Key

# 构建并启动
docker-compose up --build
```

### 2. 检查服务状态

```bash
docker-compose ps
docker-compose logs backend
docker-compose logs frontend
```

### 3. 健康检查

```bash
curl http://localhost:8000/health
```

## 功能测试清单

### WebSocket 连接
- [ ] 前端能成功连接到后端 WebSocket
- [ ] 连接断开后能自动重连
- [ ] 连接状态正确显示

### 文本输入
- [ ] 可以发送文本消息
- [ ] 消息正确显示在界面上
- [ ] LLM 回复流式显示
- [ ] 打字机效果正常工作

### 语音输入
- [ ] 可以启动录音
- [ ] 音频可视化正常显示
- [ ] 录音数据正确发送到后端
- [ ] ASR 识别结果正确显示
- [ ] 识别完成后自动触发 LLM 回复

### UI/UX
- [ ] 响应式布局正常（移动端和桌面端）
- [ ] 深色/浅色模式切换（如果实现）
- [ ] 消息气泡样式正确
- [ ] 动画效果流畅

### PWA 功能
- [ ] 可以安装到主屏幕
- [ ] Manifest 配置正确
- [ ] Service Worker 正常工作
- [ ] 离线功能（如果实现）

## 性能测试

### 音频处理
- 测试不同长度的音频
- 测试不同采样率的音频
- 检查内存使用情况

### WebSocket 性能
- 测试长时间连接稳定性
- 测试大量并发连接
- 检查消息延迟

### LLM 响应
- 测试流式响应延迟
- 测试长文本生成
- 检查 Token 生成速度

## 跨平台测试

### HarmonyOS
- [ ] 在 HarmonyOS 浏览器中打开
- [ ] 可以安装为 PWA
- [ ] 语音输入正常工作
- [ ] WebSocket 连接正常

### Windows
- [ ] Chrome/Edge 浏览器测试
- [ ] PWA 安装功能
- [ ] 麦克风权限请求

### Mac
- [ ] Safari/Chrome 浏览器测试
- [ ] PWA 安装功能
- [ ] 麦克风权限请求

## 已知问题和限制

1. **FunASR 模型初始化**：首次运行需要下载模型，可能需要较长时间
2. **火山引擎 API**：需要有效的 API Key 才能正常工作
3. **音频格式**：当前主要支持 WebM 格式，某些浏览器可能需要转换
4. **PWA 图标**：需要手动添加图标文件到 `frontend/public/icons/` 目录

## 故障排查

### WebSocket 连接失败
- 检查后端服务是否运行
- 检查防火墙设置
- 检查 CORS 配置

### 音频录制失败
- 检查浏览器权限设置
- 检查麦克风是否可用
- 查看浏览器控制台错误信息

### ASR 识别失败
- 检查 FunASR 模型是否正确初始化
- 检查音频格式是否支持
- 查看后端日志

### LLM 无响应
- 检查火山引擎 API Key 是否正确
- 检查网络连接
- 查看后端日志中的错误信息
