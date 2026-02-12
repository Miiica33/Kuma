'use client'

import { useState, useRef, useEffect } from 'react'
import { Mic, MicOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useChatStore } from '@/lib/store'
import { socketClient } from '@/lib/socket'
import { blobTo16kWav } from '@/lib/audioWav'
import AudioVisualizer from './AudioVisualizer'

export default function VoiceInput() {
  const [isRecording, setIsRecording] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const { recordingState, setRecordingState } = useChatStore()

  useEffect(() => {
    return () => {
      // 清理资源
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  const startRecording = async () => {
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

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      })

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
            reader.onloadend = () => {
              const base64Audio = reader.result as string
              socketClient.sendAudio(base64Audio, true)
            }
            reader.readAsDataURL(wavBlob)
          } catch (e) {
            console.error('录音转 16kHz WAV 失败', e)
            setRecordingState('idle')
          }
        }

        // 停止所有音频轨道
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop())
          streamRef.current = null
        }

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

  const handleMouseDown = () => {
    if (!isRecording) {
      startRecording()
    }
  }

  const handleMouseUp = () => {
    if (isRecording) {
      stopRecording()
    }
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault()
    handleMouseDown()
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault()
    handleMouseUp()
  }

  return (
    <div className="flex flex-col items-center gap-2 md:gap-3">
      <AudioVisualizer isRecording={isRecording} />
      
      <Button
        size="icon"
        className={`h-14 w-14 md:h-16 md:w-16 rounded-full transition-all ${
          isRecording
            ? 'bg-red-500 hover:bg-red-600 active:bg-red-700 animate-pulse'
            : 'bg-primary hover:bg-primary/90 active:bg-primary/80'
        }`}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        disabled={recordingState === 'processing'}
      >
        {isRecording ? (
          <MicOff className="h-6 w-6 md:h-8 md:w-8" />
        ) : (
          <Mic className="h-6 w-6 md:h-8 md:w-8" />
        )}
      </Button>
      
      <p className="text-xs md:text-sm text-muted-foreground text-center px-2">
        {isRecording ? '正在录音，松开结束' : '按住说话'}
      </p>
    </div>
  )
}
