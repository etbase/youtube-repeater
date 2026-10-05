import { RecordingWaveform, SentenceTimeline } from './AudioTracks.jsx';

export default function RecordingPanel({
  sentence,
  currentTime,
  recorder,
}) {
  const hasTake = Boolean(recorder.take);
  const canRecord = Boolean(sentence) && !recorder.recording;

  return (
    <section className="record-card" aria-label="跟讀練習與錄音">
      <h2>跟讀練習與錄音</h2>
      <div className="record-actions">
        <button type="button" className="chip-btn is-play" onClick={recorder.start} disabled={!canRecord}>
          🎤 開始錄音
        </button>
        <button type="button" className="chip-btn" onClick={recorder.stop} disabled={!recorder.recording}>
          ■ 停止錄音
        </button>
        <button type="button" className="chip-btn" onClick={recorder.play} disabled={!hasTake || recorder.recording}>
          ▶ 播放錄音
        </button>
        <button type="button" className="chip-btn" onClick={recorder.rerecord} disabled={!hasTake || recorder.recording}>
          ↻ 重新錄音
        </button>
        <button type="button" className="chip-btn" onClick={recorder.download} disabled={!hasTake || recorder.recording}>
          ↓ MP3 下載
        </button>
      </div>
      {recorder.error ? <p className="form-error" role="alert">{recorder.error}</p> : null}
      <div className="compare-grid">
        <SentenceTimeline sentence={sentence} currentTime={currentTime} />
        <RecordingWaveform peaks={recorder.take?.peaks} duration={recorder.take?.duration} />
      </div>
    </section>
  );
}
