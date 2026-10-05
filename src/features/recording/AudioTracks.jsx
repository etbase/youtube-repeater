import { useEffect, useRef } from 'react';

export function SentenceTimeline({ sentence, currentTime }) {
  const start = sentence?.start ?? 0;
  const end = sentence?.end ?? start;
  const length = Math.max(0, end - start);
  let progress = 0;
  if (sentence && length > 0) {
    progress = Math.min(1, Math.max(0, (currentTime - start) / length));
  }

  return (
    <div className="track-block">
      <p className="control-label">目前句子播放時間軸</p>
      <div className="sentence-track" aria-hidden="true">
        <span className="sentence-playhead" style={{ left: `${progress * 100}%` }} />
      </div>
      <div className="track-scale">
        <span>0s</span>
        <span>{length ? `${length.toFixed(1)}s` : '0s'}</span>
      </div>
    </div>
  );
}

export function RecordingWaveform({ peaks, duration }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const context = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    context.clearRect(0, 0, width, height);
    context.fillStyle = '#e8eef6';
    context.fillRect(0, 0, width, height);
    if (!peaks?.length) return undefined;
    const gap = 2;
    const barWidth = Math.max(1, (width - gap * (peaks.length - 1)) / peaks.length);
    context.fillStyle = '#2f6bff';
    peaks.forEach((peak, index) => {
      const barHeight = Math.max(2, peak * (height - 8));
      const x = index * (barWidth + gap);
      context.fillRect(x, (height - barHeight) / 2, barWidth, barHeight);
    });
    return undefined;
  }, [peaks]);

  return (
    <div className="track-block">
      <p className="control-label">我的錄音波形</p>
      <canvas ref={canvasRef} className="wave-canvas" width="640" height="72" />
      <div className="track-scale">
        <span>0s</span>
        <span>{duration ? `${duration.toFixed(1)}s` : '尚無錄音'}</span>
      </div>
    </div>
  );
}
