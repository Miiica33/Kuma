from typing import Dict, Set
from fastapi import WebSocket
import json
import logging

logger = logging.getLogger(__name__)


class ConnectionManager:
    """WebSocket 连接管理器"""
    
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.connection_data: Dict[str, Dict] = {}
    
    async def connect(self, websocket: WebSocket, client_id: str):
        """接受 WebSocket 连接"""
        await websocket.accept()
        self.active_connections[client_id] = websocket
        self.connection_data[client_id] = {
            "connected_at": None,
            "current_text": "",
            "conversation_history": []
        }
        logger.info("客户端已连接 client_id=%s 当前连接数=%s", client_id, len(self.active_connections))
    
    def disconnect(self, client_id: str):
        """断开 WebSocket 连接"""
        if client_id in self.active_connections:
            del self.active_connections[client_id]
        if client_id in self.connection_data:
            del self.connection_data[client_id]
        logger.info("客户端已断开 client_id=%s 剩余连接数=%s", client_id, len(self.active_connections))
    
    async def send_personal_message(self, message: dict, client_id: str):
        """向指定客户端发送消息"""
        if client_id in self.active_connections:
            try:
                await self.active_connections[client_id].send_json(message)
            except Exception as e:
                logger.error("向客户端发送消息失败 client_id=%s error=%s", client_id, e)
                self.disconnect(client_id)
    
    async def broadcast(self, message: dict):
        """广播消息到所有连接的客户端"""
        disconnected = []
        for client_id, connection in self.active_connections.items():
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error("向客户端广播消息失败 client_id=%s error=%s", client_id, e)
                disconnected.append(client_id)
        
        for client_id in disconnected:
            self.disconnect(client_id)
    
    def get_connection_data(self, client_id: str) -> Dict:
        """获取连接数据"""
        return self.connection_data.get(client_id, {})
    
    def update_connection_data(self, client_id: str, data: Dict):
        """更新连接数据"""
        if client_id in self.connection_data:
            self.connection_data[client_id].update(data)


# 全局连接管理器实例
manager = ConnectionManager()
