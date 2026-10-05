export default function VideoStage({ player, hasVideo }) {
  return (
    <div className="video-shell">
      {hasVideo ? (
        <>
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
        </>
      ) : (
        <div className="video-frame video-empty">
          <p>貼上一部 YouTube 影片，開始跟讀。</p>
        </div>
      )}
    </div>
  );
}
