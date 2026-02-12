from pydantic_settings import BaseSettings
from typing import Optional
from pathlib import Path
import os
from dotenv import load_dotenv

# 尝试从项目根目录加载 .env 文件
env_paths = [
    Path(__file__).parent.parent.parent.parent / ".env",  # 项目根目录
    Path(__file__).parent.parent.parent / ".env",  # backend 目录
    Path(".env"),  # 当前工作目录
]

for env_path in env_paths:
    if env_path.exists():
        load_dotenv(env_path)
        break


class Settings(BaseSettings):
    """应用配置"""
    
    # 火山引擎方舟 API（与官方 curl 一致：https://ark.cn-beijing.volces.com/api/v3/chat/completions）
    volcano_api_key: Optional[str] = None
    volcano_api_endpoint: str = "https://ark.cn-beijing.volces.com"
    volcano_model: str = "doubao-1-5-pro-32k-250115"
    
    # WebSocket 配置
    ws_host: str = "0.0.0.0"
    ws_port: int = 8000
    
    # 应用配置
    app_name: str = "Kuma PWA Assistant"
    app_version: str = "1.0.0"
    debug: bool = False

    # ASR：本地 SenseVoiceSmall 模型目录，不填则使用 backend/models/SenseVoiceSmall
    asr_model_dir: Optional[str] = None
    # ASR 调试：为 true 时把每次识别用的 WAV 保存到 backend/asr_debug_last.wav，便于确认是否录到人声
    asr_debug_save_wav: bool = False

    # 日志配置（便于排查问题，默认写入项目根目录 .backend.log）
    log_level: str = "INFO"  # DEBUG, INFO, WARNING, ERROR
    log_file: Optional[str] = None  # 默认 .backend.log（项目根目录）
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False
        extra = "ignore"
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.volcano_api_key:
            self.volcano_api_key = os.getenv("ARK_API_KEY") or os.getenv("VOLCANO_API_KEY")
        # 默认日志文件：项目根目录 .backend.log
        if self.log_file is None:
            _root = Path(__file__).resolve().parent.parent.parent.parent
            self.log_file = str(_root / ".backend.log")


settings = Settings()
