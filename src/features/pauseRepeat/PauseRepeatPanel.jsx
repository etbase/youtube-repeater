import { WAIT_CHOICES } from '../practice/options.js';

export default function PauseRepeatPanel({ practice, ready }) {
  const canStart = ready && practice.segmentValid;

  return (
    <section className="card practice-card" aria-label="一句一停">
      <header className="card-head">
        <h2>一句一停</h2>
        <p className="lede">Listen → Pause → Repeat。用 A–B 區間當一句，播完暫停，跟讀後再重播。</p>
      </header>

      <div className="choice-block">
        <p className="control-label" id="wait-label">等待秒數</p>
        <div className="segmented" role="radiogroup" aria-labelledby="wait-label">
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
      </div>

      <button
        type="button"
        className="btn btn-primary mode-toggle"
        data-action="toggle-pause-repeat"
        aria-pressed={practice.pauseRepeatEnabled}
        disabled={!canStart && !practice.pauseRepeatEnabled}
        onClick={() => practice.setPauseRepeatEnabled(!practice.pauseRepeatEnabled)}
      >
        {practice.pauseRepeatEnabled ? '一句一停已開啟' : '開啟一句一停'}
      </button>

      <ol className="steps">
        <li>Listen 播放 A–B</li>
        <li>Pause 停下來跟讀</li>
        <li>Repeat 再聽同一句</li>
      </ol>
    </section>
  );
}
