'use client'

import { useEffect, useRef } from 'react'
import { RecordingState } from '@/types'

interface AudioVisualizerProps {
  isRecording: boolean
  className?: string
  canvasClassName?: string
}

export default function AudioVisualizer({
  isRecording,
  className = '',
  canvasClassName = 'w-full max-w-[180px] md:max-w-xs',
}: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number>()

  useEffect(() => {
    if (!isRecording) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height
    const centerY = height / 2
    const barCount = 20
    const barWidth = width / barCount
    const maxBarHeight = height * 0.6

    let bars: number[] = Array(barCount).fill(0.3)

    const animate = () => {
      ctx.clearRect(0, 0, width, height)

      // 更新条形高度（模拟音频波形）
      bars = bars.map((bar) => {
        const change = (Math.random() - 0.5) * 0.2
        const newBar = Math.max(0.1, Math.min(1, bar + change))
        return newBar
      })

      // 绘制条形
      bars.forEach((bar, index) => {
        const barHeight = bar * maxBarHeight
        const x = index * barWidth + barWidth / 2
        const gradient = ctx.createLinearGradient(0, centerY - barHeight, 0, centerY + barHeight)
        gradient.addColorStop(0, 'rgba(139, 92, 246, 0.8)')
        gradient.addColorStop(1, 'rgba(139, 92, 246, 0.3)')

        ctx.fillStyle = gradient
        ctx.fillRect(x - barWidth / 4, centerY - barHeight / 2, barWidth / 2, barHeight)
      })

      animationFrameRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isRecording])

  if (!isRecording) {
    return null
  }

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <canvas
        ref={canvasRef}
        width={200}
        height={60}
        className={canvasClassName}
      />
    </div>
  )
}
