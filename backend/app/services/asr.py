"""
本地 SenseVoiceSmall ASR 服务（FunASR），带完整日志便于确认识别过程与排查问题。
"""
import logging
import re
import tempfile
import wave
from pathlib import Path
from typing import Optional, Dict, List, Any

import numpy as np

from app.services.audio import decode_base64_audio, decode_audio_to_pcm, bytes_to_numpy, validate_audio_format
from app.core.config import settings

logger = logging.getLogger(__name__)

_BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
_DEFAULT_ASR_MODEL_DIR = _BACKEND_DIR / "models" / "SenseVoiceSmall"

# SenseVoice 输出中的标签（语言/情感等），仅保留用户口述文字时需去掉
_SENSEVOICE_TAG_PATTERN = re.compile(r"<\|[^|]+\|>")


def _extract_plain_text(rich_text: str) -> str:
    """从 SenseVoice 富文本结果中仅提取用户口述文字，去掉 <|zh|>、<|NEUTRAL|> 等标签。"""
    if not rich_text:
        return ""
    s = _SENSEVOICE_TAG_PATTERN.sub("", rich_text)
    return s.strip()


def _get_asr_model_dir() -> Optional[Path]:
    """优先使用配置或默认本地目录，且目录存在才返回。"""
    if settings.asr_model_dir:
        p = Path(settings.asr_model_dir)
        if p.is_absolute():
            return p if p.exists() else None
        return (_BACKEND_DIR / p).resolve() if (_BACKEND_DIR / p).exists() else None
    return _DEFAULT_ASR_MODEL_DIR if _DEFAULT_ASR_MODEL_DIR.exists() else None


def _collect_result_text(result: Any) -> List[str]:
    """从 SenseVoice/多段模型的 result 中收集所有文本片段。"""
    parts: List[str] = []
    if isinstance(result, list):
        for item in result:
            if isinstance(item, dict):
                t = item.get("text", "")
                if t:
                    parts.append(_extract_plain_text(t))
            elif isinstance(item, list):
                for sub in item:
                    if isinstance(sub, dict):
                        t = sub.get("text", "")
                        if t:
                            parts.append(_extract_plain_text(t))
                    elif isinstance(sub, str) and sub:
                        parts.append(_extract_plain_text(sub))
            elif isinstance(item, str) and item:
                parts.append(_extract_plain_text(item))
    elif isinstance(result, dict):
        parts.append(_extract_plain_text(result.get("text", "")))
    return parts


