const VIDEO_ID = /^[a-zA-Z0-9_-]{11}$/;

function cleanInput(value) {
  return String(value ?? '')
    .trim()
    .replace(/^['"<\s]+|['">\s]+$/g, '');
}

function validId(value) {
  if (!value) return null;
  const id = decodeURIComponent(value).trim();
  return VIDEO_ID.test(id) ? id : null;
}

function parseStartSeconds(url) {
  const raw = url.searchParams.get('t')
    || url.searchParams.get('start')
    || (url.hash.match(/(?:^#|[?&])t=([^&]+)/)?.[1] ?? '');

  if (!raw) return 0;
  if (/^\d+$/.test(raw)) return Number(raw);

  const match = raw.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/i);
  if (!match || match[0] === '') return 0;
  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  const seconds = Number(match[3] || 0);
  return hours * 3600 + minutes * 60 + seconds;
}

function hostnameOf(url) {
  return url.hostname.replace(/^(www|m|music)\./i, '').toLowerCase();
}

/**
 * Parse a YouTube URL or a raw video id.
 * Returns null when the input is not a recognizable video link.
 */
export function parseYouTubeUrl(input) {
  const value = cleanInput(input);
  if (!value) return null;

  const direct = validId(value);
  if (direct) return { videoId: direct, startSeconds: 0 };

  let url;
  try {
    const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    url = new URL(withProtocol);
  } catch {
    return null;
  }

  const host = hostnameOf(url);
  const parts = url.pathname.split('/').filter(Boolean);
  let videoId = null;

  if (host === 'youtu.be') {
    videoId = validId(parts[0]);
  } else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    videoId = validId(url.searchParams.get('v'));
    if (!videoId) {
      const markers = new Set(['embed', 'shorts', 'live', 'v', 'e']);
      const markerIndex = parts.findIndex((part) => markers.has(part));
      if (markerIndex >= 0) videoId = validId(parts[markerIndex + 1]);
    }
  }

  if (!videoId) return null;
  return { videoId, startSeconds: parseStartSeconds(url) };
}
