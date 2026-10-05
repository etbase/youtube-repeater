import { useEffect, useState } from 'react';
import UrlForm from './features/url/UrlForm.jsx';
import VideoStage from './features/player/VideoStage.jsx';
import { useYouTubePlayer } from './features/player/useYouTubePlayer.js';
import TransportBar from './features/transport/TransportBar.jsx';
import PracticeDeck from './features/practice/PracticeDeck.jsx';
import PracticeStatus from './features/practice/PracticeStatus.jsx';
import TranscriptPanel from './features/transcript/TranscriptPanel.jsx';
import { usePracticeSession } from './features/practice/usePracticeSession.js';

export default function App() {
  const [session, setSession] = useState(null);
  const [sentences, setSentences] = useState([]);
  const player = useYouTubePlayer(session);
  const practice = usePracticeSession(
    player,
    session?.videoId ?? null,
    session?.revision ?? 0,
  );

  useEffect(() => {
    setSentences([]);
  }, [session?.videoId, session?.revision]);

  function saveSentence() {
    if (!practice.segmentValid) return;
    setSentences((prev) => [
      ...prev,
      {
        id: `${Date.now()}`,
        start: practice.pointA,
        end: practice.pointB,
        text: '',
      },
    ]);
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
          currentTime={player.currentTime}
          canSave={player.ready && practice.segmentValid}
          onSave={saveSentence}
          onPlay={(sentence) => practice.playSegment(sentence.start, sentence.end)}
          onChange={(id, text) => {
            setSentences((prev) => prev.map((item) => (
              item.id === id ? { ...item, text } : item
            )));
          }}
          onRemove={(id) => {
            setSentences((prev) => prev.filter((item) => item.id !== id));
          }}
        />
      </main>
    </div>
  );
}
