import base64
import io
import numpy as np
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# 浏览器录音常用格式；ASR 需要 16k 单声道
TARGET_SAMPLE_RATE = 16000
TARGET_CHANNELS = 1


def decode_base64_audio(base64_string: str) -> Optional[bytes]:
    """解码 base64 编码的音频数据"""
    try:
        # 移除可能的数据 URI 前缀
        if ',' in base64_string:
            base64_string = base64_string.split(',')[1]
        
        audio_bytes = base64.b64decode(base64_string)
        return audio_bytes
    except Exception as e:
        logger.error(f"Base64 解码失败: {e}")
        return None


def bytes_to_numpy(audio_bytes: bytes, sample_rate: int = 16000) -> Optional[np.ndarray]:
    """将音频字节转换为 numpy 数组"""
    try:
        import wave
        import struct
        
        # 尝试作为 WAV 文件读取
        audio_io = io.BytesIO(audio_bytes)
        try:
            with wave.open(audio_io, 'rb') as wav_file:
                frames = wav_file.readframes(-1)
                sound_info = np.frombuffer(frames, dtype=np.int16)
                return sound_info.astype(np.float32) / 32768.0
        except:
            # 如果不是 WAV，尝试直接读取 PCM
            audio_io = io.BytesIO(audio_bytes)
            # 假设是 16-bit PCM
            sound_info = np.frombuffer(audio_bytes, dtype=np.int16)
            return sound_info.astype(np.float32) / 32768.0
    
    except Exception as e:
        logger.error(f"音频转换失败: {e}")
        return None


def decode_audio_to_pcm(audio_bytes: bytes) -> Optional[bytes]:
    """
    将任意支持的音频格式（WAV、WebM/Opus 等）转为 16k 单声道 16-bit PCM。
    浏览器 MediaRecorder 通常输出 audio/webm;codecs=opus，需经此转换后 ASR 才能识别。
    依赖 pydub 与系统 ffmpeg（WebM 需 ffmpeg）。
    """
    if not audio_bytes or len(audio_bytes) < 50:
        return None
    try:
        from pydub import AudioSegment
        buf = io.BytesIO(audio_bytes)
        last_err = None
        # 前端录音结束后会发 16kHz 单声道 WAV（与 SenseVoice fs:16000 一致），优先用 wav 解码
        formats = ("wav", "webm", "ogg") if audio_bytes[:4] == b"RIFF" else ("webm", "ogg", "wav")
        for fmt in formats:
            try:
                buf.seek(0)
                seg = AudioSegment.from_file(buf, format=fmt)
                seg = seg.set_frame_rate(TARGET_SAMPLE_RATE).set_channels(TARGET_CHANNELS)
                return seg.raw_data
            except Exception as e:
                last_err = e
                continue
        if last_err is not None:
            logger.warning("decode_audio_to_pcm 失败（需 ffmpeg 支持 WebM）: %s", last_err)
        return None
    except Exception as e:
        logger.warning("decode_audio_to_pcm 异常: %s", e)
        return None


def validate_audio_format(audio_bytes: bytes) -> bool:
    """验证音频格式或长度是否可用"""
    if len(audio_bytes) < 100:
        return False
    if audio_bytes[:4] == b'RIFF':
        return True
    if audio_bytes[:4] == b'\x1aE\xdf\xa3' or b'webm' in audio_bytes[:32].lower():
        return True
    if len(audio_bytes) > 1000:
        return True
    return False
