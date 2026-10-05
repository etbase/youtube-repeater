import { useState } from 'react';
import { parseYouTubeUrl } from '../../lib/youtubeUrl.js';

export default function UrlForm({ onLoad }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  function submit(event) {
    event.preventDefault();
    const parsed = parseYouTubeUrl(value);
    if (!parsed) {
      setError('無法辨識這個 YouTube 網址，請貼上完整的影片連結。');
      return;
    }
    setError('');
    onLoad({ ...parsed, revision: Date.now() });
  }

  return (
    <form className="card url-card" onSubmit={submit}>
      <label htmlFor="youtube-url">YouTube 網址</label>
      <div className="url-row">
        <input
          id="youtube-url"
          name="youtube-url"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            if (error) setError('');
          }}
          placeholder="https://www.youtube.com/watch?v=..."
          inputMode="url"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck="false"
          autoComplete="off"
        />
        <button className="btn btn-primary" type="submit">載入影片</button>
      </div>
      {error ? (
        <p className="form-error" role="alert">{error}</p>
      ) : (
        <p className="form-hint">支援一般連結、youtu.be、Shorts 與嵌入網址。</p>
      )}
    </form>
  );
}
