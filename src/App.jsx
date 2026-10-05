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
import { prepareCues, sentenceAtTime } from './features/transcript/subtitleText.js';
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
  const [practiceId, setPracticeId] = useState(null);
  const player = useYouTubePlayer(session);
  const practice = usePracticeSession(
    player,
    session?.videoId ?? null,
    session?.revision ?? 0,
  );

  const activeSentence = sentenceAtTime(sentences, player.currentTime);
  const practiceSentence = sentences.find((sentence) => sentence.id === practiceId) || null;
  const recorder = useSentenceRecorder(practiceSentence?.id ?? null);
  const sentenceIndex = practiceSentence
    ? sentences.findIndex((sentence) => sentence.id === practiceSentence.id) + 1
    : 0;
  const samePracticeRange = Boolean(
    practiceSentence
    && practice.pointA != null
    && practice.pointB != null
    && Math.abs(practice.pointA - practiceSentence.start) < 0.05
    && Math.abs(practice.pointB - practiceSentence.end) < 0.05,
  );
  const sentenceLoopOn = Boolean(samePracticeRange && practice.loopEnabled && practice.mode === 'loop');
  const originalPlaying = Boolean(
    samePracticeRange
    && practice.mode === 'once'
    && practice.phase === 'listening'
    && player.isPlaying,
  );

  useEffect(() => {
    const videoId = session?.videoId;
    if (!videoId) return undefined;

    let cancelled = false;
    setSentences([]);
    setPracticeId(null);
    setTranscriptStatus('loading');
    setManualOpen(false);

    getTranscript(videoId)
      .then((cues) => {
        if (cancelled) return;
        try {
          setSentences(assignCueIds(prepareCues(cues, 'smart')));
          setTranscriptStatus('ready');
        } catch {
          setSentences([]);
          setTranscriptStatus('error');
          setManualOpen(true);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setSentences([]);
        setTranscriptStatus('error');
        setManualOpen(true);
      });

    return () => {
      cancelled = true;
    };
  }, [session?.videoId, session?.revision]);

  function chooseSentence(sentence, { loop = false } = {}) {
    setPracticeId(sentence.id);
    practice.playSentence(sentence.start, sentence.end, { loop });
  }

  function playOriginal() {
    if (!practiceSentence || !player.ready) return;
    const inside = player.currentTime >= practiceSentence.start
      && player.currentTime < practiceSentence.end - 0.05;
    if (originalPlaying) {
      practice.togglePlay();
      return;
    }
    if (samePracticeRange && practice.mode === 'once' && practice.phase === 'listening' && inside) {
      practice.togglePlay();
      return;
    }
    chooseSentence(practiceSentence, { loop: false });
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true">
              <svg viewBox="0 0 36 36">
                <defs>
                  <linearGradient id="brand-fill" x1="6" y1="2" x2="30" y2="34" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#8B9AD4" />
                    <stop offset="1" stopColor="#6D7EC4" />
                  </linearGradient>
                </defs>
                <rect width="36" height="36" rx="12" fill="url(#brand-fill)" />
                <path d="M14.2 11.2v13.6L25.4 18 14.2 11.2z" fill="#fff" />
              </svg>
            </span>
            <div className="brand-copy">
              <h1>YouTube 語言復讀學習機</h1>
              <p className="brand-meta">跟讀練習 · A–B 復讀 · 不下載影片</p>
            </div>
          </div>
          <UrlForm onLoad={setSession} />
        </div>
      </header>

      <main
        className="workspace"
        data-phase={practice.phase}
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
          activeId={activeSentence?.id || null}
          status={transcriptStatus}
          manualOpen={manualOpen}
          onManualOpenChange={setManualOpen}
          onPlay={(sentence) => chooseSentence(sentence, { loop: sentenceLoopOn })}
          onImport={(cues) => {
            setSentences(cues);
            setPracticeId(null);
            setTranscriptStatus('ready');
          }}
        />

        <CurrentSentence
          sentence={practiceSentence}
          index={sentenceIndex}
          total={sentences.length}
          looping={sentenceLoopOn}
          playing={originalPlaying}
          canPlay={player.ready}
          onPlay={playOriginal}
          onToggleLoop={() => {
            if (!practiceSentence) return;
            chooseSentence(practiceSentence, { loop: !sentenceLoopOn });
          }}
        />

        <RecordingPanel
          sentence={practiceSentence}
          recorder={recorder}
        />
      </main>
    </div>
  );
}
