import { useCallback, useEffect, useRef, useState } from 'react';
import { loadYouTubeIframeAPI } from '../../lib/loadYouTubeApi.js';

const PLAYING = 1;
const BUFFERING = 3;

const PLAYER_ERRORS = {
  2: '無法播放這支影片，網址參數無效。',
  5: '播放器發生錯誤，請重新載入影片。',
  100: '找不到這支影片，或影片已設為私人。',
  101: '這支影片的擁有者不允許嵌入播放。',
  150: '這支影片的擁有者不允許嵌入播放。',
};

function readTitle(player) {
  try {
    const title = player.getVideoData?.()?.title;
    return typeof title === 'string' ? title.trim() : '';
  } catch {
    return '';
  }
}

export function useYouTubePlayer(session) {
  const videoId = session?.videoId ?? null;
  const startSeconds = session?.startSeconds ?? 0;
  const revision = session?.revision ?? 0;

  const hostRef = useRef(null);
  const playerRef = useRef(null);
  const desiredRateRef = useRef(1);
  const rateRetryRef = useRef(0);
  const titleRef = useRef('');

  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playerState, setPlayerState] = useState(-1);
  const [playbackRate, setPlaybackRateState] = useState(1);
  const [actualRate, setActualRate] = useState(1);

  const applyRate = useCallback((player) => {
    if (!player?.setPlaybackRate) return;
    try {
      player.setPlaybackRate(desiredRateRef.current);
    } catch {
      /* The player can reject a rate before the video starts. */
    }
  }, []);

  useEffect(() => {
    if (!videoId) {
      setReady(false);
      setError('');
      setTitle('');
      titleRef.current = '';
      setCurrentTime(0);
      setDuration(0);
      setPlayerState(-1);
      setActualRate(desiredRateRef.current);
      return undefined;
    }

    const host = hostRef.current;
    if (!host) return undefined;

    let player = null;
    let cancelled = false;
    host.replaceChildren();
    const mount = document.createElement('div');
    host.appendChild(mount);

    setReady(false);
    setError('');
    setTitle('');
    titleRef.current = '';
    setCurrentTime(0);
    setDuration(0);
    setPlayerState(-1);

    const playerVars = {
      autoplay: 0,
      controls: 1,
      rel: 0,
      modestbranding: 1,
      playsinline: 1,
      iv_load_policy: 3,
      hl: 'zh-Hant',
      origin: window.location.origin,
    };
    if (startSeconds > 0) playerVars.start = Math.floor(startSeconds);

    loadYouTubeIframeAPI()
      .then((YT) => {
        if (cancelled || !hostRef.current) return;
        player = new YT.Player(mount, {
          videoId,
          width: '100%',
          height: '100%',
          playerVars,
          events: {
            onReady: (event) => {
              if (cancelled) return;
              playerRef.current = event.target;
              setReady(true);
              const nextTitle = readTitle(event.target);
              if (nextTitle) {
                titleRef.current = nextTitle;
                setTitle(nextTitle);
              }
              applyRate(event.target);
            },
            onStateChange: (event) => {
              if (cancelled) return;
              setPlayerState(event.data);
              if (event.data === YT.PlayerState.PLAYING || event.data === PLAYING) {
                applyRate(event.target);
                const nextTitle = readTitle(event.target);
                if (nextTitle && nextTitle !== titleRef.current) {
                  titleRef.current = nextTitle;
                  setTitle(nextTitle);
                }
              }
            },
            onError: (event) => {
              if (cancelled) return;
              setError(PLAYER_ERRORS[event.data] || '這支影片無法播放。');
            },
          },
        });
        playerRef.current = player;
      })
      .catch((loadError) => {
        if (cancelled) return;
        setError(loadError?.message || '無法載入 YouTube 播放器。');
      });

    return () => {
      cancelled = true;
      setReady(false);
      playerRef.current = null;
      if (player && typeof player.destroy === 'function') {
        try {
          player.destroy();
        } catch {
          /* Ignore teardown races while the iframe is detaching. */
        }
      }
      if (hostRef.current) hostRef.current.replaceChildren();
    };
  }, [applyRate, revision, startSeconds, videoId]);

  useEffect(() => {
    if (!ready) return undefined;

    const intervalId = window.setInterval(() => {
      const player = playerRef.current;
      if (!player || typeof player.getCurrentTime !== 'function') return;
      try {
        const time = player.getCurrentTime();
        if (typeof time === 'number' && !Number.isNaN(time)) {
          setCurrentTime((prev) => (Math.abs(prev - time) < 0.001 ? prev : time));
        }
        const nextDuration = player.getDuration?.();
        if (typeof nextDuration === 'number' && nextDuration > 0) {
          setDuration((prev) => (Math.abs(prev - nextDuration) < 0.1 ? prev : nextDuration));
        }
        const state = player.getPlayerState?.();
        if (typeof state === 'number') {
          setPlayerState((prev) => (prev === state ? prev : state));
        }
        const rate = player.getPlaybackRate?.();
        if (typeof rate === 'number' && rate > 0) {
          setActualRate((prev) => (Math.abs(prev - rate) < 0.001 ? prev : rate));
          const mismatched = Math.abs(rate - desiredRateRef.current) > 0.02;
          if (mismatched && state === PLAYING && rateRetryRef.current < 3) {
            rateRetryRef.current += 1;
            applyRate(player);
          }
          if (!mismatched) rateRetryRef.current = 0;
        }
        if (!titleRef.current) {
          const nextTitle = readTitle(player);
          if (nextTitle) {
            titleRef.current = nextTitle;
            setTitle(nextTitle);
          }
        }
      } catch {
        /* Player methods throw while the iframe is being destroyed. */
      }
    }, 100);

    return () => window.clearInterval(intervalId);
  }, [applyRate, ready]);

  const getTime = useCallback(() => {
    const player = playerRef.current;
    if (!player || typeof player.getCurrentTime !== 'function') return 0;
    try {
      const time = player.getCurrentTime();
      return typeof time === 'number' && !Number.isNaN(time) ? time : 0;
    } catch {
      return 0;
    }
  }, []);

  const getState = useCallback(() => {
    const player = playerRef.current;
    if (!player || typeof player.getPlayerState !== 'function') return -1;
    try {
      const state = player.getPlayerState();
      return typeof state === 'number' ? state : -1;
    } catch {
      return -1;
    }
  }, []);

  const seekTo = useCallback((seconds) => {
    const player = playerRef.current;
    if (!player?.seekTo) return;
    try {
      const duration = player.getDuration?.() || 0;
      let next = Math.max(0, Number(seconds) || 0);
      if (duration > 0 && next > duration) next = duration;
      player.seekTo(next, true);
    } catch {
      /* Ignore seeks against a player that is not ready. */
    }
  }, []);

  const seekBy = useCallback((delta) => {
    const player = playerRef.current;
    if (!player?.getCurrentTime || !player.seekTo) return;
    try {
      const duration = player.getDuration?.() || 0;
      let next = (player.getCurrentTime() || 0) + delta;
      if (next < 0) next = 0;
      if (duration > 0 && next > duration) next = duration;
      player.seekTo(next, true);
    } catch {
      /* Ignore seeks against a player that is not ready. */
    }
  }, []);

  const setPlaybackRate = useCallback((rate) => {
    desiredRateRef.current = rate;
    rateRetryRef.current = 0;
    setPlaybackRateState(rate);
    applyRate(playerRef.current);
  }, [applyRate]);

  const play = useCallback(() => {
    const player = playerRef.current;
    if (!player?.playVideo) return;
    try {
      player.playVideo();
      applyRate(player);
    } catch {
      /* Autoplay restrictions surface as a rejected play, not an app error. */
    }
  }, [applyRate]);

  const pause = useCallback(() => {
    try {
      playerRef.current?.pauseVideo?.();
    } catch {
      /* Ignore pause calls during teardown. */
    }
  }, []);

  return {
    hostRef,
    ready,
    error,
    title,
    currentTime,
    duration,
    isPlaying: playerState === PLAYING || playerState === BUFFERING,
    playbackRate,
    actualRate,
    play,
    pause,
    seekTo,
    seekBy,
    setPlaybackRate,
    getTime,
    getState,
  };
}
