const ANDROID_VERSION = '20.10.38';
const ANDROID_USER_AGENT = `com.google.android.youtube/${ANDROID_VERSION} (Linux; U; Android 14) gzip`;
const BROWSER_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const ANDROID_API_KEY = 'AIzaSyA8eiZmM1FaDVjRy-df2KTyQ_vz_yYM39w';
const PREFERRED_ENGLISH = ['en-us', 'en-gb', 'en'];
const USER_MESSAGE = '無法自動取得這部影片的字幕';

export class TranscriptFailure extends Error {
  constructor(code) {
    super(USER_MESSAGE);
    this.code = code;
  }
}

export function pickEnglishTrack(tracks) {
  const english = (tracks || []).filter((track) => (
    String(track?.languageCode || '').toLowerCase().startsWith('en')
  ));
  const rank = (track) => {
    const code = String(track.languageCode).toLowerCase();
    const index = PREFERRED_ENGLISH.indexOf(code);
    return index === -1 ? PREFERRED_ENGLISH.length : index;
  };
  const byRank = (list) => [...list].sort((a, b) => rank(a) - rank(b));
  const manual = byRank(english.filter((track) => track.kind !== 'asr'));
  if (manual.length > 0) return manual[0];
  const auto = byRank(english.filter((track) => track.kind === 'asr'));
  return auto[0] || null;
}

