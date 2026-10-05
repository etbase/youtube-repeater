import { formatTime } from '../../lib/formatTime.js';
import { IconBack, IconForward, IconPause, IconPlay } from '../../components/Icons.jsx';
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

  return (
    <section className="card transport" aria-label="播放控制">
      <div className="time-row">
        <p className="time-readout">
          <span className="time-now">{formatTime(player.currentTime)}</span>
          <span className="time-sep">/</span>
          <span className="time-dur">{formatTime(player.duration)}</span>
        </p>
      </div>

      <div className="transport-buttons">
        <button
          type="button"
          className="btn btn-secondary"
          data-action="seek-back"
          onClick={() => practice.seekBy(-5)}
          disabled={!player.ready}
        >
          <IconBack />
          <span>後退 5 秒</span>
        </button>
        <button
          type="button"
          className="btn btn-primary play-btn"
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
          className="btn btn-secondary"
          data-action="seek-forward"
          onClick={() => practice.seekBy(5)}
          disabled={!player.ready}
        >
          <IconForward />
          <span>前進 5 秒</span>
        </button>
      </div>

      <SpeedControl
        value={player.playbackRate}
        actualRate={player.actualRate}
        onChange={player.setPlaybackRate}
      />
    </section>
  );
}
