export default function VideoStage({ player, hasVideo }) {
  return (
    <section className="card stage-card" aria-label="影片">
      {hasVideo ? (
        <div className="video-shell">
          <div
            className="video-frame"
            ref={player.hostRef}
            data-ready={player.ready ? 'true' : 'false'}
          />
          {!player.ready && !player.error && (
            <div className="video-overlay">正在準備播放器…</div>
          )}
          {player.error && (
            <div className="video-overlay is-error" role="alert">{player.error}</div>
          )}
        </div>
      ) : (
        <div className="video-frame video-empty">
          <span className="empty-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M9 7.2v9.6L17.2 12 9 7.2z" fill="currentColor" />
            </svg>
          </span>
          <p>貼上一部 YouTube 影片，開始跟讀。</p>
        </div>
      )}
      {player.title ? <p className="video-title">{player.title}</p> : null}
    </section>
  );
}
