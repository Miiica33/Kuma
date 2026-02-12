'use client'

import { Message } from '@/types'
import { cn } from '@/lib/utils'
import MarkdownContent from './MarkdownContent'

interface MessageBubbleProps {
  message: Message
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  const timeStr = new Date(message.timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="flex w-full flex-col items-center px-2 md:px-4">
      <div
        className={cn(
          'w-full max-w-2xl flex flex-col',
          isUser ? 'items-end' : 'items-start'
        )}
      >
        <p
          className={cn(
            'text-xs md:text-xs opacity-70 mb-1',
            isUser ? 'text-right w-full' : 'text-left'
          )}
        >
          {timeStr}
        </p>
        {isUser ? (
          <div className="max-w-[88%] rounded-2xl px-3 py-2 md:px-4 md:py-3 bg-white/90 dark:bg-white/10 text-foreground border border-black/5 dark:border-white/10 shadow-sm">
            <p className="text-base md:text-base whitespace-pre-wrap break-words leading-relaxed">
              {message.content}
            </p>
          </div>
        ) : (
          <div className="w-full max-w-xl">
            <div className="text-base md:text-base text-foreground text-left">
              <MarkdownContent content={message.content} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
