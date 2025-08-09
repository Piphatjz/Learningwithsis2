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
      if (player) {
        if (player.timeInterval) {
          clearInterval(player.timeInterval)
        }
        player.destroy()
      }
    }
  }, [isReady, videoId, onStateChange, onTimeUpdate, player]) // เพิ่ม dependencies
  // player ถูกเพิ่มเข้ามาเพื่อให้ useEffect ทำงานเมื่อ player instance เปลี่ยน
  // onStateChange และ onTimeUpdate ถูกเพิ่มเข้ามาเพื่อให้ React รู้ว่าฟังก์ชันเหล่านี้เป็น dependency
  // หากฟังก์ชันเหล่านี้เปลี่ยน (ซึ่งไม่ควรบ่อยนักถ้าเป็น useCallback) useEffect จะ re-run

  return <div ref={playerRef} className="w-full h-full" />
}
