import { useEffect, useRef } from 'react';
import { IconDownload } from '../../components/Icons.jsx';

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
      <div className="track-head">
        <p className="control-label">目前句子</p>
      </div>
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

export function RecordingWaveform({ peaks, duration, playbackTime = 0, playing = false, onDownload, canDownload = false }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const context = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const styles = getComputedStyle(document.documentElement);
    const surface = styles.getPropertyValue('--surface-soft').trim() || '#f4f5f8';
    const primary = styles.getPropertyValue('--primary').trim() || '#6d7ec4';
    context.clearRect(0, 0, width, height);
    context.fillStyle = surface;
    context.fillRect(0, 0, width, height);
    if (!peaks?.length) return undefined;
    const gap = 2;
    const barWidth = Math.max(1, (width - gap * (peaks.length - 1)) / peaks.length);
    context.fillStyle = primary;
    peaks.forEach((peak, index) => {
      const barHeight = Math.max(2, peak * (height - 8));
      const x = index * (barWidth + gap);
      context.fillRect(x, (height - barHeight) / 2, barWidth, barHeight);
    });
    return undefined;
  }, [peaks]);

  const progress = duration > 0 ? Math.min(1, Math.max(0, playbackTime / duration)) : 0;

  return (
    <div className="track-block">
      <div className="track-head">
        <p className="control-label">我的錄音</p>
        <button type="button" className="chip-btn" onClick={onDownload} disabled={!canDownload}>
          <IconDownload />
          <span>下載我的錄音</span>
        </button>
      </div>
      <div className="wave-frame">
        <canvas ref={canvasRef} className="wave-canvas" width="640" height="72" />
        {playing && duration > 0 ? (
          <span className="sentence-playhead" style={{ left: `${progress * 100}%` }} />
        ) : null}
      </div>
      <div className="track-scale">
        <span>0s</span>
        <span>{duration ? `${duration.toFixed(1)}s` : '尚無錄音'}</span>
      </div>
    </div>
  );
}
