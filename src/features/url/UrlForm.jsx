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
    <form className="url-form" onSubmit={submit}>
      <input
        id="youtube-url"
        name="youtube-url"
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          if (error) setError('');
        }}
        placeholder="貼上 YouTube 網址，例如 https://youtu.be/... 或 Shorts 網址"
        inputMode="url"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck="false"
        autoComplete="off"
        aria-label="YouTube 網址"
      />
      <button className="load-btn" type="submit">載入影片</button>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
    </form>
  );
}
