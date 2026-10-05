import { IconPlay, IconRepeat, IconRotateCcw } from '../../components/Icons.jsx';

export default function PracticeStatus({ practice }) {
  if (practice.phase === 'idle') return null;
  if (practice.phase === 'listening' && !practice.mode) return null;

  if (practice.phase === 'complete') {
    return (
      <div className="status-banner" role="status">
        <IconRotateCcw />
        <p className="status-title">
          <span className="status-kicker">完成</span>
          這一段練完了
        </p>
        <button type="button" className="chip-btn" data-action="replay" onClick={practice.replay}>
          再練一次
        </button>
      </div>
    );
  }

  const looping = practice.mode === 'loop';
  const StatusIcon = looping ? IconRepeat : IconPlay;

  return (
    <div className="status-banner" role="status" data-phase={practice.phase}>
      <StatusIcon />
      <p className="status-title">
        <span className="status-kicker">{looping ? '循環' : '聆聽'}</span>
        {looping ? '循環播放中' : '正在播放這一句'}
      </p>
    </div>
  );
}
