import { useEffect, useRef } from 'react';
import { formatClock } from '../../lib/formatTime.js';

function activeSentenceId(sentences, currentTime) {
  if (!Number.isFinite(currentTime)) return null;
  const match = sentences.find((sentence) => (
    currentTime >= sentence.start && currentTime < sentence.end
  ));
  return match?.id ?? null;
}

export default function TranscriptPanel({
  sentences,
  currentTime,
  canSave,
  onSave,
  onPlay,
  onChange,
  onRemove,
}) {
  const activeId = activeSentenceId(sentences, currentTime);
  const listRef = useRef(null);

  useEffect(() => {
    if (!activeId || !listRef.current) return;
    const node = listRef.current.querySelector(`[data-sentence-id="${activeId}"]`);
    node?.scrollIntoView({ block: 'nearest' });
  }, [activeId]);

  return (
    <aside className="transcript-card" aria-label="句子">
      <header className="transcript-head">
        <div>
          <h2>即時字幕</h2>
          <p>點任何一句，只播放該句。設定 A、B 後按「存成一句」。</p>
        </div>
        <span className="sentence-count">{sentences.length} 句</span>
      </header>
      <button
        type="button"
        className="chip-btn is-save save-sentence"
        data-action="save-sentence"
        onClick={onSave}
        disabled={!canSave}
      >
        存成一句
      </button>

      {sentences.length === 0 ? (
        <div className="sentence-list">
          <article className="sentence-card is-sample">
            <p className="sentence-time">00:02–00:05</p>
            <p>先設定 A、B，再按「存成一句」。</p>
          </article>
          <article className="sentence-card is-sample">
            <p className="sentence-time">00:06–00:09</p>
            <p>點一句的時間，就只播放那一段。</p>
          </article>
          <article className="sentence-card is-sample">
            <p className="sentence-time">00:10–00:13</p>
            <p>開啟一句一停後，播完會暫停再重播。</p>
          </article>
        </div>
      ) : (
        <div className="sentence-list" ref={listRef}>
          {sentences.map((sentence) => (
            <article
              key={sentence.id}
              className={sentence.id === activeId ? 'sentence-card is-active' : 'sentence-card'}
              data-sentence-id={sentence.id}
            >
              <div className="sentence-top">
                <button
                  type="button"
                  className="sentence-time"
                  data-action="play-sentence"
                  onClick={() => onPlay(sentence)}
                >
                  {formatClock(sentence.start)}–{formatClock(sentence.end)}
                </button>
                <button
                  type="button"
                  className="sentence-remove"
                  aria-label="移除這一句"
                  onClick={() => onRemove(sentence.id)}
                >
                  移除
                </button>
              </div>
              <textarea
                rows={2}
                value={sentence.text}
                placeholder="寫下這一句"
                onChange={(event) => onChange(sentence.id, event.target.value)}
              />
            </article>
          ))}
        </div>
      )}
    </aside>
  );
}
