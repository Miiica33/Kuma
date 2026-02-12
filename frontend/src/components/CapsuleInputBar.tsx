'use client'

import { useState, useRef, useEffect } from 'react'
import { Keyboard, Mic, Plus } from 'lucide-react'
import { useChatStore } from '@/lib/store'
import { socketClient } from '@/lib/socket'
import { blobTo16kWav } from '@/lib/audioWav'
import { cn } from '@/lib/utils'
import AudioVisualizer from './AudioVisualizer'

type InputMode = 'voice' | 'text'

interface CapsuleInputBarProps {
  onSendText: (text: string) => void
  disabled?: boolean
}

export default function CapsuleInputBar({ onSendText, disabled = false }: CapsuleInputBarProps) {
  const [mode, setMode] = useState<InputMode>('voice')
  const [text, setText] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const sendLockRef = useRef(false)
  const { setRecordingState } = useChatStore()

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  const startRecording = async () => {
    if (disabled) return
    try {
      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            sampleRate: 16000,
            echoCancellation: true,
            noiseSuppression: true,
          },
        })
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      }
      streamRef.current = stream
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }
      mediaRecorder.onstop = async () => {
        if (audioChunksRef.current.length > 0) {
          const blob =
            audioChunksRef.current.length === 1
              ? audioChunksRef.current[0]
              : new Blob(audioChunksRef.current, { type: 'audio/webm' })
          try {
            const wavBlob = await blobTo16kWav(blob)
            const reader = new FileReader()
            reader.onloadend = () => socketClient.sendAudio(reader.result as string, true)
            reader.readAsDataURL(wavBlob)
          } catch (e) {
            console.error('录音转 16kHz WAV 失败', e)
          }
        }
        streamRef.current?.getTracks().forEach((track) => track.stop())
        streamRef.current = null
        setRecordingState('idle')
      }
      mediaRecorder.start() // 不传 timeslice：松开时一次性得到完整 WebM，后端解码才能听到人声
      setIsRecording(true)
      setRecordingState('recording')
    } catch (error) {
      console.error('启动录音失败:', error)
      alert('无法访问麦克风，请检查权限设置')
      setRecordingState('idle')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setRecordingState('processing')
    }
  }

  const handleHoldStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    if (mode === 'voice' && !isRecording) startRecording()
  }

  const handleHoldEnd = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    if (mode === 'voice' && isRecording) stopRecording()
  }

  const handleSendText = () => {
    if (sendLockRef.current) return
    const trimmed = text.trim()
    if (!trimmed || disabled) return
    sendLockRef.current = true
    onSendText(trimmed)
    setText('')
    window.setTimeout(() => {
      sendLockRef.current = false
    }, 400)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (e.repeat) return
      handleSendText()
    }
  }

  return (
    <div
      className="w-full px-6 md:px-12 md:pb-5"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 28px)' }}
    >
      <AudioVisualizer isRecording={isRecording} className="mb-2 hidden md:flex" />
      {/* 胶囊容器：渐变描边效果 */}
      <div className="capsule-gradient-border flex items-center w-full max-w-2xl mx-auto min-h-[56px] md:min-h-[52px]">
        <div className="flex items-center flex-1 w-full min-h-[52px] md:min-h-[48px] overflow-hidden">
          {/* 左侧：键盘/语音切换 */}
          <button
            type="button"
            onClick={() => setMode((m) => (m === 'voice' ? 'text' : 'voice'))}
            disabled={disabled}
            className={cn(
              'shrink-0 flex items-center justify-center w-12 h-12 md:w-12 md:h-12 rounded-full',
              'bg-transparent text-muted-foreground hover:text-foreground hover:opacity-80',
              'transition-colors disabled:opacity-50'
            )}
            aria-label={mode === 'voice' ? '切换到文字输入' : '切换到语音输入'}
          >
            {mode === 'voice' ? (
              <Keyboard className="h-5 w-5 md:h-6 md:w-6" />
            ) : (
              <Mic className="h-5 w-5 md:h-6 md:w-6" />
            )}
          </button>

          {/* 中间：语音按住区域 或 文字输入框 */}
          <div className="flex-1 min-w-0 flex items-center px-2">
            {mode === 'voice' ? (
              <div
                className={cn(
                  'w-full py-3.5 md:py-3 text-center text-base md:text-base text-muted-foreground select-none',
                  'bg-transparent rounded-full cursor-default',
                  !disabled && 'active:opacity-80'
                )}
                onMouseDown={handleHoldStart}
                onMouseUp={handleHoldEnd}
                onMouseLeave={handleHoldEnd}
                onTouchStart={handleHoldStart}
                onTouchEnd={handleHoldEnd}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault()
                    if (e.type === 'keydown' && e.repeat) return
                    if (e.type === 'keydown') startRecording()
                    else stopRecording()
                  }
                }}
              >
                {isRecording ? (
                  <>
                    <AudioVisualizer
                      isRecording={isRecording}
                      className="pointer-events-none md:hidden"
                      canvasClassName="w-full max-w-[120px] h-6"
                    />
                    <span className="hidden md:inline">正在录音，松开发送</span>
                  </>
                ) : (
                  '按住说话'
                )}
              </div>
            ) : (
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入消息..."
                disabled={disabled}
                className={cn(
                  'w-full py-3 md:py-3 px-3 bg-transparent text-base md:text-base',
                  'placeholder:text-muted-foreground outline-none border-0'
                )}
              />
            )}
          </div>

          {/* 右侧：与语音模式一致，统一为加号占位 */}
          <button
            type="button"
            disabled
            className={cn(
              'shrink-0 flex items-center justify-center w-12 h-12 md:w-12 md:h-12 rounded-full',
              'bg-transparent text-muted-foreground cursor-default opacity-60'
            )}
            aria-label="更多功能（占位）"
          >
            <Plus className="h-5 w-5 md:h-6 md:w-6" />
          </button>
        </div>
      </div>
    </div>
  )
}
