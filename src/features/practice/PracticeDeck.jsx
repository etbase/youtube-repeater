import { LOOP_TARGETS, WAIT_CHOICES } from './options.js';

function targetLabel(target) {
  return target === Infinity ? '∞' : String(target);
}

export default function PracticeDeck({ practice, ready }) {
  const canPause = ready && practice.segmentValid;
  const countLabel = practice.loopTarget === Infinity
    ? '次'
    : `/ ${practice.loopTarget}`;

  return (
    <div className="practice-deck">
      <div className="deck-row">
        <p className="control-label" id="loop-count-label">循環次數</p>
        <div className="segmented is-compact" role="radiogroup" aria-labelledby="loop-count-label">
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
        <p className="count-readout" aria-live="polite" data-loops={practice.loopsCompleted}>
          已循環 <strong>{practice.loopsCompleted}</strong> {countLabel}
        </p>
      </div>

      <div className="deck-row">
        <button
          type="button"
          className="chip-btn"
          data-action="toggle-pause-repeat"
          aria-pressed={practice.pauseRepeatEnabled}
          disabled={!canPause && !practice.pauseRepeatEnabled}
          onClick={() => practice.setPauseRepeatEnabled(!practice.pauseRepeatEnabled)}
        >
          一句一停
        </button>
        <div className="segmented is-compact" role="radiogroup" aria-label="等待秒數">
          {WAIT_CHOICES.map((seconds) => (
            <button
              key={seconds}
              type="button"
              role="radio"
              className="segment"
              aria-checked={practice.waitSeconds === seconds}
              data-action={`wait-${seconds}`}
              onClick={() => practice.setWaitSeconds(seconds)}
            >
              {seconds} 秒
            </button>
          ))}
        </div>
        <button
          type="button"
          className="chip-btn is-quiet"
          data-action="clear-points"
          onClick={practice.clearPoints}
          disabled={practice.pointA == null && practice.pointB == null}
        >
          清除
        </button>
      </div>

      {practice.segmentHint && (practice.pointA != null || practice.pointB != null) ? (
        <p className="note">{practice.segmentHint}</p>
      ) : null}
    </div>
  );
}
