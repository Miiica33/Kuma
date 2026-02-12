# README-AI（给 Cursor / IDE Agent 的可执行指令）

本文件用于让用户把内容直接复制给 Cursor、Copilot Chat、Codeium Agent 等 IDE Agent，帮助用户自动完成：

- 获取仓库
- 创建 conda 环境
- 安装前后端依赖
- 配置 `.env`
- 启动项目并验证可用性
- 处理常见报错

---

## 使用方法（给用户）

1. 打开你的 IDE Agent 对话窗口（如 Cursor Chat）。
2. 复制下面「给 Agent 的完整指令模板」并发送。
3. 仓库地址已内置，无需替换（如你 fork 了仓库，可改成你自己的地址）。
4. API Key 不要发到聊天里，按模板让 Agent 帮你定位项目根目录 `.env`，你自己在文件中替换 `ARK_API_KEY=`。
5. 等 Agent 执行，如果中途需要确认会提示你。

---

## 给 Agent 的完整指令模板（可直接复制）

```text
你是我的本地开发助手，请在当前电脑上帮我完整部署 Kuma 项目。

【目标】
从零完成：拉取仓库 -> conda 创建环境 -> 安装依赖 -> 配置 .env -> 启动前后端 -> 验证可用。

【执行要求】
1) 所有步骤尽量自动执行，不要只给建议，要直接运行命令。
2) 每完成一个阶段，告诉我结果（成功/失败）和下一步。
3) 如果遇到错误，先自动排查并修复；修复失败再向我提问。
4) 除非必要，不要删除我的现有文件；修改前先说明。
5) 默认使用 conda 环境，环境名固定为 kuma。

【项目信息】
- 仓库地址：https://github.com/Miiica33/Kuma.git
- 项目目录名：Kuma
- Python 版本：3.10
- Node.js 要求：18+
- 必需环境变量：ARK_API_KEY
- 不在聊天中提供 ARK_API_KEY 明文

【请按以下顺序执行】

第一阶段：基础检查
- 检查 conda / python / node / npm / ffmpeg 是否可用，并输出版本：
  - conda --version
  - python --version
  - node --version
  - npm --version
  - ffmpeg -version
- 若缺失，明确告诉我缺什么，并给出当前系统的一键安装建议命令（按我的系统）。

第二阶段：获取代码
- 若本地不存在 Kuma 目录：
  - git clone https://github.com/Miiica33/Kuma.git
- 进入项目目录：
  - cd Kuma

第三阶段：创建并激活 conda 环境
- conda create -n kuma python=3.10 -y
- conda activate kuma
- 再次确认 python 版本正确。

第四阶段：配置环境变量（不在聊天中传 Key）
- 若 `.env` 不存在，使用 `.env.example` 创建：
  - macOS/Linux: cp .env.example .env
  - Windows PowerShell: copy .env.example .env
- 帮我定位 `.env` 文件路径（项目根目录），并提示我手动编辑该文件：
  - 将 `ARK_API_KEY=` 替换为我自己的真实 Key
- 保留其他默认变量，不要删除。

第五阶段：安装依赖
- 后端依赖：
  - cd backend
  - pip install -r requirements.txt
- 前端依赖：
  - cd ../frontend
  - npm install
- 回到项目根目录。

第六阶段：启动项目（优先一键脚本）
- 在项目根目录优先使用平台对应命令：
  - macOS/Linux: chmod +x deploy.sh && ./deploy.sh
  - Windows: deploy.bat
  - 或跨平台: node deploy.js
- 如果一键脚本失败，改为手动启动：
  - 终端A（后端）：
    conda activate kuma
    cd backend
    uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
  - 终端B（前端）：
    cd frontend
    npm run dev

第七阶段：连通性验证
- 检查以下地址是否可访问：
  - http://localhost:3000
  - http://localhost:8000/docs
- 告诉我验证结果，并给出“下一步我该做什么”（例如打开网页发一条测试消息）。

第八阶段：常见错误自动排查
- 如果 3000/8000 端口被占用，定位占用进程并提示我是否终止。
- 如果前端报 node 相关错误，执行：
  - npm cache verify
  - 删除 node_modules 后 npm install（先征求我同意）
- 如果后端报 Python 包错误，重新执行 pip install -r requirements.txt。
- 如果语音功能异常，检查 ffmpeg 与浏览器麦克风权限，并提示查看 .backend.log 的 ASR 日志。

【最终输出格式】
请最后输出以下内容：
1) 已完成步骤清单（打勾）
2) 当前运行中的服务和端口
3) 我现在可以访问的 URL
4) 如果重启电脑，下次最短启动命令（控制在 3 条命令内）
```

---

## 极简版（30 秒发送给 Agent）

如果你只想给 Agent 一个超短命令，复制这段：

```text
请帮我在本机完整部署 Kuma：拉取仓库、创建 conda 环境(kuma, python3.10)、安装前后端依赖、定位项目根目录 .env 并提示我手动替换 ARK_API_KEY、启动前后端并验证 http://localhost:3000 和 http://localhost:8000/docs 可用。尽量直接执行命令，不要只给建议；遇错先自动修复，最后给我“已完成清单 + 运行端口 + 下次最短启动命令”。
仓库：https://github.com/Miiica33/Kuma.git
```

---

## 给用户的提醒

- 首次部署时间可能较长（依赖下载 + 可选语音模型下载）。
- 语音功能依赖 `ffmpeg` 和浏览器麦克风授权。
- 不要把包含真实 Key 的对话截图公开到社区或仓库。
