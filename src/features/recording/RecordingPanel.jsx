import { IconMic, IconPlay, IconRotateCcw, IconSquare } from '../../components/Icons.jsx';
import { RecordingWaveform } from './AudioTracks.jsx';

export default function RecordingPanel({
  sentence,
  recorder,
}) {
  const hasTake = Boolean(recorder.take);
  const canRecord = Boolean(sentence) && !recorder.recording;

  return (
    <section className="record-card" aria-label="跟讀練習與錄音">
      <h2>跟讀練習與錄音</h2>
      <div className="record-actions">
        <button type="button" className="chip-btn" onClick={recorder.start} disabled={!canRecord}>
          <IconMic />
          <span>開始錄音</span>
        </button>
        <button type="button" className="chip-btn" onClick={recorder.stop} disabled={!recorder.recording}>
          <IconSquare />
          <span>停止錄音</span>
        </button>
        <button type="button" className="chip-btn" onClick={recorder.play} disabled={!hasTake || recorder.recording}>
          <IconPlay />
          <span>播放錄音</span>
        </button>
        <button type="button" className="chip-btn" onClick={recorder.rerecord} disabled={!hasTake || recorder.recording}>
          <IconRotateCcw />
          <span>重新錄音</span>
        </button>
      </div>
      {recorder.error ? <p className="form-error" role="alert">{recorder.error}</p> : null}
      <div className="compare-grid">
        <RecordingWaveform
          peaks={recorder.take?.peaks}
          duration={recorder.take?.duration}
          playbackTime={recorder.playbackTime}
          playing={recorder.playing}
          canDownload={hasTake && !recorder.recording}
          onDownload={recorder.download}
        />
      </div>
    </section>
  );
}
