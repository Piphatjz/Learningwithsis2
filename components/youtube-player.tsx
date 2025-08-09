"use client"

import { useEffect, useRef, useState } from "react"

// Minimal type definitions for YT.Player and YT.PlayerState
interface YouTubePlayerInstance {
  getCurrentTime: () => number
  getDuration: () => number
  destroy: () => void
  timeInterval?: NodeJS.Timeout // Custom property to store interval ID
}

interface YouTubePlayerEvent {
  data: number // Player state (e.g., YT.PlayerState.PLAYING)
  target: YouTubePlayerInstance // The player instance
}

declare global {
  interface Window {
    YT: {
      Player: new (
        element: HTMLElement,
        options: any,
      ) => YouTubePlayerInstance // Simplified for now
      PlayerState: {
        ENDED: number
        PLAYING: number
        PAUSED: number
        BUFFERING: number
        CUED: number
      }
    }
    onYouTubeIframeAPIReady: () => void
  }
}

interface YouTubePlayerProps {
  videoId: string
  onTimeUpdate?: (currentTime: number, duration: number) => void
  onStateChange?: (state: number) => void
}

export function YouTubePlayer({ videoId, onTimeUpdate, onStateChange }: YouTubePlayerProps) {
  const playerRef = useRef<HTMLDivElement>(null)
  const [player, setPlayer] = useState<YouTubePlayerInstance | null>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    // โหลด YouTube IFrame API
    if (!window.YT) {
      const script = document.createElement("script")
      script.src = "https://www.youtube.com/iframe_api"
      script.async = true
      document.body.appendChild(script)

      window.onYouTubeIframeAPIReady = () => {
        setIsReady(true)
      }
    } else {
      setIsReady(true)
    }
  }, [])

  useEffect(() => {
    if (isReady && playerRef.current && videoId) {
      // ตรวจสอบว่า player ยังไม่ถูกสร้าง เพื่อป้องกันการสร้างซ้ำ
      if (player) {
        // หาก player มีอยู่แล้วและ videoId เปลี่ยนไป ให้ทำลาย player เก่าก่อน
        if (player.timeInterval) {
          clearInterval(player.timeInterval)
        }
        player.destroy()
        setPlayer(null) // ตั้งค่า player เป็น null เพื่อให้สร้างใหม่
      }

      const newPlayer = new window.YT.Player(playerRef.current, {
        height: "100%",
        width: "100%",
        videoId: videoId,
        playerVars: {
          autoplay: 0,
          controls: 1,
          rel: 0,
          showinfo: 0,
          modestbranding: 1,
          playsinline: 1,
        },
        events: {
          onReady: (event: YouTubePlayerEvent) => {
            console.log("Player ready")
          },
          onStateChange: (event: YouTubePlayerEvent) => {
            onStateChange?.(event.data)

            if (event.data === window.YT.PlayerState.PLAYING) {
              // เริ่มติดตามเวลา
              const interval = setInterval(() => {
                if (event.target && typeof event.target.getCurrentTime === "function") {
                  const currentTime = event.target.getCurrentTime()
                  const duration = event.target.getDuration()
                  onTimeUpdate?.(currentTime, duration)
                }
              }, 1000)

              // เก็บ interval ใน player object
              event.target.timeInterval = interval
            } else {
              // หยุดติดตามเวลา
              if (event.target.timeInterval) {
                clearInterval(event.target.timeInterval)
              }
            }
          },
        },
      })

      setPlayer(newPlayer)
    }

    return () => {
      // Cleanup function: ทำลาย player เมื่อ component unmounts หรือ videoId เปลี่ยน
      if (player) {
        if (player.timeInterval) {
          clearInterval(player.timeInterval)
        }
        player.destroy()
        setPlayer(null) // ตั้งค่า player เป็น null เพื่อให้แน่ใจว่าถูกทำลาย
      }
    }
  }, [isReady, videoId, onStateChange, onTimeUpdate]) // ลบ 'player' ออกจาก dependency array
  // onStateChange และ onTimeUpdate ควรเป็น stable functions (เช่น ห่อด้วย useCallback ใน parent component)
  // เพื่อป้องกันการ re-render ที่ไม่จำเป็นของ useEffect นี้

  return <div ref={playerRef} className="w-full h-full" />
}
