export default function PracticeStatus({ practice }) {
  if (practice.phase === 'idle') return null;
  if (practice.phase === 'listening' && !practice.mode) return null;

  if (practice.phase === 'complete') {
    return (
      <div className="status-banner" role="status">
        <div>
          <p className="status-kicker">完成</p>
          <p className="status-title">這一段練完了</p>
        </div>
        <button type="button" className="btn btn-light" data-action="replay" onClick={practice.replay}>
          再練一次
        </button>
      </div>
    );
  }

  const looping = practice.mode === 'loop';

  return (
    <div className="status-banner" role="status" data-phase={practice.phase}>
      <div>
        <p className="status-kicker">{looping ? '循環' : '聆聽'}</p>
        <p className="status-title">{looping ? '循環播放中' : '正在播放這一句'}</p>
      </div>
    </div>
  );
}
