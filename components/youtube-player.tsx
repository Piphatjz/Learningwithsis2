"use client"

import { useEffect, useRef, useState } from 'react'

interface YouTubePlayerProps {
  videoId: string
  onTimeUpdate?: (currentTime: number, duration: number) => void
  onStateChange?: (state: number) => void
}

export function YouTubePlayer({ videoId, onTimeUpdate, onStateChange }: YouTubePlayerProps) {
  const playerRef = useRef<HTMLDivElement>(null)
  const [player, setPlayer] = useState<any>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    // โหลด YouTube IFrame API
    if (!window.YT) {
      const script = document.createElement('script')
      script.src = 'https://www.youtube.com/iframe_api'
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
        height: '100%',
        width: '100%',
        videoId: videoId,
        playerVars: {
          autoplay: 0,
          controls: 1,
          rel: 0,
          showinfo: 0,
          modestbranding: 1,
          playsinline: 1
        },
        events: {
          onReady: (event: any) => {
            console.log('Player ready')
          },
          onStateChange: (event: any) => {
            onStateChange?.(event.data)
            
            if (event.data === window.YT.PlayerState.PLAYING) {
              // เริ่มติดตามเวลา
              const interval = setInterval(() => {
                if (newPlayer && typeof newPlayer.getCurrentTime === 'function') {
                  const currentTime = newPlayer.getCurrentTime()
                  const duration = newPlayer.getDuration()
                  onTimeUpdate?.(currentTime, duration)
                }
              }, 1000)

              // เก็บ interval ใน player object
              newPlayer.timeInterval = interval
            } else {
              // หยุดติดตามเวลา
              if (newPlayer.timeInterval) {
                clearInterval(newPlayer.timeInterval)
              }
            }
          }
        }
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
  }, [isReady, videoId])

  return <div ref={playerRef} className="w-full h-full" />
}
