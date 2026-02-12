'use client'

import { useEffect, useRef } from 'react'
import { Wifi, WifiOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useChatStore } from '@/lib/store'
import { socketClient } from '@/lib/socket'
import MessageBubble from './MessageBubble'
import CapsuleInputBar from './CapsuleInputBar'

export default function Chat() {
  const { messages, connectionState, addMessage } = useChatStore()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    socketClient.connect().catch((error) => {
      console.error('WebSocket 连接失败:', error)
    })
    return () => {
      socketClient.disconnect()
    }
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendText = (text: string) => {
    if (!text.trim()) return
    if (connectionState !== 'connected') {
      console.warn('[Chat] 未发送：连接状态不是 connected', connectionState)
      return
    }
    addMessage({
      id: `user-${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: Date.now(),
    })
    socketClient.sendText(text.trim())
  }

  const getConnectionStatus = () => {
    switch (connectionState) {
      case 'connected':
        return { icon: Wifi, text: '已连接', color: 'text-green-500' }
      case 'connecting':
        return { icon: Wifi, text: '连接中...', color: 'text-yellow-500' }
      case 'error':
        return { icon: WifiOff, text: '连接错误', color: 'text-red-500' }
      default:
        return { icon: WifiOff, text: '未连接', color: 'text-gray-500' }
    }
  }

  const status = getConnectionStatus()
  const StatusIcon = status.icon

  return (
    <div className="flex flex-col h-full w-full bg-background">
      {/* 顶部状态栏（无下边线） */}
      <div className="flex items-center justify-between px-4 py-3 md:px-6 md:py-4 shrink-0 safe-area-top">
        <div className="w-8 md:w-10" />
        <div className={`flex items-center gap-1.5 md:gap-2 ${status.color}`}>
          <StatusIcon className="h-3.5 w-3.5 md:h-4 md:w-4" />
          <span className="text-sm md:text-sm">{status.text}</span>
        </div>
      </div>

      {/* 消息列表：始终显示 Kuma 图标与名称；无消息时居中靠上，有消息时被顶到顶部 */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-6 py-4 md:px-12 md:py-6 min-h-0"
      >
        <div
          className={cn(
            'flex flex-col items-center w-full max-w-4xl mx-auto',
            messages.length === 0
              ? 'pt-[10%] md:pt-[10%] min-h-full'
              : 'pt-0 pb-4'
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icons/kuma-logo.png"
            alt="Kuma"
            width={96}
            height={96}
            className="w-20 h-20 md:w-24 md:h-24 object-contain drop-shadow-md shrink-0"
          />
          <h2 className="mt-4 text-xl md:text-2xl font-bold bg-gradient-to-r from-orange-500 to-amber-600 bg-clip-text text-transparent shrink-0">
            Kuma
          </h2>
        </div>
        {messages.length > 0 && (
          <div className="max-w-3xl mx-auto w-full space-y-3 md:space-y-4">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 胶囊形输入栏（无上边线） */}
      <div className="shrink-0 bg-background/95 backdrop-blur-sm">
        <CapsuleInputBar
          onSendText={handleSendText}
          disabled={connectionState !== 'connected'}
        />
      </div>
    </div>
  )
}
