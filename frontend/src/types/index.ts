// WebSocket 消息类型
export type MessageType = "audio" | "text" | "asr_result" | "llm_chunk" | "error" | "asr_unavailable";

export interface ClientMessage {
  type: "audio" | "text";
  payload: string;
  finish?: boolean;
}

export interface ServerMessage {
  type: MessageType;
  text?: string;
  is_final?: boolean;
  error?: string;
}

// 消息数据模型
export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  isStreaming?: boolean;
}

// 录音状态
export type RecordingState = "idle" | "recording" | "processing";

// WebSocket 连接状态
export type ConnectionState = "disconnected" | "connecting" | "connected" | "error";
