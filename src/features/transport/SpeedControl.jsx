import { formatRate } from '../../lib/formatTime.js';
import { PLAYBACK_RATES } from '../practice/options.js';

export default function SpeedControl({ value, actualRate, onChange }) {
  return (
    <div className="speed-block">
      <p className="control-label" id="speed-label">播放速度</p>
      <div
        className="segmented"
        role="radiogroup"
        aria-labelledby="speed-label"
        data-selected-rate={value}
        data-actual-rate={actualRate}
      >
        {PLAYBACK_RATES.map((rate) => (
          <button
            key={rate}
            type="button"
            role="radio"
            className="segment"
            aria-checked={value === rate}
            data-rate={rate}
            onClick={() => onChange(rate)}
          >
            {formatRate(rate)}
          </button>
        ))}
      </div>
    </div>
  );
}
