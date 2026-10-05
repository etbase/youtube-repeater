function countdownLabel(waitRemaining) {
  return Math.max(1, Math.ceil(waitRemaining));
}

export default function PracticeStatus({ practice }) {
  if (practice.phase === 'idle') return null;
  if (practice.phase === 'listening' && !practice.mode) return null;

  if (practice.phase === 'waiting') {
    return (
      <div className="status-banner is-wait" role="status">
        <div>
          <p className="status-kicker">跟讀</p>
          <p className="status-title">請跟著說這一句</p>
        </div>
        <p className="wait-num">
          <span aria-live="polite">{countdownLabel(practice.waitRemaining)}</span>
          <small>秒</small>
        </p>
      </div>
    );
  }

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
      <p className="status-meta">
        已循環 {practice.loopsCompleted}
        {practice.loopTarget === Infinity ? ' 次' : ` / ${practice.loopTarget} 次`}
      </p>
    </div>
  );
}
