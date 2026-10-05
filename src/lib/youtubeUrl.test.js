import assert from 'node:assert/strict';
import test from 'node:test';
import { parseYouTubeUrl } from './youtubeUrl.js';

const ID = 'dQw4w9WgXcQ';

test('parses common YouTube URL shapes', () => {
  const cases = [
    [`https://www.youtube.com/watch?v=${ID}`, 0],
    [`https://youtu.be/${ID}`, 0],
    [`https://www.youtube.com/embed/${ID}?si=abc`, 0],
    [`https://www.youtube.com/shorts/${ID}`, 0],
    [`https://www.youtube.com/live/${ID}`, 0],
    [`https://m.youtube.com/watch?v=${ID}`, 0],
    [`https://music.youtube.com/watch?v=${ID}`, 0],
    [`https://www.youtube-nocookie.com/embed/${ID}`, 0],
    [`https://www.youtube.com/watch?app=desktop&v=${ID}&list=PL123`, 0],
    [`https://www.youtube.com/v/${ID}`, 0],
    [ID, 0],
    [`  https://youtu.be/${ID}  `, 0],
    [`youtube.com/watch?v=${ID}`, 0],
    [`https://www.youtube.com/watch?v=${ID}&t=90s`, 90],
    [`https://youtu.be/${ID}?t=1m30s`, 90],
    [`https://www.youtube.com/watch?v=${ID}&t=1h2m3s`, 3723],
    [`https://www.youtube.com/watch?v=${ID}&start=15`, 15],
  ];

  for (const [input, startSeconds] of cases) {
    assert.deepEqual(parseYouTubeUrl(input), { videoId: ID, startSeconds });
  }
});

test('rejects inputs that are not a video', () => {
  for (const input of ['', '   ', 'not a url', 'https://vimeo.com/123456789', 'https://www.youtube.com/watch?v=short', 'https://www.youtube.com/playlist?list=PL123']) {
    assert.equal(parseYouTubeUrl(input), null);
  }
});
