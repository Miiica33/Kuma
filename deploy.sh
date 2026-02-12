#!/bin/bash
# Kuma PWA 语音助手 - 一键部署并启动（先准备环境，再启动服务）
# 用法: ./deploy.sh [--download-asr]

set -e
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 1. 环境准备
"$ROOT_DIR/setup.sh" "$@"

# 2. 若 .env 中 ARK_API_KEY 仍为占位符或为空，提示用户
if [ -f "$ROOT_DIR/.env" ]; then
  if grep -qE '^ARK_API_KEY=(your_ark_api_key_here|)$' "$ROOT_DIR/.env" 2>/dev/null || \
     ! grep -qE '^ARK_API_KEY=.+' "$ROOT_DIR/.env" 2>/dev/null; then
    echo -e "${YELLOW}请在 .env 中填入 ARK_API_KEY（火山引擎方舟 API Key）后按回车继续...${NC}"
    read -r
  fi
fi

# 3. 启动服务（exec 替换当前进程，便于 Ctrl+C 正确清理）
exec "$ROOT_DIR/start.sh"
