#!/bin/bash
# Kuma PWA 语音助手 - 一键环境准备脚本（macOS / Linux）
# 用法: ./setup.sh [--download-asr]
# 可选: --download-asr 自动下载语音识别模型（约 893MB）

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
DOWNLOAD_ASR=false

for arg in "$@"; do
  [ "$arg" = "--download-asr" ] && DOWNLOAD_ASR=true
done

echo -e "${GREEN}"
echo "=========================================="
echo "  Kuma - 一键环境准备"
echo "=========================================="
echo -e "${NC}"

# ---------- 检查 Python 3.10+ ----------
check_python() {
  local py=
  if command -v python3 &>/dev/null; then
    py=python3
  elif command -v python &>/dev/null; then
    py=python
  else
    echo -e "${RED}未检测到 Python。${NC}"
    try_install "Python" "python3" "python3.10" "python3-venv"
    return
  fi
  local ver=$($py -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')" 2>/dev/null || true)
  if [ -z "$ver" ]; then
    ver=$($py --version 2>&1 | grep -oE '[0-9]+\.[0-9]+' | head -1)
  fi
  local major=${ver%%.*}
  local minor=${ver#*.}; minor=${minor%%.*}
  if [ "$major" -lt 3 ] || { [ "$major" -eq 3 ] && [ "$minor" -lt 10 ]; }; then
    echo -e "${RED}需要 Python 3.10+，当前: $ver${NC}"
    try_install "Python 3.10+" "python3" "python3.10" "python3.10-venv"
    return
  fi
  echo -e "${GREEN}✓ Python $ver${NC}"
}

# ---------- 检查 Node.js 18+ ----------
check_node() {
  if ! command -v node &>/dev/null; then
    echo -e "${RED}未检测到 Node.js。${NC}"
    try_install "Node.js" "node" "nodejs" "npm"
    return
  fi
  local ver=$(node -v 2>/dev/null | sed 's/^v//' | cut -d. -f1)
  [ -z "$ver" ] && ver=0
  if [ "$ver" -lt 18 ]; then
    echo -e "${RED}需要 Node.js 18+，当前: $(node -v)${NC}"
    try_install "Node.js 18+" "node" "nodejs" "npm"
    return
  fi
  echo -e "${GREEN}✓ Node.js $(node -v)${NC}"
}

# ---------- 检查 ffmpeg ----------
check_ffmpeg() {
  if command -v ffmpeg &>/dev/null; then
    echo -e "${GREEN}✓ ffmpeg$(ffmpeg -version 2>/dev/null | head -1 | cut -d' ' -f1-2)${NC}"
    return
  fi
  echo -e "${YELLOW}未检测到 ffmpeg，语音识别可能不可用。${NC}"
  try_install "ffmpeg" "ffmpeg" "ffmpeg" "ffmpeg"
  if ! command -v ffmpeg &>/dev/null; then
    echo -e "${YELLOW}请稍后手动安装: https://ffmpeg.org/download.html${NC}"
  fi
}

# ---------- 尝试用包管理器安装 ----------
try_install() {
  local name=$1
  local cmd=$2
  local pkg_brew=$3
  local pkg_apt=$4
  if [[ "$(uname -s)" == "Darwin" ]]; then
    if command -v brew &>/dev/null; then
      echo -e "${BLUE}正在用 Homebrew 安装 $name...${NC}"
      if brew install "$pkg_brew" 2>/dev/null; then
        echo -e "${GREEN}✓ $name 安装完成，请重新运行本脚本${NC}"
        exit 0
      fi
    fi
    echo -e "${YELLOW}请从 https://www.python.org/downloads/ 或 https://nodejs.org/ 安装 $name 后重新运行${NC}"
  elif [[ -f /etc/debian_version ]] || type apt-get &>/dev/null 2>&1; then
    echo -e "${BLUE}正在用 apt 安装 $name（可能需要输入密码）...${NC}"
    if (sudo apt-get update -qq && sudo apt-get install -y "$pkg_apt") 2>/dev/null; then
      echo -e "${GREEN}✓ $name 安装完成，请重新运行本脚本${NC}"
      exit 0
    fi
    echo -e "${YELLOW}请手动执行: sudo apt-get install $pkg_apt 后重新运行${NC}"
  else
    echo -e "${YELLOW}请手动安装 $name 后重新运行本脚本。${NC}"
  fi
  exit 1
}

# ---------- 创建 .env ----------
ensure_env() {
  if [ ! -f "$ROOT_DIR/.env" ]; then
    echo -e "${BLUE}创建 .env（从 .env.example 复制）...${NC}"
    cp "$ROOT_DIR/.env.example" "$ROOT_DIR/.env"
    echo -e "${GREEN}✓ .env 已创建${NC}"
    echo -e "${YELLOW}请编辑 $ROOT_DIR/.env，填入 ARK_API_KEY（火山引擎方舟 API Key）${NC}"
  else
    echo -e "${GREEN}✓ .env 已存在${NC}"
  fi
}

# ---------- 后端虚拟环境与依赖 ----------
setup_backend() {
  echo -e "${BLUE}准备后端环境...${NC}"
  cd "$BACKEND_DIR"
  if [ ! -d "venv" ]; then
    echo -e "${YELLOW}创建 Python 虚拟环境...${NC}"
    python3 -m venv venv
  fi
  source venv/bin/activate
  if ! venv/bin/python -c "import uvicorn" 2>/dev/null; then
    echo -e "${YELLOW}安装后端依赖（首次较慢）...${NC}"
    pip install -q -r requirements.txt
  fi
  echo -e "${GREEN}✓ 后端环境就绪${NC}"
}

# ---------- 可选：下载 ASR 模型 ----------
maybe_download_asr() {
  if [ "$DOWNLOAD_ASR" = true ]; then
    echo -e "${BLUE}下载语音识别模型 SenseVoiceSmall（约 893MB）...${NC}"
    cd "$BACKEND_DIR" && source venv/bin/activate
    python scripts/download_sense_voice_small.py
    echo -e "${GREEN}✓ ASR 模型已就绪${NC}"
    return
  fi
  if [ ! -f "$BACKEND_DIR/models/SenseVoiceSmall/model.pt" ]; then
    echo -e "${YELLOW}是否下载语音识别模型（约 893MB）？未下载将使用在线模型。 [y/N]${NC}"
    read -r ans
    case "$ans" in
      [yY]|[yY][eE][sS])
        echo -e "${BLUE}下载中...${NC}"
        cd "$BACKEND_DIR" && source venv/bin/activate
        python scripts/download_sense_voice_small.py
        echo -e "${GREEN}✓ ASR 模型已就绪${NC}"
        ;;
      *) echo -e "${YELLOW}已跳过。可稍后运行: cd backend && source venv/bin/activate && python scripts/download_sense_voice_small.py${NC}"
        ;;
    esac
  else
    echo -e "${GREEN}✓ ASR 模型已存在${NC}"
  fi
}

# ---------- 前端依赖 ----------
setup_frontend() {
  echo -e "${BLUE}准备前端环境...${NC}"
  cd "$FRONTEND_DIR"
  if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}安装前端依赖（首次较慢）...${NC}"
    npm install --silent
  fi
  echo -e "${GREEN}✓ 前端环境就绪${NC}"
}

# ---------- 主流程 ----------
check_python
check_node
check_ffmpeg
ensure_env
setup_backend
maybe_download_asr
setup_frontend

echo ""
echo -e "${GREEN}=========================================="
echo "  环境准备完成"
echo "=========================================="
echo ""
echo "  1. 若尚未填写，请编辑 .env 填入 ARK_API_KEY"
echo "  2. 启动应用: ./start.sh"
echo "  或一键部署并启动: ./deploy.sh"
echo ""
echo -e "${NC}"
