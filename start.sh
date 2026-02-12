#!/bin/bash

# Kuma PWA 语音助手 - 一键启动脚本
# 使用方法: ./start.sh

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 项目根目录
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

# 端口配置
BACKEND_PORT=8000
FRONTEND_PORT=3000

# PID 文件
BACKEND_PID_FILE="$ROOT_DIR/.backend.pid"
FRONTEND_PID_FILE="$ROOT_DIR/.frontend.pid"

# 清理函数
cleanup() {
    echo -e "\n${YELLOW}正在停止服务...${NC}"
    
    if [ -f "$BACKEND_PID_FILE" ]; then
        BACKEND_PID=$(cat "$BACKEND_PID_FILE")
        if ps -p "$BACKEND_PID" > /dev/null 2>&1; then
            kill "$BACKEND_PID" 2>/dev/null || true
        fi
        rm -f "$BACKEND_PID_FILE"
    fi
    
    if [ -f "$FRONTEND_PID_FILE" ]; then
        FRONTEND_PID=$(cat "$FRONTEND_PID_FILE")
        if ps -p "$FRONTEND_PID" > /dev/null 2>&1; then
            kill "$FRONTEND_PID" 2>/dev/null || true
        fi
        rm -f "$FRONTEND_PID_FILE"
    fi
    
    # 清理可能的残留进程
    pkill -f "uvicorn app.main:app" 2>/dev/null || true
    pkill -f "next dev" 2>/dev/null || true
    
    echo -e "${GREEN}服务已停止${NC}"
    exit 0
}

# 注册清理函数
trap cleanup SIGINT SIGTERM

# 检查命令是否存在
check_command() {
    if ! command -v "$1" &> /dev/null; then
        echo -e "${RED}错误: $1 未安装${NC}"
        exit 1
    fi
}

# 检查后端依赖
check_backend() {
    echo -e "${BLUE}检查后端环境...${NC}"
    
    if [ ! -d "$BACKEND_DIR/venv" ]; then
        echo -e "${YELLOW}创建 Python 虚拟环境...${NC}"
        cd "$BACKEND_DIR"
        python3 -m venv venv
    fi
    
    cd "$BACKEND_DIR"
    source venv/bin/activate
    
    if [ ! -f "venv/bin/uvicorn" ]; then
        echo -e "${YELLOW}安装后端依赖...${NC}"
        pip install -q -r requirements.txt
    fi
    
    echo -e "${GREEN}后端环境检查完成${NC}"
}

# 检查前端依赖
check_frontend() {
    echo -e "${BLUE}检查前端环境...${NC}"
    
    cd "$FRONTEND_DIR"
    
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}安装前端依赖...${NC}"
        npm install --silent
    fi
    
    echo -e "${GREEN}前端环境检查完成${NC}"
}

# 等待服务就绪
wait_for_service() {
    local url=$1
    local name=$2
    local max_attempts=30
    local attempt=0
    
    echo -e "${BLUE}等待 $name 启动...${NC}"
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -s "$url" > /dev/null 2>&1; then
            echo -e "${GREEN}$name 已就绪${NC}"
            return 0
        fi
        attempt=$((attempt + 1))
        sleep 1
    done
    
    echo -e "${RED}$name 启动超时${NC}"
    return 1
}

# 等待服务就绪并检查进程存活
wait_for_service_with_pid() {
    local url=$1
    local name=$2
    local pid=$3
    local log_file=$4
    local expected_text=$5
    local max_attempts=45
    local attempt=0

    echo -e "${BLUE}等待 $name 完全就绪...${NC}"

    while [ $attempt -lt $max_attempts ]; do
        if ! ps -p "$pid" > /dev/null 2>&1; then
            echo -e "${RED}$name 进程已退出 (PID: $pid)${NC}"
            if [ -f "$log_file" ]; then
                echo -e "${YELLOW}请检查日志: $log_file${NC}"
            fi
            return 1
        fi

        if [ -n "$expected_text" ]; then
            local response
            response=$(curl -s "$url" 2>/dev/null || true)
            if [[ "$response" == *"$expected_text"* ]]; then
                echo -e "${GREEN}$name 已就绪${NC}"
                return 0
            fi
        else
            if curl -s "$url" > /dev/null 2>&1; then
                echo -e "${GREEN}$name 已就绪${NC}"
                return 0
            fi
        fi

        attempt=$((attempt + 1))
        sleep 1
    done

    echo -e "${RED}$name 启动超时${NC}"
    if [ -f "$log_file" ]; then
        echo -e "${YELLOW}请检查日志: $log_file${NC}"
    fi
    return 1
}

