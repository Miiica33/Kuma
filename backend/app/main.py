import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.logging_config import setup_logging
from app.api.websocket import websocket_endpoint

# 集中配置日志（级别与文件由 settings 控制）
log_level = "DEBUG" if settings.debug else (settings.log_level or "INFO")
setup_logging(level=log_level, log_file=settings.log_file)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期：启动时与关闭时记录运行状态"""
    logger.info(
        "服务启动 | name=%s version=%s debug=%s",
        settings.app_name,
        settings.app_version,
        settings.debug,
    )
    yield
    logger.info("服务关闭 | 正在清理资源")


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    debug=settings.debug,
    lifespan=lifespan,
)

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境应限制具体域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    """健康检查端点"""
    logger.debug("健康检查请求")
    return {"status": "healthy", "version": settings.app_version}


@app.get("/")
async def root():
    """根端点"""
    return {
        "message": "Kuma PWA Assistant API",
        "version": settings.app_version,
        "docs": "/docs"
    }


@app.websocket("/ws/chat")
async def websocket_route(websocket: WebSocket):
    """WebSocket 路由"""
    await websocket_endpoint(websocket)
