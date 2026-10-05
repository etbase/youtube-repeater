import { formatTime } from '../../lib/formatTime.js';
import { LOOP_TARGETS } from '../practice/options.js';

function targetLabel(target) {
  return target === Infinity ? '∞' : String(target);
}

export default function LoopPanel({ practice, ready }) {
  const canLoop = ready && practice.segmentValid;
  const countLabel = practice.loopTarget === Infinity
    ? '次'
    : `/ ${practice.loopTarget} 次`;

  return (
    <section className="card practice-card" aria-label="A-B 復讀">
      <header className="card-head">
        <h2>A–B 復讀</h2>
        <p className="lede">標記一句的開始與結束。開啟後，播到 B 點會回到 A 點。</p>
      </header>

      <div className="point-readouts">
        <div>
          <span className="point-label is-a">A</span>
          <strong data-point-a={practice.pointA ?? ''}>
            {practice.pointA == null ? '—' : formatTime(practice.pointA)}
          </strong>
        </div>
        <div>
          <span className="point-label is-b">B</span>
          <strong data-point-b={practice.pointB ?? ''}>
            {practice.pointB == null ? '—' : formatTime(practice.pointB)}
          </strong>
        </div>
      </div>

      {practice.segmentValid && (
        <div className="segment-track" aria-hidden="true">
          <span className="segment-fill" style={{ width: `${practice.segmentProgress}%` }} />
        </div>
      )}

      <div className="point-actions">
        <button
          type="button"
          className="btn btn-secondary"
          data-action="set-a"
          onClick={practice.setPointA}
          disabled={!ready}
        >
          設定 A
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          data-action="set-b"
          onClick={practice.setPointB}
          disabled={!ready}
        >
          設定 B
        </button>
        <button
          type="button"
          className="btn btn-quiet clear-btn"
          data-action="clear-points"
          onClick={practice.clearPoints}
          disabled={practice.pointA == null && practice.pointB == null}
        >
          清除
        </button>
      </div>

      {practice.segmentHint ? <p className="note">{practice.segmentHint}</p> : null}

      <button
        type="button"
        className="btn btn-primary mode-toggle"
        data-action="toggle-loop"
        aria-pressed={practice.loopEnabled}
        disabled={!canLoop && !practice.loopEnabled}
        onClick={() => practice.setLoopEnabled(!practice.loopEnabled)}
      >
        {practice.loopEnabled ? 'AB 循環已開啟' : 'AB 循環'}
      </button>

      <div className="choice-block">
        <p className="control-label" id="loop-count-label">循環次數</p>
        <div className="segmented" role="radiogroup" aria-labelledby="loop-count-label">
          {LOOP_TARGETS.map((target) => (
            <button
              key={String(target)}
              type="button"
              role="radio"
              className="segment"
              aria-checked={practice.loopTarget === target}
              data-action={`loop-target-${target === Infinity ? 'inf' : target}`}
              onClick={() => practice.setLoopTarget(target)}
            >
              {targetLabel(target)}
            </button>
          ))}
        </div>
      </div>

      <p className="count-readout" aria-live="polite" data-loops={practice.loopsCompleted}>
        <span>已循環</span>
        <strong>{practice.loopsCompleted}</strong>
        <span>{countLabel}</span>
      </p>
    </section>
  );
}
