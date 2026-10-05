import { useEffect, useRef, useState } from 'react';
import {
  evaluateSegmentEnd,
  isValidSegment,
  segmentHint,
  segmentProgress,
  shouldRestartFromA,
} from './segmentLoop.js';

function roundTime(seconds) {
  return Math.round(seconds * 100) / 100;
}

/**
 * Coordinates A–B looping on top of the player clock.
 * Later features (subtitles, recording, waveform, pitch) can observe
 * currentTime, the A–B segment, and `phase` without touching the player.
 */
export function usePracticeSession(player, videoId, revision = 0) {
  const playerRef = useRef(player);
  playerRef.current = player;

  const [pointA, setPointA] = useState(null);
  const [pointB, setPointB] = useState(null);
  const [loopEnabled, setLoopEnabled] = useState(false);
  const [phase, setPhase] = useState('idle');
  const [onceActive, setOnceActive] = useState(false);

  const pointARef = useRef(null);
  const pointBRef = useRef(null);
  const loopEnabledRef = useRef(false);
  const phaseRef = useRef('idle');
  const gateRef = useRef(false);
  const resumeTokenRef = useRef(0);
  const onceRef = useRef(false);

  pointARef.current = pointA;
  pointBRef.current = pointB;
  loopEnabledRef.current = loopEnabled;

  function setPhaseBoth(next) {
    phaseRef.current = next;
    setPhase(next);
  }

  function setOnce(next) {
    onceRef.current = next;
    setOnceActive(next);
  }

  function resetGate() {
    gateRef.current = false;
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
        if (phaseNow === 'complete' || phaseNow === 'idle') return;
        const state = playerRef.current.getState();
        if (state !== 1 && state !== 3) playerRef.current.play();
        if (remaining > 0) nudge(remaining - 1);
      }, 200);
    };
    playerRef.current.play();
    nudge(6);
  }

  function armSession({ seekIfOutside = false } = {}) {
    resetGate();
    const active = loopEnabledRef.current;
    setPhaseBoth(active ? 'listening' : 'idle');

    if (!seekIfOutside || !active) return;
    const time = playerRef.current.getTime();
    const state = playerRef.current.getState();
    const wasPlaying = state === 1 || state === 3;
    if (shouldRestartFromA({
      time,
      pointA: pointARef.current,
      pointB: pointBRef.current,
      mode: 'loop',
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
      setLoopEnabled(false);
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
    setLoopEnabled(false);
    setOnce(false);
    armSession();
  }

  function enableLoop(next) {
    if (next && !isValidSegment(pointARef.current, pointBRef.current)) return;
    loopEnabledRef.current = next;
    setLoopEnabled(next);
    if (next) setOnce(false);
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

    setOnce(!loopEnabledRef.current);
    resetGate();
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
    loopEnabledRef.current = loop;
    setLoopEnabled(loop);
    setOnce(!loop);

    resetGate();
    gateRef.current = true;
    setPhaseBoth('listening');
    current.seekTo(a);
    holdPlayback();
  }

  function replayFromA() {
    resetGate();
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

    if (playing) {
      stopPlaybackHold();
      current.pause();
      return;
    }

    if (phaseRef.current === 'complete') {
      replayFromA();
      return;
    }

    const mode = loopEnabledRef.current ? 'loop' : onceRef.current ? 'once' : null;
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
    playerRef.current.seekBy(delta);
  }

  useEffect(() => {
    stopPlaybackHold();
    pointARef.current = null;
    pointBRef.current = null;
    loopEnabledRef.current = false;
    setPointA(null);
    setPointB(null);
    setLoopEnabled(false);
    setOnce(false);
    gateRef.current = false;
    setPhaseBoth('idle');
  }, [videoId, revision]);

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

      const mode = loopEnabledRef.current ? 'loop' : onceRef.current ? 'once' : null;
      const decision = evaluateSegmentEnd({
        time,
        pointA: pointARef.current,
        pointB: pointBRef.current,
        mode,
        gate: gateRef.current,
        phase: phaseRef.current,
        playing: state === 1,
      });

      gateRef.current = decision.gate;
      if (decision.type === 'none') return;

      if (decision.type === 'seek-start') {
        current.seekTo(decision.seekTo);
        holdPlayback();
        return;
      }

      if (decision.type === 'finish') {
        stopPlaybackHold();
        current.pause();
        if (decision.seekTo != null) current.seekTo(decision.seekTo);
        setPhaseBoth('complete');
      }
    };

    const intervalId = window.setInterval(tick, 80);
    return () => window.clearInterval(intervalId);
  }, [player.ready]);

  const mode = loopEnabled ? 'loop' : onceActive ? 'once' : null;

  return {
    pointA,
    pointB,
    setPointA: () => capturePoint('a'),
    setPointB: () => capturePoint('b'),
    clearPoints,
    loopEnabled,
    setLoopEnabled: enableLoop,
    phase,
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
