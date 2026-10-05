import { useEffect, useRef, useState } from 'react';
import {
  evaluateSegmentEnd,
  isValidSegment,
  segmentHint,
  segmentProgress,
  shouldRestartFromA,
} from './segmentLoop.js';
import { DEFAULT_LOOP_TARGET, DEFAULT_WAIT_SECONDS } from './options.js';

function roundTime(seconds) {
  return Math.round(seconds * 100) / 100;
}

/**
 * Coordinates A–B looping and pause-and-repeat on top of the player clock.
 * Later features (subtitles, recording, waveform, pitch) can observe
 * currentTime, the A–B segment, and `phase` without touching the player.
 */
export function usePracticeSession(player, videoId, revision = 0) {
  const playerRef = useRef(player);
  playerRef.current = player;

  const [pointA, setPointA] = useState(null);
  const [pointB, setPointB] = useState(null);
  const [loopEnabled, setLoopEnabled] = useState(false);
  const [pauseRepeatEnabled, setPauseRepeatEnabled] = useState(false);
  const [loopTarget, setLoopTargetState] = useState(DEFAULT_LOOP_TARGET);
  const [loopsCompleted, setLoopsCompleted] = useState(0);
  const [waitSeconds, setWaitSecondsState] = useState(DEFAULT_WAIT_SECONDS);
  const [phase, setPhase] = useState('idle');
  const [waitRemaining, setWaitRemaining] = useState(0);
  const [onceActive, setOnceActive] = useState(false);

  const pointARef = useRef(null);
  const pointBRef = useRef(null);
  const loopEnabledRef = useRef(false);
  const pauseRepeatRef = useRef(false);
  const loopTargetRef = useRef(DEFAULT_LOOP_TARGET);
  const waitSecondsRef = useRef(DEFAULT_WAIT_SECONDS);
  const phaseRef = useRef('idle');
  const loopsRef = useRef(0);
  const gateRef = useRef(false);
  const waitTokenRef = useRef(0);
  const pausedAtRef = useRef(null);
  const resumeTokenRef = useRef(0);
  const onceRef = useRef(false);
  const savedTargetRef = useRef(null);

  pointARef.current = pointA;
  pointBRef.current = pointB;
  loopEnabledRef.current = loopEnabled;
  pauseRepeatRef.current = pauseRepeatEnabled;
  loopTargetRef.current = loopTarget;
  waitSecondsRef.current = waitSeconds;

  function setPhaseBoth(next) {
    phaseRef.current = next;
    setPhase(next);
  }

  function setOnce(next) {
    onceRef.current = next;
    setOnceActive(next);
  }

  function resetCount() {
    loopsRef.current = 0;
    setLoopsCompleted(0);
    gateRef.current = false;
  }

  function cancelWait() {
    waitTokenRef.current += 1;
    pausedAtRef.current = null;
    setWaitRemaining(0);
  }

  function stopPlaybackHold() {
    resumeTokenRef.current += 1;
  }

  // YouTube can pause itself when a loop seeks back to A. Keep nudging
  // playback for a short window, and stop as soon as the learner pauses.
  function holdPlayback() {
    const token = resumeTokenRef.current + 1;
    resumeTokenRef.current = token;
    const nudge = (remaining) => {
      window.setTimeout(() => {
        if (resumeTokenRef.current !== token) return;
        const phaseNow = phaseRef.current;
        if (phaseNow === 'waiting' || phaseNow === 'complete' || phaseNow === 'idle') return;
        const state = playerRef.current.getState();
        if (state !== 1 && state !== 3) playerRef.current.play();
        if (remaining > 0) nudge(remaining - 1);
      }, 200);
    };
    playerRef.current.play();
    nudge(6);
  }

  function armSession({ seekIfOutside = false } = {}) {
    resetCount();
    cancelWait();
    const active = loopEnabledRef.current || pauseRepeatRef.current;
    setPhaseBoth(active ? 'listening' : 'idle');

    if (!seekIfOutside || !active) return;
    const mode = pauseRepeatRef.current ? 'pause' : 'loop';
    const time = playerRef.current.getTime();
    const state = playerRef.current.getState();
    const wasPlaying = state === 1 || state === 3;
    if (shouldRestartFromA({
      time,
      pointA: pointARef.current,
      pointB: pointBRef.current,
      mode,
    })) {
      gateRef.current = true;
      playerRef.current.seekTo(pointARef.current);
      if (wasPlaying) holdPlayback();
    }
  }

  function capturePoint(which) {
    const time = roundTime(playerRef.current.getTime());
    if (which === 'a') {
      pointARef.current = time;
      setPointA(time);
    } else {
      pointBRef.current = time;
      setPointB(time);
    }

    if (!isValidSegment(pointARef.current, pointBRef.current)) {
      loopEnabledRef.current = false;
      pauseRepeatRef.current = false;
      setLoopEnabled(false);
      setPauseRepeatEnabled(false);
      setOnce(false);
    }
    armSession();
  }

  function clearPoints() {
    pointARef.current = null;
    pointBRef.current = null;
    setPointA(null);
    setPointB(null);
    loopEnabledRef.current = false;
    pauseRepeatRef.current = false;
    setLoopEnabled(false);
    setPauseRepeatEnabled(false);
    setOnce(false);
    armSession();
  }

  function enableLoop(next) {
    if (next && !isValidSegment(pointARef.current, pointBRef.current)) return;
    loopEnabledRef.current = next;
    setLoopEnabled(next);
    if (next) {
      pauseRepeatRef.current = false;
      setPauseRepeatEnabled(false);
      setOnce(false);
    } else if (savedTargetRef.current != null) {
      const previous = savedTargetRef.current;
      savedTargetRef.current = null;
      loopTargetRef.current = previous;
      setLoopTargetState(previous);
    }
    armSession({ seekIfOutside: next });
  }

  function enablePauseRepeat(next) {
    if (next && !isValidSegment(pointARef.current, pointBRef.current)) return;
    pauseRepeatRef.current = next;
    setPauseRepeatEnabled(next);
    if (next) {
      loopEnabledRef.current = false;
      setLoopEnabled(false);
      setOnce(false);
      if (savedTargetRef.current != null) {
        const previous = savedTargetRef.current;
        savedTargetRef.current = null;
        loopTargetRef.current = previous;
        setLoopTargetState(previous);
      }
    }
    armSession({ seekIfOutside: next });
  }

  function playSegment(start, end) {
    const current = playerRef.current;
    if (!current.ready) return;
    const a = roundTime(start);
    const b = roundTime(end);
    if (!isValidSegment(a, b)) return;

    pointARef.current = a;
    pointBRef.current = b;
    setPointA(a);
    setPointB(b);

    const keepMode = loopEnabledRef.current || pauseRepeatRef.current;
    setOnce(!keepMode);
    resetCount();
    cancelWait();
    gateRef.current = true;
    setPhaseBoth('listening');
    current.seekTo(a);
    holdPlayback();
  }

  function playSentence(start, end, { loop = false } = {}) {
    const current = playerRef.current;
    if (!current.ready) return;
    const a = roundTime(start);
    const b = roundTime(end);
    if (!isValidSegment(a, b)) return;

    pointARef.current = a;
    pointBRef.current = b;
    setPointA(a);
    setPointB(b);
    pauseRepeatRef.current = false;
    setPauseRepeatEnabled(false);

    if (loop) {
      if (savedTargetRef.current == null) savedTargetRef.current = loopTargetRef.current;
      loopTargetRef.current = Infinity;
      setLoopTargetState(Infinity);
      loopEnabledRef.current = true;
      setLoopEnabled(true);
      setOnce(false);
    } else {
      loopEnabledRef.current = false;
      setLoopEnabled(false);
      if (savedTargetRef.current != null) {
        const previous = savedTargetRef.current;
        savedTargetRef.current = null;
        loopTargetRef.current = previous;
        setLoopTargetState(previous);
      }
      setOnce(true);
    }

    resetCount();
    cancelWait();
    gateRef.current = true;
    setPhaseBoth('listening');
    current.seekTo(a);
    holdPlayback();
  }

  function setLoopTarget(value) {
    loopTargetRef.current = value;
    setLoopTargetState(value);
    resetCount();
    if (phaseRef.current === 'complete') {
      const active = loopEnabledRef.current || pauseRepeatRef.current;
      setPhaseBoth(active ? 'listening' : 'idle');
    }
  }

  function setWaitSeconds(value) {
    const next = Math.min(5, Math.max(1, Number(value) || DEFAULT_WAIT_SECONDS));
    waitSecondsRef.current = next;
    setWaitSecondsState(next);
  }

  function replayFromA() {
    resetCount();
    cancelWait();
    gateRef.current = true;
    setPhaseBoth('listening');
    const start = pointARef.current;
    if (start != null) playerRef.current.seekTo(start);
    holdPlayback();
  }

  function skipWaitAndPlay() {
    cancelWait();
    gateRef.current = true;
    setPhaseBoth('listening');
    const start = pointARef.current;
    if (start != null) playerRef.current.seekTo(start);
    holdPlayback();
  }

  function togglePlay() {
    const current = playerRef.current;
    if (!current.ready) return;

    const state = current.getState();
    const playing = state === 1 || state === 3;

    if (phaseRef.current === 'waiting') {
      skipWaitAndPlay();
      return;
    }

    if (playing) {
      stopPlaybackHold();
      current.pause();
      return;
    }

    if (phaseRef.current === 'complete') {
      replayFromA();
      return;
    }

    const mode = pauseRepeatRef.current
      ? 'pause'
      : loopEnabledRef.current
        ? 'loop'
        : onceRef.current
          ? 'once'
          : null;
    const time = current.getTime();
    if (shouldRestartFromA({
      time,
      pointA: pointARef.current,
      pointB: pointBRef.current,
      mode,
    })) {
      gateRef.current = true;
      current.seekTo(pointARef.current);
    }

    if (mode) setPhaseBoth('listening');
    holdPlayback();
  }

  function seekBy(delta) {
    if (phaseRef.current === 'waiting') {
      cancelWait();
      setPhaseBoth('listening');
    }
    playerRef.current.seekBy(delta);
  }

  useEffect(() => {
    stopPlaybackHold();
    pointARef.current = null;
    pointBRef.current = null;
    loopEnabledRef.current = false;
    pauseRepeatRef.current = false;
    setPointA(null);
    setPointB(null);
    setLoopEnabled(false);
    setPauseRepeatEnabled(false);
    setOnce(false);
    savedTargetRef.current = null;
    loopsRef.current = 0;
    setLoopsCompleted(0);
    gateRef.current = false;
    waitTokenRef.current += 1;
    pausedAtRef.current = null;
    setWaitRemaining(0);
    setPhaseBoth('idle');
  }, [videoId, revision]);

  useEffect(() => {
    if (phase !== 'waiting') return undefined;

    const token = waitTokenRef.current;
    const seconds = waitSecondsRef.current;
    const started = performance.now();
    setWaitRemaining(seconds);

    const intervalId = window.setInterval(() => {
      const left = Math.max(0, seconds - (performance.now() - started) / 1000);
      setWaitRemaining(left);
    }, 100);

    const timeoutId = window.setTimeout(() => {
      if (waitTokenRef.current !== token) return;
      gateRef.current = true;
      pausedAtRef.current = null;
      setWaitRemaining(0);
      setPhaseBoth('listening');
      const start = pointARef.current;
      if (start != null) playerRef.current.seekTo(start);
      holdPlayback();
    }, Math.round(seconds * 1000));

    return () => {
      window.clearInterval(intervalId);
      window.clearTimeout(timeoutId);
    };
  }, [phase, waitSeconds]);

  useEffect(() => {
    if (!player.ready) return undefined;

    const tick = () => {
      const current = playerRef.current;
      let time = 0;
      let state = -1;
      try {
        time = current.getTime();
        state = current.getState();
      } catch {
        return;
      }

      if (phaseRef.current === 'waiting') {
        const pausedAt = pausedAtRef.current;
        if (pausedAt != null && Math.abs(time - pausedAt) > 0.75) {
          cancelWait();
          setPhaseBoth('listening');
        }
        return;
      }

      const mode = pauseRepeatRef.current
        ? 'pause'
        : loopEnabledRef.current
          ? 'loop'
          : onceRef.current
            ? 'once'
            : null;
      const decision = evaluateSegmentEnd({
        time,
        pointA: pointARef.current,
        pointB: pointBRef.current,
        mode,
        loopTarget: loopTargetRef.current,
        loopsCompleted: loopsRef.current,
        gate: gateRef.current,
        phase: phaseRef.current,
        playing: state === 1,
      });

      gateRef.current = decision.gate;
      if (decision.type === 'none') return;

      loopsRef.current = decision.loopsCompleted;
      setLoopsCompleted(decision.loopsCompleted);

      if (decision.type === 'seek-start') {
        current.seekTo(decision.seekTo);
        holdPlayback();
        return;
      }

      if (decision.type === 'pause-wait') {
        stopPlaybackHold();
        current.pause();
        pausedAtRef.current = current.getTime();
        waitTokenRef.current += 1;
        setPhaseBoth('waiting');
        return;
      }

      if (decision.type === 'finish') {
        stopPlaybackHold();
        current.pause();
        if (decision.seekTo != null) current.seekTo(decision.seekTo);
        pausedAtRef.current = null;
        setPhaseBoth('complete');
      }
    };

    const intervalId = window.setInterval(tick, 80);
    return () => window.clearInterval(intervalId);
  }, [player.ready]);

  const mode = pauseRepeatEnabled ? 'pause' : loopEnabled ? 'loop' : onceActive ? 'once' : null;

  return {
    pointA,
    pointB,
    setPointA: () => capturePoint('a'),
    setPointB: () => capturePoint('b'),
    clearPoints,
    loopEnabled,
    setLoopEnabled: enableLoop,
    loopTarget,
    setLoopTarget,
    loopsCompleted,
    pauseRepeatEnabled,
    setPauseRepeatEnabled: enablePauseRepeat,
    waitSeconds,
    setWaitSeconds,
    phase,
    waitRemaining,
    mode,
    segmentValid: isValidSegment(pointA, pointB),
    segmentHint: segmentHint(pointA, pointB),
    segmentProgress: segmentProgress(player.currentTime, pointA, pointB),
    togglePlay,
    seekBy,
    replay: replayFromA,
    playSegment,
    playSentence,
  };
}
