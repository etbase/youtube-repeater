import { useState } from 'react';
import UrlForm from './features/url/UrlForm.jsx';
import VideoStage from './features/player/VideoStage.jsx';
import { useYouTubePlayer } from './features/player/useYouTubePlayer.js';
import TransportBar from './features/transport/TransportBar.jsx';
import LoopPanel from './features/looping/LoopPanel.jsx';
import PauseRepeatPanel from './features/pauseRepeat/PauseRepeatPanel.jsx';
import PracticeStatus from './features/practice/PracticeStatus.jsx';
import { usePracticeSession } from './features/practice/usePracticeSession.js';

// Player, transport, looping, and pause-repeat are separate features.
// Subtitles, recording, waveform, pitch, and membership can be added
// beside them without changing the YouTube player core.
export default function App() {
  const [session, setSession] = useState(null);
  const player = useYouTubePlayer(session);
  const practice = usePracticeSession(
    player,
    session?.videoId ?? null,
    session?.revision ?? 0,
  );

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true">
              <svg viewBox="0 0 32 32">
                <path d="M16 7.5a8.5 8.5 0 1 1-7.2 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M7.4 7.2v5h5" fill="none" stroke="#c6a15b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <div className="brand-copy">
              <p className="eyebrow">Shadowing studio</p>
              <h1>YouTube Language Repeater</h1>
            </div>
          </div>
          <p className="brand-note">聽一句，停一下，跟著說。</p>
        </div>
      </header>

      <main
        className="layout"
        data-phase={practice.phase}
        data-loops={practice.loopsCompleted}
        data-mode={practice.mode ?? 'off'}
      >
        <UrlForm onLoad={setSession} />
        <VideoStage player={player} hasVideo={Boolean(session?.videoId)} />
        <PracticeStatus practice={practice} />
        <TransportBar player={player} practice={practice} />
        <div className="practice-grid">
          <LoopPanel practice={practice} ready={player.ready} />
          <PauseRepeatPanel practice={practice} ready={player.ready} />
        </div>
        <footer className="footer">
          <p>影片由 YouTube 播放。這個工具不會下載或儲存影片。</p>
        </footer>
      </main>
    </>
  );
}
