export const MIN_SEGMENT_SECONDS = 0.4;

export function isValidSegment(pointA, pointB) {
  if (pointA == null || pointB == null) return false;
  return pointB - pointA >= MIN_SEGMENT_SECONDS;
}

export function endEpsilon(pointA, pointB) {
  const length = pointB - pointA;
  return Math.min(0.15, Math.max(0.05, length * 0.08));
}

export function segmentProgress(time, pointA, pointB) {
  if (!isValidSegment(pointA, pointB)) return 0;
  const ratio = (time - pointA) / (pointB - pointA);
  return Math.min(100, Math.max(0, ratio * 100));
}

export function segmentHint(pointA, pointB) {
  if (pointA == null && pointB == null) return '先設定 A 點與 B 點，再開始復讀。';
  if (pointA == null) return '尚未設定 A 點。';
  if (pointB == null) return '尚未設定 B 點。';
  if (pointB <= pointA) return 'B 點需要晚於 A 點。';
  if (pointB - pointA < MIN_SEGMENT_SECONDS) return '區間至少需要 0.4 秒。';
  return '';
}

export function shouldRestartFromA({ time, pointA, pointB, mode }) {
  if (!mode || !isValidSegment(pointA, pointB)) return false;
  const epsilon = endEpsilon(pointA, pointB);
  return time < pointA || time >= pointB - epsilon;
}

/**
 * Decide what to do when playback approaches the end of an A–B segment.
 * `gate` stays closed until playback is observed back before B, so one
 * pass cannot be counted twice while a seek is still settling.
 */
export function evaluateSegmentEnd({
  time,
  pointA,
  pointB,
  mode,
  loopTarget,
  loopsCompleted,
  gate,
  phase,
  playing,
}) {
  if (!mode || !playing || phase === 'waiting' || phase === 'complete') {
    return { type: 'none', gate };
  }

  if (!isValidSegment(pointA, pointB)) {
    return { type: 'none', gate };
  }

  const epsilon = endEpsilon(pointA, pointB);
  if (time < pointB - epsilon) {
    return { type: 'none', gate: false };
  }

  if (gate || (Number.isFinite(loopTarget) && loopsCompleted >= loopTarget)) {
    return { type: 'none', gate: true };
  }

  if (mode === 'once') {
    return {
      type: 'finish',
      gate: true,
      loopsCompleted,
      seekTo: pointB,
    };
  }

  const nextCount = loopsCompleted + 1;
  const finished = Number.isFinite(loopTarget) && nextCount >= loopTarget;
  if (finished) {
    return {
      type: 'finish',
      gate: true,
      loopsCompleted: nextCount,
      seekTo: pointB,
    };
  }

  if (mode === 'pause') {
    return { type: 'pause-wait', gate: true, loopsCompleted: nextCount };
  }

  return {
    type: 'seek-start',
    gate: true,
    loopsCompleted: nextCount,
    seekTo: pointA,
  };
}
