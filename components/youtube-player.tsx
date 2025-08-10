"use client"

import { useEffect, useRef, useState } from "react"

// Minimal type definitions for YT.Player and YT.PlayerState
interface YouTubePlayerInstance {
  getCurrentTime: () => number
  getDuration: () => number
  destroy: () => void
  // Note: timeInterval is a custom property we add for cleanup
  timeInterval?: NodeJS.Timeout
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
  // No need for `player` state here, manage instance locally within useEffect
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
    let currentInterval: NodeJS.Timeout | undefined // Local variable for interval ID
    let currentNewPlayer: YouTubePlayerInstance | null = null // Local variable for player instance

    if (isReady && playerRef.current && videoId) {
      currentNewPlayer = new window.YT.Player(playerRef.current, {
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
          onReady: () => {
            console.log("Player ready for videoId:", videoId)
          },
          onStateChange: (event: YouTubePlayerEvent) => {
            onStateChange?.(event.data)

            if (event.data === window.YT.PlayerState.PLAYING) {
              // เริ่มติดตามเวลา
              currentInterval = setInterval(() => {
                if (currentNewPlayer && typeof currentNewPlayer.getCurrentTime === "function") {
                  const currentTime = currentNewPlayer.getCurrentTime()
                  const duration = currentNewPlayer.getDuration()
                  onTimeUpdate?.(currentTime, duration)
                }
              }, 1000)
            } else {
              // หยุดติดตามเวลา
              if (currentInterval) {
                clearInterval(currentInterval)
                currentInterval = undefined // Clear the interval ID
              }
            }
          },
        },
      })
    }

    return () => {
      // Cleanup function: This closes over `currentNewPlayer` and `currentInterval`
      // from this specific effect run.
      if (currentInterval) {
        clearInterval(currentInterval)
      }
      if (currentNewPlayer) {
        currentNewPlayer.destroy()
      }
    }
  }, [isReady, videoId, onStateChange, onTimeUpdate]) // Dependencies are stable callbacks and props

  return <div ref={playerRef} className="w-full h-full" />
}
