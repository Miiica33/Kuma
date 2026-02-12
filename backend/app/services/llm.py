import logging
import httpx
import json
from typing import List, Dict, Callable, Optional
from pathlib import Path
from app.core.config import settings

logger = logging.getLogger(__name__)


class LLMService:
    """火山引擎方舟 LLM 服务（ark.cn-beijing.volces.com /api/v3/chat/completions）"""
    
    def __init__(self):
        self.api_key = settings.volcano_api_key
        self.api_endpoint = settings.volcano_api_endpoint
        self.model = settings.volcano_model
        self.system_prompt = self._load_system_prompt()
        self.client = None

    def _load_system_prompt(self) -> str:
        """从 Markdown 文件加载 system prompt，失败时回退到默认值。"""
        default_prompt = "你是人工智能助手。"
        prompt_path = Path(__file__).resolve().parent.parent / "prompts" / "system_prompt.md"
        try:
            content = prompt_path.read_text(encoding="utf-8").strip()
            if content:
                logger.info("已加载 system prompt: %s", prompt_path)
                return content
            logger.warning("system prompt 文件为空，使用默认提示词: %s", prompt_path)
        except Exception as exc:
            logger.warning("读取 system prompt 失败，使用默认提示词 path=%s err=%s", prompt_path, exc)
        return default_prompt
    
    async def _get_client(self) -> httpx.AsyncClient:
        """获取 HTTP 客户端"""
        if self.client is None:
            self.client = httpx.AsyncClient(
                timeout=60.0,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                }
            )
            logger.info("LLM HTTP 客户端已创建 endpoint=%s model=%s", self.api_endpoint, getattr(self, "model", "N/A"))
        return self.client
    
    def _format_messages(self, prompt: str, history: List[Dict]) -> List[Dict]:
        """格式化消息历史，与方舟 API 一致：可选 system + 历史 + 当前 user"""
        messages = []
        # 与官方 curl 示例一致：system + messages
        messages.append({
            "role": "system",
            "content": self.system_prompt,
        })
        for item in history:
            messages.append({
                "role": item.get("role", "user"),
                "content": item.get("content", ""),
            })
        messages.append({
            "role": "user",
            "content": prompt,
        })
        return messages
    
    async def generate_stream(
        self,
        prompt: str,
        history: List[Dict] = None,
        callback: Optional[Callable[[Dict], None]] = None
    ) -> str:
        """
        流式生成回复。history 不包含当前这条 user 消息，由内部拼上 prompt。

        Returns:
            完整回复文本，调用方需自行写入对话历史。
        """
        if history is None:
            history = []
        accumulated_text = ""

        if not self.api_key:
            logger.error("未配置 ARK_API_KEY / VOLCANO_API_KEY，无法调用 LLM")
            if callback:
                await callback({"text": "未配置 LLM API Key，请在 .env 中设置 ARK_API_KEY 或 VOLCANO_API_KEY", "is_final": True})
            return accumulated_text

        chunk_count = 0
        try:
            client = await self._get_client()
            messages = self._format_messages(prompt, history)
            logger.info("LLM 流式请求 开始 prompt_len=%s history_turns=%s", len(prompt), len(history))

            # 与官方 curl 一致：messages, model, stream
            request_body = {
                "model": self.model,
                "messages": messages,
                "stream": True,
            }
            url = f"{self.api_endpoint.rstrip('/')}/api/v3/chat/completions"  # 与官方 curl 一致
            logger.info("LLM 请求 url=%s model=%s", url, self.model)

            async with client.stream(
                "POST",
                url,
                json=request_body,
            ) as response:
                logger.info("LLM 响应 status=%s", response.status_code)
                if response.status_code != 200:
                    error_body = await response.aread()
                    try:
                        err_str = error_body.decode("utf-8", errors="replace") if error_body else ""
                    except Exception:
                        err_str = str(response.status_code)
                    logger.error("火山引擎 LLM API 错误 status=%s body=%s", response.status_code, err_str[:500])
                    if callback:
                        await callback({"text": f"API 错误: {response.status_code}", "is_final": True})
                    return accumulated_text

                async for line in response.aiter_lines():
                    if not line.strip():
                        continue
                    
                    # 处理 SSE 格式
                    if line.startswith("data: "):
                        data_str = line[6:]  # 移除 "data: " 前缀
                        
                        if data_str == "[DONE]":
                            # 流结束
                            if callback:
                                await callback({
                                    "text": "",
                                    "is_final": True
                                })
                            break
                        
                        try:
                            data = json.loads(data_str)
                            choices = data.get("choices", [])
                            
                            if choices:
                                delta = choices[0].get("delta", {})
                                content = delta.get("content", "")
                                
                                if content:
                                    accumulated_text += content
                                    chunk_count += 1
                                    if chunk_count == 1:
                                        logger.info("LLM 收到首 chunk content_len=%s", len(content))
                                    if callback:
                                        await callback({
                                            "text": content,
                                            "is_final": False
                                        })
                                
                                # 检查是否完成
                                finish_reason = choices[0].get("finish_reason")
                                if finish_reason:
                                    if callback:
                                        await callback({
                                            "text": "",
                                            "is_final": True
                                        })
                                    break
                        
                        except json.JSONDecodeError as e:
                            logger.warning("解析 JSON 失败: %s 数据: %s", e, (data_str or "")[:200])
                            continue

            logger.info("LLM 流式请求 完成 reply_len=%s chunk_count=%s", len(accumulated_text), chunk_count)

        except Exception as e:
            logger.exception("LLM 流式生成异常: %s", e)
            if callback:
                await callback({
                    "text": f"生成回复失败: {str(e)}",
                    "is_final": True,
                })
        return accumulated_text
    
    async def generate(
        self,
        prompt: str,
        history: List[Dict] = None
    ) -> str:
        """非流式生成回复（用于测试），直接返回 generate_stream 的完整文本。"""
        return await self.generate_stream(prompt, history, callback=None)
    
    async def close(self):
        """关闭 HTTP 客户端"""
        if self.client:
            await self.client.aclose()
            self.client = None
