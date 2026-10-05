import { formatClock } from '../../lib/formatTime.js';
import { IconPause, IconPlay, IconRepeat } from '../../components/Icons.jsx';

export default function CurrentSentence({
  sentence,
  index,
  total,
  looping,
  playing,
  canPlay,
  onPlay,
  onToggleLoop,
}) {
  return (
    <section className="current-card" aria-label="目前句子">
      <div className="current-copy">
        <p className="control-label">
          目前句子{index ? ` ${index}` : ''}{total ? ` / ${total}` : ''}
        </p>
        <p className={sentence?.kind === 'sound' ? 'current-text is-sound' : 'current-text'} data-type={sentence?.kind === 'sound' ? 'sound' : 'speech'}>
          {sentence ? sentence.text : '點右側一句字幕，或先載入影片。'}
        </p>
        {sentence ? (
          <p className="sentence-time">{formatClock(sentence.start)}–{formatClock(sentence.end)}</p>
        ) : null}
      </div>
      <div className="current-actions">
        <button
          type="button"
          className="chip-btn is-play"
          aria-pressed={playing}
          onClick={onPlay}
          disabled={!sentence || !canPlay}
        >
          {playing ? <IconPause /> : <IconPlay />}
          <span>{playing ? '暫停播放' : '原音播放'}</span>
        </button>
        <button
          type="button"
          className="chip-btn"
          aria-pressed={looping}
          onClick={onToggleLoop}
          disabled={!sentence || !canPlay}
        >
          <IconRepeat />
          <span>單句循環</span>
        </button>
      </div>
    </section>
  );
}
