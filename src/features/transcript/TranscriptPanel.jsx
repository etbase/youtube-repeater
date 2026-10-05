import { useEffect, useRef, useState } from 'react';
import { formatClock } from '../../lib/formatTime.js';
import { parseSubtitleFile } from './parseSubtitles.js';
import { prepareCues, sliceCues } from './subtitleText.js';

function scrollActiveSentence(container, child) {
  const viewHeight = container.clientHeight;
  if (viewHeight <= 0) return;
  const childTop = child.offsetTop;
  const childHeight = child.offsetHeight;
  const viewTop = container.scrollTop;
  const fullyVisible = childTop >= viewTop && childTop + childHeight <= viewTop + viewHeight;
  const centerDelta = (childTop + childHeight / 2) - (viewTop + viewHeight / 2);
  if (fullyVisible && Math.abs(centerDelta) < viewHeight * 0.22) return;

  const nextTop = Math.max(0, childTop - (viewHeight - childHeight) / 2);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  container.scrollTo({
    top: nextTop,
    behavior: reduceMotion ? 'auto' : 'smooth',
  });
}

export default function TranscriptPanel({
  sentences,
  activeId,
  status,
  manualOpen,
  onManualOpenChange,
  onPlay,
  onImport,
}) {
  const listRef = useRef(null);
  const [draft, setDraft] = useState('');
  const [fileText, setFileText] = useState('');
  const [fileName, setFileName] = useState('');
  const [startAt, setStartAt] = useState('0');
  const [lengthSeconds, setLengthSeconds] = useState('');
  const [splitMode, setSplitMode] = useState('smart');
  const [importError, setImportError] = useState('');

  useEffect(() => {
    const container = listRef.current;
    if (!activeId || !container) return undefined;

    let cancelled = false;
    const scroll = () => {
      if (cancelled || container.clientHeight <= 0) return false;
      const node = container.querySelector(`[data-sentence-id="${CSS.escape(activeId)}"]`);
      if (!node) return false;
      scrollActiveSentence(container, node);
      return true;
    };

    if (scroll()) return undefined;
    const observer = new ResizeObserver(() => {
      if (scroll()) observer.disconnect();
    });
    observer.observe(container);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [activeId]);

  function publish(cues) {
    if (cues.length === 0) throw new Error('這個範圍裡沒有字幕。');
    onImport(cues.map((cue, index) => ({
      id: `cue-${index}-${cue.start}`,
      start: cue.start,
      end: cue.end,
      text: cue.text,
      kind: cue.kind || 'speech',
    })));
    setImportError('');
  }

  function importText(raw) {
    try {
      const parsed = parseSubtitleFile(raw);
      const cues = prepareCues(sliceCues(parsed, startAt, lengthSeconds), splitMode);
      publish(cues);
      setDraft('');
    } catch (error) {
      setImportError(error.message || '無法讀取這份字幕。');
    }
  }

  return (
    <aside className="transcript-card" aria-label="即時字幕" aria-busy={status === 'loading'}>
      <header className="transcript-head">
        <div>
          <h2>即時字幕</h2>
          <p>跟著影片自動捲動・點任一句，只播放該句。</p>
        </div>
        {status === 'ready' ? <span className="sentence-count">{sentences.length} 句</span> : null}
      </header>

      {status === 'loading' ? (
        <div className="transcript-status is-loading" role="status">
          <span className="spinner" aria-hidden="true" />
          <p>正在載入字幕…</p>
        </div>
      ) : null}

      {status === 'error' ? (
        <div className="transcript-status is-error" role="status">
          <p>無法自動取得這部影片的字幕</p>
          <button type="button" className="chip-btn is-save" onClick={() => onManualOpenChange(true)}>
            手動匯入 SRT / VTT
          </button>
        </div>
      ) : null}

      {status === 'idle' ? (
        <p className="transcript-hint">載入影片後會嘗試取得字幕。</p>
      ) : null}

      <details
        className="manual-import"
        open={manualOpen}
        onToggle={(event) => onManualOpenChange(event.currentTarget.open)}
      >
        <summary>手動匯入 SRT / VTT</summary>
        <div className="import-grid">
          <label>
            選擇字幕檔
            <input
              type="file"
              accept=".srt,.vtt,.json,text/vtt,application/x-subrip"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                setFileName(file.name);
                setFileText(await file.text());
                setImportError('');
              }}
            />
            {fileName ? <span className="file-name">{fileName}</span> : null}
          </label>
          <label>
            開始時間（秒）
            <input
              type="number"
              min="0"
              step="0.1"
              value={startAt}
              onChange={(event) => setStartAt(event.target.value)}
            />
          </label>
          <label>
            載入長度（秒，空白＝全部）
            <input
              type="number"
              min="0"
              step="1"
              value={lengthSeconds}
              onChange={(event) => setLengthSeconds(event.target.value)}
            />
          </label>
          <fieldset>
            <legend>字幕切割方式</legend>
            <label>
              <input
                type="radio"
                name="split-mode"
                checked={splitMode === 'smart'}
                onChange={() => setSplitMode('smart')}
              />
              智慧完整句
            </label>
            <label>
              <input
                type="radio"
                name="split-mode"
                checked={splitMode === 'raw'}
                onChange={() => setSplitMode('raw')}
              />
              保持原句
            </label>
          </fieldset>
          <button
            type="button"
            className="chip-btn is-save"
            data-action="import-file"
            disabled={!fileText && !draft.trim()}
            onClick={() => importText(fileText || draft)}
          >
            匯入字幕
          </button>
          <label className="json-import">
            或貼上 JSON
            <textarea
              className="transcript-paste"
              value={draft}
              rows={4}
              spellCheck="false"
              placeholder={'[\n  { "start": 57, "end": 60, "text": "..." }\n]'}
              onChange={(event) => {
                setDraft(event.target.value);
                if (importError) setImportError('');
              }}
            />
          </label>
          {importError ? <p className="form-error" role="alert">{importError}</p> : null}
        </div>
      </details>

      <div className="sentence-list" ref={listRef}>
        {sentences.map((sentence) => (
          <article
            key={sentence.id}
            className={sentence.id === activeId ? 'sentence-card is-active' : 'sentence-card'}
            data-sentence-id={sentence.id}
            data-type={sentence.kind === 'sound' ? 'sound' : 'speech'}
            role="button"
            tabIndex={0}
            onClick={() => onPlay(sentence)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onPlay(sentence);
              }
            }}
          >
            <p className="sentence-time">{formatClock(sentence.start)}–{formatClock(sentence.end)}</p>
            <p className="sentence-body">{sentence.text}</p>
          </article>
        ))}
      </div>
    </aside>
  );
}
