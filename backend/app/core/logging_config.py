"""
集中式日志配置，用于记录服务运行状态，便于排查问题。
支持控制台输出与可选的文件输出，日志级别可通过环境变量配置。
"""
import logging
import sys
from pathlib import Path
from typing import Optional

# 统一日志格式：时间 | 级别 | 模块 | 消息
LOG_FORMAT = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
DATE_FORMAT = "%Y-%m-%d %H:%M:%S"


def setup_logging(
    level: str = "INFO",
    log_file: Optional[str] = None,
) -> None:
    """
    配置应用日志。
    
    Args:
        level: 日志级别，如 DEBUG, INFO, WARNING, ERROR
        log_file: 可选，日志文件路径；若提供则同时写入文件
    """
    log_level = getattr(logging, level.upper(), logging.INFO)
    root = logging.getLogger()
    root.setLevel(log_level)

    # 避免重复添加 handler（例如 uvicorn reload 时）
    if root.handlers:
        for h in root.handlers[:]:
            root.removeHandler(h)

    formatter = logging.Formatter(LOG_FORMAT, datefmt=DATE_FORMAT)

    # 控制台输出
    console = logging.StreamHandler(sys.stdout)
    console.setLevel(log_level)
    console.setFormatter(formatter)
    root.addHandler(console)

    # 可选：写入文件
    if log_file:
        path = Path(log_file)
        path.parent.mkdir(parents=True, exist_ok=True)
        try:
            file_handler = logging.FileHandler(path, encoding="utf-8")
            file_handler.setLevel(log_level)
            file_handler.setFormatter(formatter)
            root.addHandler(file_handler)
        except OSError as e:
            root.warning("无法创建日志文件 %s: %s，仅输出到控制台", log_file, e)

    # 降低第三方库的噪音
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)  # 可选：不记录每条 HTTP 请求
