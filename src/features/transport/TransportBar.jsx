import { formatClock } from '../../lib/formatTime.js';
import { IconPause, IconPlay } from '../../components/Icons.jsx';
import SpeedControl from './SpeedControl.jsx';

function playLabel(isPlaying, phase) {
  if (isPlaying) return '暫停';
  if (phase === 'waiting') return '結束等待';
  if (phase === 'complete') return '再練一次';
  return '播放';
}

export default function TransportBar({ player, practice }) {
  const label = playLabel(player.isPlaying, practice.phase);
  const PlayIcon = player.isPlaying ? IconPause : IconPlay;
  const canMark = player.ready;

  return (
    <div className="transport">
      <div className="control-row">
        <button
          type="button"
          className="chip-btn"
          data-action="seek-back"
          aria-label="後退 5 秒"
          onClick={() => practice.seekBy(-5)}
          disabled={!player.ready}
        >
          <span aria-hidden="true">◀ 5s</span>
        </button>
        <button
          type="button"
          className="chip-btn is-play"
          data-action="play"
          aria-pressed={player.isPlaying}
          onClick={practice.togglePlay}
          disabled={!player.ready}
        >
          <PlayIcon />
          <span>{label}</span>
        </button>
        <button
          type="button"
          className="chip-btn"
          data-action="seek-forward"
          aria-label="前進 5 秒"
          onClick={() => practice.seekBy(5)}
          disabled={!player.ready}
        >
          <span aria-hidden="true">5s ▶</span>
        </button>
        <button
          type="button"
          className="chip-btn"
          data-action="set-a"
          onClick={practice.setPointA}
          disabled={!canMark}
        >
          A 起點
        </button>
        <button
          type="button"
          className="chip-btn"
          data-action="set-b"
          onClick={practice.setPointB}
          disabled={!canMark}
        >
          B 終點
        </button>
        <button
          type="button"
          className="chip-btn"
          data-action="toggle-loop"
          aria-pressed={practice.loopEnabled}
          disabled={!practice.segmentValid && !practice.loopEnabled}
          onClick={() => practice.setLoopEnabled(!practice.loopEnabled)}
        >
          AB 循環
        </button>
        <p className="time-readout">
          <span className="time-now">{formatClock(player.currentTime)}</span>
          <span className="time-sep"> / </span>
          <span className="time-dur">{formatClock(player.duration)}</span>
        </p>
      </div>

      <SpeedControl
        value={player.playbackRate}
        actualRate={player.actualRate}
        onChange={player.setPlaybackRate}
      />
    </div>
  );
}