function decodeXml(text) {
  let value = String(text);
  for (let pass = 0; pass < 2; pass += 1) {
    value = value
      .replace(/&#(\d+);/g, (_, number) => String.fromCharCode(Number(number)))
      .replace(/&#x([0-9a-fA-F]+);/g, (_, number) => String.fromCharCode(parseInt(number, 16)))
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');
  }
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function parseTranscriptXml(xml) {
  const cues = [];
  const pattern = /<text\b([^>]*)>([\s\S]*?)<\/text>/g;
  for (const match of String(xml).matchAll(pattern)) {
    const attrs = match[1];
    const start = Number(attrs.match(/\bstart="([^"]+)"/)?.[1]);
    const duration = Number(attrs.match(/\bdur="([^"]+)"/)?.[1]);
    const text = decodeXml(match[2]);
    if (!Number.isFinite(start) || !Number.isFinite(duration) || duration <= 0 || !text) continue;
    cues.push({
      start,
      end: Math.round((start + duration) * 1000) / 1000,
      text,
    });
  }
  return cues;
}

export function parseTranscriptJson3(payload) {
  const events = Array.isArray(payload?.events) ? payload.events : [];
  const cues = [];
  events.forEach((event) => {
    if (!Array.isArray(event?.segs)) return;
    const text = event.segs
      .map((segment) => segment?.utf8 || '')
      .join('')
      .replace(/\s+/g, ' ')
      .trim();
    const startMs = Number(event.tStartMs);
    const durationMs = Number(event.dDurationMs);
    if (!text || !Number.isFinite(startMs)) return;
    const start = startMs / 1000;
    const end = Number.isFinite(durationMs) && durationMs > 0
      ? Math.round(startMs + durationMs) / 1000
      : null;
    cues.push({ start, end, text });
  });
  return cues.flatMap((cue, index) => {
    const end = cue.end ?? cues[index + 1]?.start;
    if (!Number.isFinite(end) || end <= cue.start) return [];
    return [{ start: cue.start, end, text: cue.text }];
  });
}

function assertVideoId(videoId) {
  if (!/^[a-zA-Z0-9_-]{11}$/.test(String(videoId || ''))) {
    throw new TranscriptFailure('INVALID_VIDEO_ID');
  }
}

function extractJson(html, marker) {
  const markerAt = html.indexOf(marker);
  if (markerAt < 0) return null;
  const jsonStart = html.indexOf('{', markerAt);
  if (jsonStart < 0) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let index = jsonStart; index < html.length; index += 1) {
    const character = html[index];
    if (inString) {
      if (escape) escape = false;
      else if (character === '\\') escape = true;
      else if (character === '"') inString = false;
      continue;
    }
    if (character === '"') inString = true;
    else if (character === '{') depth += 1;
    else if (character === '}') {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(html.slice(jsonStart, index + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

function captionUrl(baseUrl, token) {
  const url = new URL(baseUrl);
  url.searchParams.delete('fmt');
  url.searchParams.set('fmt', 'json3');
  if (token) {
    url.searchParams.set('pot', token);
    url.searchParams.set('c', 'WEB');
  }
  return url;
}

function needsPoToken(baseUrl) {
  return /[?&]exp=xpe\b/.test(baseUrl);
}

async function readCaptionJson(url, signal) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': BROWSER_USER_AGENT,
      'Accept-Language': 'en-US,en;q=0.9',
      Referer: 'https://www.youtube.com/',
    },
    signal,
  });
  if (!response.ok) return [];
  const body = await response.text();
  if (!body.trim()) return [];
  try {
    return parseTranscriptJson3(JSON.parse(body));
  } catch {
    return [];
  }
}

async function tryAndroidTranscript(videoId, signal) {
  const response = await fetch(
    `https://www.youtube.com/youtubei/v1/player?key=${ANDROID_API_KEY}&prettyPrint=false`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': ANDROID_USER_AGENT,
      },
      body: JSON.stringify({
        context: {
          client: {
            clientName: 'ANDROID',
            clientVersion: ANDROID_VERSION,
            hl: 'en',
            gl: 'US',
          },
        },
        videoId,
      }),
      signal,
    },
  );
  if (!response.ok) return null;
  const player = await response.json();
  const tracks = player?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
  if (player?.playabilityStatus?.status !== 'OK' || !Array.isArray(tracks)) return null;
  const track = pickEnglishTrack(tracks);
  if (!track?.baseUrl || needsPoToken(track.baseUrl)) return null;
  const timed = await fetch(String(track.baseUrl).replace(/&fmt=[^&]+/, ''), {
    headers: { 'User-Agent': ANDROID_USER_AGENT },
    signal,
  });
  if (!timed.ok) return null;
  const subtitles = parseTranscriptXml(await timed.text());
  if (subtitles.length === 0) return null;
  return { language: track.languageCode, subtitles };
}

async function fetchWatchPlayer(videoId, signal) {
  const response = await fetch(`https://www.youtube.com/watch?v=${videoId}&hl=en&bpctr=9999999999`, {
    headers: {
      'User-Agent': BROWSER_USER_AGENT,
      'Accept-Language': 'en-US,en;q=0.9',
      Accept: 'text/html,application/xhtml+xml',
      // Skips YouTube's consent interstitial. This is not a Google account cookie.
      Cookie: 'CONSENT=YES+cb; SOCS=CAI',
    },
    signal,
  });
  if (response.status === 429) throw new TranscriptFailure('TRANSCRIPT_BLOCKED');
  if (!response.ok) throw new TranscriptFailure('VIDEO_UNAVAILABLE');
  const html = await response.text();
  if (html.includes('class="g-recaptcha"') || html.includes('confirm you’re not a bot') || html.includes("confirm you're not a bot")) {
    throw new TranscriptFailure('TRANSCRIPT_BLOCKED');
  }
  const player = extractJson(html, 'ytInitialPlayerResponse');
  if (!player) throw new TranscriptFailure('TRANSCRIPT_BLOCKED');
  return player;
}

async function fetchGatedTrack(videoId, track, signal) {
  const { mintPoToken } = await import('./poToken.js');
  let token = needsPoToken(track.baseUrl) ? await mintPoToken(videoId) : '';
  let subtitles = await readCaptionJson(captionUrl(track.baseUrl, token), signal);
  if (subtitles.length === 0 && needsPoToken(track.baseUrl)) {
    token = await mintPoToken(videoId, { force: true });
    subtitles = await readCaptionJson(captionUrl(track.baseUrl, token), signal);
  }
  return subtitles;
}

export async function fetchYouTubeTranscript(videoId) {
  assertVideoId(videoId);

  try {
    const direct = await tryAndroidTranscript(videoId, AbortSignal.timeout(4000));
    if (direct) return direct;
  } catch (error) {
    if (error instanceof TranscriptFailure) throw error;
  }

  let player;
  try {
    player = await fetchWatchPlayer(videoId, AbortSignal.timeout(8000));
  } catch (error) {
    if (error instanceof TranscriptFailure) throw error;
    if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
      throw new TranscriptFailure('TRANSCRIPT_TIMEOUT');
    }
    throw new TranscriptFailure('TRANSCRIPT_BLOCKED');
  }

  const status = player?.playabilityStatus?.status;
  const tracks = player?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
  if (!Array.isArray(tracks) || tracks.length === 0) {
    throw new TranscriptFailure(status && status !== 'OK' ? 'VIDEO_UNAVAILABLE' : 'TRANSCRIPT_NOT_AVAILABLE');
  }
  const track = pickEnglishTrack(tracks);
  if (!track?.baseUrl) throw new TranscriptFailure('TRANSCRIPT_NOT_AVAILABLE');

  let subtitles;
  try {
    subtitles = await fetchGatedTrack(videoId, track, AbortSignal.timeout(8000));
  } catch (error) {
    if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
      throw new TranscriptFailure('TRANSCRIPT_TIMEOUT');
    }
    throw new TranscriptFailure('TRANSCRIPT_BLOCKED');
  }
  if (subtitles.length === 0) throw new TranscriptFailure('TRANSCRIPT_BLOCKED');
  return { language: track.languageCode, subtitles };
}
