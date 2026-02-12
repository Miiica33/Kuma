from fastapi import WebSocket, WebSocketDisconnect
import json
import logging
import uuid
from typing import Optional

from app.core.websocket import manager
from app.services.asr import ASRService
from app.services.llm import LLMService

logger = logging.getLogger(__name__)

# 全局服务实例（延迟初始化）
asr_service: Optional[ASRService] = None
llm_service: Optional[LLMService] = None


async def get_asr_service() -> ASRService:
    """获取 ASR 服务实例（单例）"""
    global asr_service
    if asr_service is None:
        asr_service = ASRService()
        await asr_service.initialize()
    return asr_service


async def get_llm_service() -> LLMService:
    """获取 LLM 服务实例（单例）"""
    global llm_service
    if llm_service is None:
        llm_service = LLMService()
        logger.info("LLM 服务已就绪（单例已创建）")
    return llm_service


async def websocket_endpoint(websocket: WebSocket):
    """WebSocket 端点处理函数"""
    client_id = str(uuid.uuid4())

    try:
        await manager.connect(websocket, client_id)
        logger.info("WebSocket 连接就绪 client_id=%s", client_id)

        # 初始化服务
        asr = await get_asr_service()
        llm = await get_llm_service()
        logger.info("ASR/LLM 服务已就绪 client_id=%s", client_id)

        # 获取连接数据
        conn_data = manager.get_connection_data(client_id)
        conversation_history = conn_data.get("conversation_history", [])

        while True:
            # 接收客户端消息
            data = await websocket.receive_json()
            message_type = data.get("type")
            logger.info("收到消息 type=%s client_id=%s", message_type, client_id)

            if message_type == "audio":
                # 处理音频消息
                payload = data.get("payload", "")
                finish = data.get("finish", False)
                
                if payload:
                    # 调用 ASR 服务进行识别
                    try:
                        result = await asr.transcribe_audio(payload, finish, session_id=client_id)

                        if result is None and finish:
                            # ASR 未就绪或识别失败，提示用户（详见 backend 日志 [ASR] 排查）
                            await manager.send_personal_message({
                                "type": "asr_unavailable",
                                "error": "语音识别暂不可用，请使用文字输入。若使用本地 SenseVoice，请查看后端日志 [ASR] 确认识别过程与错误原因。"
                            }, client_id)
                        elif result:
                            # 仅当识别到文本时才推送；录音中未检测到任何文本时不发送消息
                            if (result.get("text") or "").strip():
                                await manager.send_personal_message({
                                    "type": "asr_result",
                                    "text": result.get("text", ""),
                                    "is_final": result.get("is_final", False)
                                }, client_id)
                            if result.get("is_final"):
                                logger.info(
                                    "ASR 最终结果 client_id=%s text_len=%s",
                                    client_id,
                                    len(result.get("text", "")),
                                )

                            # 如果是最终结果，更新当前文本
                            if result.get("is_final"):
                                current_text = result.get("text", "").strip()

                                # 如果文本不为空，触发 LLM 调用
                                if current_text:
                                    logger.info("触发 LLM 调用 client_id=%s prompt_len=%s", client_id, len(current_text))
                                    # 添加用户消息到历史（用于后续轮次）
                                    conversation_history.append({
                                        "role": "user",
                                        "content": current_text
                                    })
                                    # 更新连接数据
                                    manager.update_connection_data(client_id, {
                                        "conversation_history": conversation_history,
                                        "current_text": ""
                                    })
                                    # 传给 LLM 的历史不包含本条，避免 _format_messages 里重复当前句
                                    history_for_llm = conversation_history[:-1]

                                    async def send_llm_chunk(chunk: dict):
                                        await manager.send_personal_message({
                                            "type": "llm_chunk",
                                            "text": chunk.get("text", ""),
                                            "is_final": chunk.get("is_final", False)
                                        }, client_id)

                                    accumulated = await llm.generate_stream(
                                        prompt=current_text,
                                        history=history_for_llm,
                                        callback=send_llm_chunk
                                    )
                                    if accumulated:
                                        conversation_history.append({
                                            "role": "assistant",
                                            "content": accumulated,
                                        })

                    except Exception as e:
                        logger.error("ASR 处理错误 client_id=%s error=%s", client_id, e, exc_info=True)
                        await manager.send_personal_message({
                            "type": "error",
                            "error": f"语音识别失败: {str(e)}"
                        }, client_id)

            elif message_type == "text":
                # 处理文本消息
                text = data.get("payload", "").strip()
                logger.info("收到 text 消息 client_id=%s payload_len=%s has_text=%s", client_id, len(data.get("payload", "")), bool(text))
                if text:
                    logger.info("调用 LLM 文本消息 client_id=%s text_len=%s", client_id, len(text))
                    # 添加用户消息到历史（用于后续轮次）
                    conversation_history.append({
                        "role": "user",
                        "content": text
                    })
                    manager.update_connection_data(client_id, {
                        "conversation_history": conversation_history
                    })
                    # 传给 LLM 的历史不包含本条，避免重复当前句
                    history_for_llm = conversation_history[:-1]

                    async def send_llm_chunk(chunk: dict):
                        await manager.send_personal_message({
                            "type": "llm_chunk",
                            "text": chunk.get("text", ""),
                            "is_final": chunk.get("is_final", False)
                        }, client_id)

                    try:
                        logger.info("LLM generate_stream 开始 client_id=%s", client_id)
                        accumulated = await llm.generate_stream(
                            prompt=text,
                            history=history_for_llm,
                            callback=send_llm_chunk
                        )
                        logger.info("LLM generate_stream 结束 client_id=%s accumulated_len=%s", client_id, len(accumulated or ""))
                        if accumulated:
                            conversation_history.append({
                                "role": "assistant",
                                "content": accumulated,
                            })
                    except Exception as e:
                        logger.error("LLM 处理错误 client_id=%s error=%s", client_id, e, exc_info=True)
                        await manager.send_personal_message({
                            "type": "error",
                            "error": f"生成回复失败: {str(e)}"
                        }, client_id)

            else:
                logger.warning("未知消息类型 client_id=%s type=%s", client_id, message_type)
                await manager.send_personal_message({
                    "type": "error",
                    "error": f"未知的消息类型: {message_type}"
                }, client_id)

    except WebSocketDisconnect:
        manager.disconnect(client_id)
        logger.info("客户端断开连接 client_id=%s 当前连接数=%s", client_id, len(manager.active_connections))
    except Exception as e:
        logger.error("WebSocket 处理错误 client_id=%s error=%s", client_id, e, exc_info=True)
        manager.disconnect(client_id)
        try:
            await websocket.close()
        except:
            pass
