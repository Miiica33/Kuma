#!/usr/bin/env python3
"""
将 SenseVoiceSmall 从 ModelScope 下载到本地目录 backend/models/SenseVoiceSmall。
运行前请安装依赖：pip install modelscope
在项目根目录或 backend 目录执行：python backend/scripts/download_sense_voice_small.py
或在 backend 目录：python scripts/download_sense_voice_small.py
"""
from pathlib import Path


def main():
    backend_dir = Path(__file__).resolve().parent.parent
    local_dir = backend_dir / "models" / "SenseVoiceSmall"
    local_dir.mkdir(parents=True, exist_ok=True)

    print(f"正在从 ModelScope 下载 SenseVoiceSmall 到: {local_dir}")
    print("首次下载可能较慢，请耐心等待…")

    try:
        from modelscope import snapshot_download

        snapshot_download(
            model_id="iic/SenseVoiceSmall",
            local_dir=str(local_dir),
        )
        print(f"下载完成，模型目录: {local_dir}")
    except ImportError:
        print("请先安装 modelscope: pip install modelscope")
        raise
    except Exception as e:
        print(f"下载失败: {e}")
        raise


if __name__ == "__main__":
    main()