class ASRService:
    """本地 FunASR SenseVoiceSmall ASR 服务，带详细日志。"""

    def __init__(self):
        self.model = None
        self._use_sense_voice = False
        self.initialized = False
        self.audio_buffer: Dict[str, list] = {}

    async def initialize(self):
        """初始化 FunASR：优先本地 SenseVoiceSmall，否则尝试 paraformer-zh。"""
        model_dir = _get_asr_model_dir()
        if model_dir is not None:
            logger.info("[ASR] 使用本地 SenseVoiceSmall，模型目录: %s", model_dir)
            try:
                from funasr import AutoModel
                self.model = AutoModel(
                    model=str(model_dir),
                    device="cpu",
                    disable_update=True,
                    vad_model="fsmn-vad",
                    vad_kwargs={"max_single_segment_time": 30000},
                )
                self._use_sense_voice = True
                self.initialized = True
                logger.info("[ASR] SenseVoiceSmall 本地模型加载成功，ASR 已就绪")
                return
            except Exception as e:
                logger.error("[ASR] SenseVoiceSmall 加载失败: %s", e, exc_info=True)
                logger.warning("[ASR] 将尝试使用 paraformer-zh 在线模型")
        else:
            logger.warning("[ASR] 未找到本地 SenseVoiceSmall 目录（检查 ASR_MODEL_DIR 或 backend/models/SenseVoiceSmall）")

        try:
            from funasr import AutoModel
            logger.info("[ASR] 正在加载 paraformer-zh 在线模型...")
            self.model = AutoModel(
                model="paraformer-zh",
                model_revision="v2.0.4",
                device="cpu",
                disable_update=True,
            )
            self._use_sense_voice = False
            self.initialized = True
            logger.info("[ASR] paraformer-zh 加载成功，ASR 已就绪")
        except Exception as e:
            logger.error("[ASR] FunASR 模型初始化失败: %s", e, exc_info=True)
            logger.warning("[ASR] 语音识别不可用，请使用文字输入或安装依赖（torch/funasr）及本地模型")
            self.initialized = False

    async def transcribe_audio(
        self,
        base64_audio: str,
        finish: bool = False,
        session_id: str = "default",
    ) -> Optional[Dict]:
        """
        转录音频：按 session 累积片段，finish 时合并为 PCM 后调用本地 SenseVoice 识别。
        """
        if not self.initialized:
            logger.debug("[ASR] transcribe_audio 跳过：服务未初始化 session_id=%s", session_id)
            return None

        try:
            # 1. 解码 base64
            audio_bytes = decode_base64_audio(base64_audio)
            if not audio_bytes:
                logger.warning("[ASR] base64 解码为空 session_id=%s", session_id)
                return None

            if session_id not in self.audio_buffer:
                self.audio_buffer[session_id] = []
            self.audio_buffer[session_id].append(audio_bytes)
            chunk_count = len(self.audio_buffer[session_id])
            logger.debug("[ASR] 收到音频片段 session_id=%s finish=%s 当前片段数=%s 本片字节=%s",
                         session_id, finish, chunk_count, len(audio_bytes))

            if not finish:
                return {"text": "", "is_final": False}

            # 2. 仅用「最后一条」payload：前端录音结束后会转为 16kHz 单声道 WAV 再发送，与 SenseVoice fs:16000 一致
            full_bytes = self.audio_buffer[session_id][-1]
            del self.audio_buffer[session_id]
            total_raw = len(full_bytes)
            is_wav = full_bytes[:4] == b"RIFF"
            logger.info("[ASR] 开始识别 session_id=%s 原始字节=%s 格式=%s",
                        session_id, total_raw, "WAV(16k)" if is_wav else "WebM/其他")

            pcm_bytes = decode_audio_to_pcm(full_bytes)
            if pcm_bytes is None:
                # 仅当可确认为裸 PCM（非 WAV/WebM 容器）时才把原始字节当 PCM，避免 WebM 数据被误当 PCM 导致 empty speech
                is_likely_container = (
                    full_bytes[:4] == b"RIFF"
                    or full_bytes[:4] == b"\x1aE\xdf\xa3"
                    or b"webm" in full_bytes[:64].lower()
                )
                if not is_likely_container and len(full_bytes) >= 1600:
                    pcm_bytes = full_bytes
                    logger.info("[ASR] 未检测到容器头，将原始字节视为 PCM 使用")
                else:
                    logger.warning(
                        "[ASR] 音频解码失败 session_id=%s raw_len=%s 疑似容器格式（WebM/WAV），需安装 ffmpeg 以便 pydub 解码",
                        session_id, total_raw,
                    )
                    return {"text": "", "is_final": True}
            if len(pcm_bytes) < 800:
                logger.warning("[ASR] PCM 过短无法识别 session_id=%s pcm_len=%s", session_id, len(pcm_bytes))
                return {"text": "", "is_final": True}

            # 3. 转 numpy 并音量归一化
            audio_array = bytes_to_numpy(pcm_bytes)
            if audio_array is None:
                logger.warning("[ASR] bytes_to_numpy 失败 session_id=%s", session_id)
                return {"text": "", "is_final": True}
            num_samples = len(audio_array)
            duration_ms = num_samples * 1000 // 16000
            peak_raw = float(np.max(np.abs(audio_array)))
            rms_raw = float(np.sqrt(np.mean(audio_array ** 2)) + 1e-12)
            logger.info("[ASR] 归一化前 session_id=%s peak=%.4f rms=%.4f 采样数=%s 时长≈%s ms",
                        session_id, peak_raw, rms_raw, num_samples, duration_ms)
            if peak_raw < 0.005 and rms_raw < 0.002:
                logger.warning("[ASR] 音频几乎静音，可能麦克风未工作或音量过小 session_id=%s", session_id)
            peak = peak_raw + 1e-8
            if peak < 0.1:
                peak = 0.1
            audio_array = (audio_array / peak) * 0.95
            pcm_bytes = (np.clip(audio_array, -1.0, 1.0) * 32767).astype(np.int16).tobytes()
            logger.info("[ASR] PCM 就绪 session_id=%s 采样数=%s 时长≈%s ms", session_id, num_samples, duration_ms)

            # 4. 调用模型识别
            if self._use_sense_voice:
                wav_path = None
                try:
                    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
                        wav_path = f.name
                    with wave.open(wav_path, "wb") as wav_file:
                        wav_file.setnchannels(1)
                        wav_file.setsampwidth(2)
                        wav_file.setframerate(16000)
                        wav_file.writeframes(pcm_bytes)
                    logger.debug("[ASR] SenseVoice 输入 wav 路径=%s 帧数=%s", wav_path, len(pcm_bytes) // 2)
                    if getattr(settings, "asr_debug_save_wav", False):
                        import shutil
                        debug_wav = _BACKEND_DIR / "asr_debug_last.wav"
                        try:
                            shutil.copy2(wav_path, debug_wav)
                            logger.info("[ASR] 已保存调试 WAV 供试听: %s", debug_wav)
                        except Exception as e:
                            logger.warning("[ASR] 保存调试 WAV 失败: %s", e)
                    # merge_vad=False：整段解码，避免整段被 VAD 判为无语音导致 empty speech（若麦克风音量偏小可改善）
                    result = self.model.generate(
                        input=wav_path,
                        cache={},
                        use_itn=True,
                        batch_size_s=60,
                        merge_vad=False,
                        merge_length_s=15,
                    )
                    logger.info("[ASR] SenseVoice 原始返回 type=%s 内容摘要=%s",
                                type(result).__name__,
                                str(result)[:200] if result else "None")
                    if result and isinstance(result, list) and len(result) > 0:
                        first = result[0]
                        if isinstance(first, dict) and not (first.get("text") or "").strip():
                            logger.warning("[ASR] 模型返回空文本（empty speech）：通常为 VAD 未检测到人声，请检查麦克风、系统音量及浏览器是否允许录音")
                finally:
                    if wav_path and Path(wav_path).exists():
                        try:
                            Path(wav_path).unlink(missing_ok=True)
                        except Exception as e:
                            logger.debug("[ASR] 删除临时 wav 失败: %s", e)
            else:
                logger.debug("[ASR] paraformer 输入 array 长度=%s", len(audio_array))
                result = self.model.generate(input=audio_array)
                logger.info("[ASR] paraformer 原始返回 type=%s 内容摘要=%s",
                            type(result).__name__,
                            str(result)[:200] if result else "None")

            # 5. 解析结果文本
            parts = _collect_result_text(result)
            text_stripped = "".join(parts).strip()
            if len(parts) > 1:
                logger.info("[ASR] 多段合并 session_id=%s 段数=%s 合并后长度=%s 首50字=%s",
                            session_id, len(parts), len(text_stripped), (text_stripped[:50] or "(空)"))
            logger.info("[ASR] 识别完成 session_id=%s is_final=True text_len=%s 内容=%s",
                        session_id, len(text_stripped), (text_stripped[:80] + "..." if len(text_stripped) > 80 else text_stripped or "(空)"))

            return {"text": text_stripped, "is_final": True}

        except Exception as e:
            logger.error("[ASR] 转录异常 session_id=%s error=%s", session_id, e, exc_info=True)
            return None

    def clear_session(self, session_id: str):
        """清除会话的音频缓冲区。"""
        if session_id in self.audio_buffer:
            del self.audio_buffer[session_id]
            logger.debug("[ASR] 已清除缓冲区 session_id=%s", session_id)
