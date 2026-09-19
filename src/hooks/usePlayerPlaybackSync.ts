import React, { useState, useRef, useEffect, useCallback } from 'react';
import { YouTubePlayerHandle } from '../types';

export type PlaybackState =
  | 'UNSTARTED'
  | 'BUFFERING'
  | 'PLAYING'
  | 'PAUSED_BY_USER'
  | 'PAUSED_FOR_TTS'
  | 'SEEKING';

export interface UsePlayerPlaybackSyncOptions {
  videoId: string;
  startTime?: number;
  onTimeUpdate?: (currentTime: number) => void;
  onStateChange?: (state: PlaybackState) => void;
  isSyncActive?: boolean;
}

export interface UsePlayerPlaybackSyncReturn {
  playbackState: PlaybackState;
  isPlaying: boolean;
  isMuted: boolean;
  currentTime: number;
  duration: number;
  isPlayerReady: boolean;
  iframeRef: React.RefObject<HTMLIFrameElement>;
  ytPlayerRef: React.MutableRefObject<any>;
  play: () => void;
  pauseByUser: () => void;
  pauseForTTS: () => void;
  resumeAfterTTS: () => void;
  togglePlayPause: () => void;
  toggleMute: () => void;
  seekTo: (seconds: number) => void;
  postIframeCommand: (command: string, args?: any[]) => void;
  handlePlayerStateChange: (stateCode: number) => void;
  playerHandle: YouTubePlayerHandle;
}

