import { useEffect, useState } from 'react';
import UrlForm from './features/url/UrlForm.jsx';
import VideoStage from './features/player/VideoStage.jsx';
import { useYouTubePlayer } from './features/player/useYouTubePlayer.js';
import TransportBar from './features/transport/TransportBar.jsx';
import PracticeDeck from './features/practice/PracticeDeck.jsx';
import PracticeStatus from './features/practice/PracticeStatus.jsx';
import CurrentSentence from './features/practice/CurrentSentence.jsx';
import TranscriptPanel from './features/transcript/TranscriptPanel.jsx';
import { getTranscript } from './features/transcript/subtitleService.js';
import { prepareCues } from './features/transcript/subtitleText.js';
import { usePracticeSession } from './features/practice/usePracticeSession.js';
import RecordingPanel from './features/recording/RecordingPanel.jsx';
import { useSentenceRecorder } from './features/recording/useSentenceRecorder.js';

function assignCueIds(cues) {
  return cues.map((cue, index) => ({
    id: `cue-${index}-${cue.start}`,
    start: cue.start,
    end: cue.end,
    text: cue.text,
    kind: cue.kind || 'speech',
  }));
}

export default function App() {
  const [session, setSession] = useState(null);
  const [sentences, setSentences] = useState([]);
  const [transcriptStatus, setTranscriptStatus] = useState('idle');
  const [manualOpen, setManualOpen] = useState(false);
  const [pinnedId, setPinnedId] = useState(null);
  const player = useYouTubePlayer(session);
  const practice = usePracticeSession(
    player,
    session?.videoId ?? null,
    session?.revision ?? 0,
  );

  const timedSentence = sentences.find((sentence) => (
    player.currentTime >= sentence.start && player.currentTime < sentence.end
  ));
  const currentSentence = timedSentence
    || sentences.find((sentence) => sentence.id === pinnedId)
    || null;
  const activeId = timedSentence?.id || pinnedId;
  const recorder = useSentenceRecorder(currentSentence?.id ?? null);
  const sentenceIndex = currentSentence
    ? sentences.findIndex((sentence) => sentence.id === currentSentence.id) + 1
    : 0;
  const sentenceLoopOn = Boolean(
    currentSentence
    && practice.loopEnabled
    && Math.abs((practice.pointA ?? 0) - currentSentence.start) < 0.05
    && Math.abs((practice.pointB ?? 0) - currentSentence.end) < 0.05,
  );

  useEffect(() => {
    const videoId = session?.videoId;
    if (!videoId) return undefined;

    let cancelled = false;
    setSentences([]);
    setPinnedId(null);
    setTranscriptStatus('loading');
    setManualOpen(false);

    getTranscript(videoId)
      .then((cues) => {
        if (cancelled) return;
        setSentences(assignCueIds(prepareCues(cues, 'smart')));
        setTranscriptStatus('ready');
      })
      .catch(() => {
        if (cancelled) return;
        setTranscriptStatus('error');
        setManualOpen(true);
      });

    return () => {
      cancelled = true;
    };
  }, [session?.videoId, session?.revision]);

  function chooseSentence(sentence, { loop = false } = {}) {
    setPinnedId(sentence.id);
    practice.playSentence(sentence.start, sentence.end, { loop });
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M9 7.2v9.6L17.2 12 9 7.2z" fill="currentColor" />
              </svg>
            </span>
            <div className="brand-copy">
              <h1>YouTube 語言復讀學習機</h1>
              <p className="brand-meta">跟讀練習 · A–B 復讀 · 一句一停 · 不下載影片</p>
            </div>
          </div>
          <UrlForm onLoad={setSession} />
        </div>
      </header>

      <main
        className="workspace"
        data-phase={practice.phase}
        data-loops={practice.loopsCompleted}
        data-mode={practice.mode ?? 'off'}
      >
        <section className="stage-card" aria-label="播放器">
          <VideoStage player={player} hasVideo={Boolean(session?.videoId)} />
          <TransportBar player={player} practice={practice} />
          <PracticeStatus practice={practice} />
          <PracticeDeck practice={practice} ready={player.ready} />
        </section>

        <TranscriptPanel
          sentences={sentences}
          activeId={activeId}
          status={transcriptStatus}
          manualOpen={manualOpen}
          onManualOpenChange={setManualOpen}
          onPlay={(sentence) => chooseSentence(sentence, { loop: sentenceLoopOn })}
          onImport={(cues) => {
            setSentences(cues);
            setPinnedId(cues[0]?.id ?? null);
            setTranscriptStatus('ready');
          }}
        />

        <CurrentSentence
          sentence={currentSentence}
          index={sentenceIndex}
          total={sentences.length}
          looping={sentenceLoopOn}
          canPlay={player.ready}
          onPlay={() => currentSentence && chooseSentence(currentSentence, { loop: false })}
          onToggleLoop={() => {
            if (!currentSentence) return;
            chooseSentence(currentSentence, { loop: !sentenceLoopOn });
          }}
        />

        <RecordingPanel
          sentence={currentSentence}
          currentTime={player.currentTime}
          recorder={recorder}
        />
      </main>
    </div>
  );
}
