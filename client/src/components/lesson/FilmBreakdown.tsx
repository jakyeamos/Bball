import React, { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export interface FilmBreakdownRef {
  seekTo: (time: number) => void;
  pause: () => void;
  play: () => void;
}

interface FilmBreakdownProps {
  contentUrl: string;
  onTimeUpdate: (time: number) => void;
  onReady?: () => void;
  onError?: () => void;
}

export function extractVideoId(url: string): string {
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname.includes('youtube.com')) {
      if (urlObj.pathname.startsWith('/embed/')) {
        return urlObj.pathname.split('/')[2];
      }
      return urlObj.searchParams.get('v') || '';
    }
    if (urlObj.hostname === 'youtu.be') {
      return urlObj.pathname.slice(1);
    }
  } catch (e) {
    // Basic fallback for embedded iframe src or plain ids
    const match = url.match(/(?:embed\/|v=|youtu\.be\/)([^&?]+)/);
    if (match) return match[1];
  }
  return url; // fallback to assuming it might be an ID
}

export const FilmBreakdown = forwardRef<FilmBreakdownRef, FilmBreakdownProps>(
  ({ contentUrl, onTimeUpdate, onReady, onError }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const playerRef = useRef<any>(null);
    const [isReady, setIsReady] = useState(false);

    const videoId = extractVideoId(contentUrl);

    useEffect(() => {
      // Load YouTube API
      if (window.YT && window.YT.Player) {
        setIsReady(true);
      } else {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        if (firstScriptTag && firstScriptTag.parentNode) {
          firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        }
        tag.onerror = () => {
          onError?.();
        };
        const existingCallback = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
          setIsReady(true);
          if (existingCallback) existingCallback();
        };
      }
    }, []);

    useEffect(() => {
      if (!isReady || !containerRef.current) return;
      if (playerRef.current) return; // already initialized

      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId,
        playerVars: {
          autoplay: 0,
          modestbranding: 1,
          rel: 0,
          controls: 1,
        },
        events: {
          onReady: () => {
            onReady?.();
          },
          onStateChange: (event: any) => {
            if (event.data === window.YT.PlayerState.PLAYING) {
              startPolling();
            } else {
              stopPolling();
            }
          },
          onError: () => {
            onError?.();
          },
        },
      });

      return () => {
        stopPolling();
        if (playerRef.current) {
          playerRef.current.destroy();
          playerRef.current = null;
        }
      };
    }, [isReady, videoId]);

    const intervalRef = useRef<number | null>(null);

    const startPolling = useCallback(() => {
      if (intervalRef.current) return;
      intervalRef.current = window.setInterval(() => {
        if (playerRef.current && playerRef.current.getCurrentTime) {
          onTimeUpdate(playerRef.current.getCurrentTime());
        }
      }, 500); // Polling every 500ms
    }, [onTimeUpdate]);

    const stopPolling = useCallback(() => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }, []);

    useImperativeHandle(ref, () => ({
      seekTo: (time: number) => {
        if (playerRef.current && playerRef.current.seekTo) {
          playerRef.current.seekTo(time, true);
          playerRef.current.playVideo();
          onTimeUpdate(time);
        }
      },
      pause: () => {
        if (playerRef.current?.pauseVideo) {
          playerRef.current.pauseVideo();
        }
      },
      play: () => {
        if (playerRef.current?.playVideo) {
          playerRef.current.playVideo();
        }
      },
    }));

    return (
      <div className="aspect-video bg-cv-steel rounded-cv overflow-hidden w-full relative">
        <div ref={containerRef} className="absolute inset-0 w-full h-full" />
      </div>
    );
  }
);