export function usePlayerPlaybackSync({
  videoId,
  startTime = 0,
  onTimeUpdate,
  onStateChange,
  isSyncActive = false,
}: UsePlayerPlaybackSyncOptions): UsePlayerPlaybackSyncReturn {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const ytPlayerRef = useRef<any>(null);

  const [playbackState, setPlaybackState] = useState<PlaybackState>('UNSTARTED');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(startTime || 0);
  const [duration, setDuration] = useState<number>(100);
  const [isPlayerReady, setIsPlayerReady] = useState<boolean>(false);

  // Tracking refs to avoid stale closures in polling loops
  const playbackStateRef = useRef<PlaybackState>('UNSTARTED');
  const isPlayingRef = useRef<boolean>(false);
  const currentTimeRef = useRef<number>(startTime || 0);
  const durationRef = useRef<number>(100);
  const playStartTimeRef = useRef<number>(Date.now() - (startTime || 0) * 1000);
  const isPlayerReadyRef = useRef<boolean>(false);

  // Synchronize state ref
  const setSyncState = useCallback(
    (newState: PlaybackState) => {
      playbackStateRef.current = newState;
      setPlaybackState(newState);
      onStateChange?.(newState);
    },
    [onStateChange]
  );

  const postIframeCommand = useCallback((command: string, args: any[] = []) => {
    try {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({
            event: 'command',
            func: command,
            args,
          }),
          '*'
        );
      }
    } catch {}
  }, []);

  const seekTo = useCallback(
    (seconds: number) => {
      const cleanTime = Math.max(0, seconds);
      currentTimeRef.current = cleanTime;
      setCurrentTime(cleanTime);
      onTimeUpdate?.(cleanTime);
      playStartTimeRef.current = Date.now() - cleanTime * 1000;

      try {
        ytPlayerRef.current?.seekTo?.(cleanTime, true);
      } catch {}
      postIframeCommand('seekTo', [cleanTime, true]);
    },
    [onTimeUpdate, postIframeCommand]
  );

  const play = useCallback(() => {
    setSyncState('PLAYING');
    isPlayingRef.current = true;
    setIsPlaying(true);
    playStartTimeRef.current = Date.now() - currentTimeRef.current * 1000;

    try {
      ytPlayerRef.current?.playVideo?.();
    } catch {}
    postIframeCommand('playVideo');
  }, [postIframeCommand, setSyncState]);

  const pauseByUser = useCallback(() => {
    setSyncState('PAUSED_BY_USER');
    isPlayingRef.current = false;
    setIsPlaying(false);

    try {
      ytPlayerRef.current?.pauseVideo?.();
    } catch {}
    postIframeCommand('pauseVideo');
  }, [postIframeCommand, setSyncState]);

  const pauseForTTS = useCallback(() => {
    setSyncState('PAUSED_FOR_TTS');
    isPlayingRef.current = false;
    setIsPlaying(false);

    try {
      ytPlayerRef.current?.pauseVideo?.();
    } catch {}
    postIframeCommand('pauseVideo');
  }, [postIframeCommand, setSyncState]);

  const resumeAfterTTS = useCallback(() => {
    // Only resume if not explicitly paused by user
    if (playbackStateRef.current === 'PAUSED_BY_USER') return;

    setSyncState('PLAYING');
    isPlayingRef.current = true;
    setIsPlaying(true);
    playStartTimeRef.current = Date.now() - currentTimeRef.current * 1000;

    try {
      ytPlayerRef.current?.playVideo?.();
    } catch {}
    postIframeCommand('playVideo');
  }, [postIframeCommand, setSyncState]);

  const togglePlayPause = useCallback(() => {
    if (isPlayingRef.current) {
      pauseByUser();
    } else {
      play();
    }
  }, [pauseByUser, play]);

  const toggleMute = useCallback(() => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    if (nextMute) {
      try {
        ytPlayerRef.current?.mute?.();
      } catch {}
      postIframeCommand('mute');
    } else {
      try {
        ytPlayerRef.current?.unMute?.();
      } catch {}
      postIframeCommand('unMute');
    }
  }, [isMuted, postIframeCommand]);

  const handlePlayerStateChange = useCallback(
    (stateCode: number) => {
      // YouTube YT.PlayerState:
      // -1 (UNSTARTED), 0 (ENDED), 1 (PLAYING), 2 (PAUSED), 3 (BUFFERING), 5 (CUED)
      if (stateCode === 1) {
        // Video started playing
        isPlayingRef.current = true;
        setIsPlaying(true);
        setSyncState('PLAYING');
        playStartTimeRef.current = Date.now() - currentTimeRef.current * 1000;
      } else if (stateCode === 2) {
        // Video paused
        isPlayingRef.current = false;
        setIsPlaying(false);
        if (playbackStateRef.current !== 'PAUSED_FOR_TTS') {
          setSyncState('PAUSED_BY_USER');
        }
      } else if (stateCode === 3) {
        setSyncState('BUFFERING');
      } else if (stateCode === 0) {
        isPlayingRef.current = false;
        setIsPlaying(false);
        setSyncState('PAUSED_BY_USER');
      }
    },
    [setSyncState]
  );

  // Time polling loop
  useEffect(() => {
    const interval = setInterval(() => {
      let t: number | undefined;
      try {
        const rawTime = ytPlayerRef.current?.getCurrentTime?.();
        if (typeof rawTime === 'number' && !isNaN(rawTime) && rawTime >= 0) {
          t = rawTime;
        }
      } catch {}

      if (t !== undefined) {
        currentTimeRef.current = t;
        setCurrentTime(t);
        onTimeUpdate?.(t);
      } else if (isPlayingRef.current) {
        const simulated = (Date.now() - playStartTimeRef.current) / 1000;
        currentTimeRef.current = simulated;
        setCurrentTime(simulated);
        onTimeUpdate?.(simulated);
      }

      // Check duration if available
      try {
        const d = ytPlayerRef.current?.getDuration?.();
        if (typeof d === 'number' && !isNaN(d) && d > 0 && d !== durationRef.current) {
          durationRef.current = d;
          setDuration(d);
        }
      } catch {}
    }, 150);

    return () => clearInterval(interval);
  }, [onTimeUpdate]);

  // YouTube Iframe API Binding
  useEffect(() => {
    let checkInterval: NodeJS.Timeout | null = null;

    const initYT = () => {
      if (typeof window === 'undefined' || !(window as any).YT || !(window as any).YT.Player) {
        return false;
      }
      if (!iframeRef.current) return false;

      try {
        ytPlayerRef.current = new (window as any).YT.Player(iframeRef.current, {
          events: {
            onReady: (event: any) => {
              isPlayerReadyRef.current = true;
              setIsPlayerReady(true);
              try {
                const dur = event.target.getDuration();
                if (dur && dur > 0) {
                  durationRef.current = dur;
                  setDuration(dur);
                }
              } catch {}
            },
            onStateChange: (event: any) => {
              handlePlayerStateChange(event.data);
            },
            onError: () => {},
          },
        });
        return true;
      } catch {
        return false;
      }
    };

    if (!initYT()) {
      checkInterval = setInterval(() => {
        if (initYT()) {
          if (checkInterval) clearInterval(checkInterval);
        }
      }, 500);
    }

    return () => {
      if (checkInterval) clearInterval(checkInterval);
      try {
        ytPlayerRef.current?.destroy?.();
      } catch {}
      ytPlayerRef.current = null;
    };
  }, [videoId, handlePlayerStateChange]);

  // Handle postMessage events from YouTube iframe
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      try {
        if (typeof e.data !== 'string') return;
        const data = JSON.parse(e.data);
        if (data.event === 'onStateChange') {
          handlePlayerStateChange(data.info);
        } else if (data.event === 'initialDelivery') {
          if (data.info?.duration) {
            durationRef.current = data.info.duration;
            setDuration(data.info.duration);
          }
          isPlayerReadyRef.current = true;
          setIsPlayerReady(true);
        }
      } catch {}
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handlePlayerStateChange]);

  const playerHandle: YouTubePlayerHandle = {
    play: () => {
      resumeAfterTTS();
    },
    pause: () => {
      pauseForTTS();
    },
    seekTo: (seconds: number) => {
      seekTo(seconds);
    },
    getCurrentTime: () => {
      try {
        const t = ytPlayerRef.current?.getCurrentTime?.();
        if (typeof t === 'number' && !isNaN(t) && t >= 0) {
          currentTimeRef.current = t;
          return t;
        }
      } catch {}
      if (isPlayingRef.current) {
        return (Date.now() - playStartTimeRef.current) / 1000;
      }
      return currentTimeRef.current;
    },
    getPlayerState: () => {
      try {
        const s = ytPlayerRef.current?.getPlayerState?.();
        if (typeof s === 'number') return s;
      } catch {}
      return isPlayingRef.current ? 1 : 2;
    },
    isReady: () => isPlayerReadyRef.current || Boolean(iframeRef.current),
  };

  return {
    playbackState,
    isPlaying,
    isMuted,
    currentTime,
    duration,
    isPlayerReady,
    iframeRef,
    ytPlayerRef,
    play,
    pauseByUser,
    pauseForTTS,
    resumeAfterTTS,
    togglePlayPause,
    toggleMute,
    seekTo,
    postIframeCommand,
    handlePlayerStateChange,
    playerHandle,
  };
}