# 启动后端
start_backend() {
    echo -e "${BLUE}启动后端服务 (端口 $BACKEND_PORT)...${NC}"
    
    cd "$BACKEND_DIR"
    source venv/bin/activate
    
    # 检查 .env 文件
    if [ ! -f "$ROOT_DIR/.env" ]; then
        echo -e "${YELLOW}警告: .env 文件不存在，使用 .env.example${NC}"
        if [ -f "$ROOT_DIR/.env.example" ]; then
            cp "$ROOT_DIR/.env.example" "$ROOT_DIR/.env"
        fi
    fi
    
    # 启动后端（后台运行）
    nohup uvicorn app.main:app --host 0.0.0.0 --port $BACKEND_PORT > "$ROOT_DIR/.backend.log" 2>&1 &
    BACKEND_PID=$!
    echo $BACKEND_PID > "$BACKEND_PID_FILE"
    
    echo -e "${GREEN}后端服务已启动 (PID: $BACKEND_PID)${NC}"
}

# 启动前端
start_frontend() {
    echo -e "${BLUE}启动前端服务 (端口 $FRONTEND_PORT)...${NC}"
    
    cd "$FRONTEND_DIR"
    
    # 设置环境变量
    export NEXT_PUBLIC_API_URL="http://localhost:$BACKEND_PORT"
    
    # 启动前端（后台运行）
    nohup npm run dev > "$ROOT_DIR/.frontend.log" 2>&1 &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > "$FRONTEND_PID_FILE"
    
    echo -e "${GREEN}前端服务已启动 (PID: $FRONTEND_PID)${NC}"
}

# 打开浏览器
open_browser() {
    local url="http://localhost:$FRONTEND_PORT"
    
    echo -e "${BLUE}等待前端服务就绪...${NC}"
    sleep 3
    
    if wait_for_service "$url" "前端服务"; then
        echo -e "${GREEN}正在打开浏览器...${NC}"
        
        # 检测操作系统并打开浏览器
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            open "$url"
        elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
            # Linux
            if command -v xdg-open &> /dev/null; then
                xdg-open "$url"
            elif command -v gnome-open &> /dev/null; then
                gnome-open "$url"
            fi
        fi
        
        echo -e "${GREEN}浏览器已打开: $url${NC}"
    else
        echo -e "${YELLOW}无法自动打开浏览器，请手动访问: $url${NC}"
    fi
}

# 主函数
main() {
    echo -e "${GREEN}"
    echo "=================================="
    echo "  Kuma PWA 语音助手 - 启动脚本"
    echo "=================================="
    echo -e "${NC}"
    
    # 检查必要命令
    check_command python3
    check_command npm
    check_command curl
    
    # 检查环境
    check_backend
    check_frontend
    
    # 启动后端并等待完全就绪，再启动前端
    start_backend
    if ! wait_for_service_with_pid "http://localhost:$BACKEND_PORT/health" "后端服务" "$BACKEND_PID" "$ROOT_DIR/.backend.log" "healthy"; then
        cleanup
    fi
    
    start_frontend
    
    # 打开浏览器
    open_browser
    
    echo -e "\n${GREEN}=================================="
    echo "  服务运行中..."
    echo "  前端: http://localhost:$FRONTEND_PORT"
    echo "  后端: http://localhost:$BACKEND_PORT"
    echo "  日志: .backend.log 和 .frontend.log"
    echo ""
    echo "  按 Ctrl+C 停止所有服务"
    echo "=================================="
    
    # 保持脚本运行
    while true; do
        sleep 1
        # 检查进程是否还在运行
        if [ -f "$BACKEND_PID_FILE" ]; then
            BACKEND_PID=$(cat "$BACKEND_PID_FILE")
            if ! ps -p "$BACKEND_PID" > /dev/null 2>&1; then
                echo -e "${RED}后端服务意外停止${NC}"
                cleanup
            fi
        fi
        
        if [ -f "$FRONTEND_PID_FILE" ]; then
            FRONTEND_PID=$(cat "$FRONTEND_PID_FILE")
            if ! ps -p "$FRONTEND_PID" > /dev/null 2>&1; then
                echo -e "${RED}前端服务意外停止${NC}"
                cleanup
            fi
        fi
    done
}

# 运行主函数
main
