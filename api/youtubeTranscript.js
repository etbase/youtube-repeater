const ANDROID_VERSION = '20.10.38';
const USER_AGENT = `com.google.android.youtube/${ANDROID_VERSION} (Linux; U; Android 14) gzip`;
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

function assertVideoId(videoId) {
  if (!/^[a-zA-Z0-9_-]{11}$/.test(String(videoId || ''))) {
    throw new TranscriptFailure('INVALID_VIDEO_ID');
  }
}

async function requestText(url, options, signal) {
  let response;
  try {
    response = await fetch(url, { ...options, signal });
  } catch (error) {
    if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
      throw new TranscriptFailure('TRANSCRIPT_TIMEOUT');
    }
    throw new TranscriptFailure('TRANSCRIPT_BLOCKED');
  }
  if (response.status === 429) throw new TranscriptFailure('TRANSCRIPT_BLOCKED');
  return response;
}

export async function fetchYouTubeTranscript(videoId, { timeoutMs = 9000 } = {}) {
  assertVideoId(videoId);
  const signal = AbortSignal.timeout(timeoutMs);
  const headers = { 'User-Agent': USER_AGENT, 'Accept-Language': 'en-US,en;q=0.9' };

  const watch = await requestText(`https://www.youtube.com/watch?v=${videoId}&hl=en`, { headers }, signal);
  if (!watch.ok) throw new TranscriptFailure('VIDEO_UNAVAILABLE');
  const html = await watch.text();
  if (html.includes('class="g-recaptcha"')) throw new TranscriptFailure('TRANSCRIPT_BLOCKED');
  const apiKey = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/)?.[1];
  if (!apiKey) throw new TranscriptFailure('TRANSCRIPT_BLOCKED');

  const playerResponse = await requestText(
    `https://www.youtube.com/youtubei/v1/player?key=${apiKey}&prettyPrint=false`,
    {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
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
    },
    signal,
  );
  if (!playerResponse.ok) throw new TranscriptFailure('VIDEO_UNAVAILABLE');

  const player = await playerResponse.json();
  const status = player?.playabilityStatus?.status;
  const tracks = player?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
  if (!Array.isArray(tracks) || tracks.length === 0) {
    throw new TranscriptFailure(status && status !== 'OK' ? 'VIDEO_UNAVAILABLE' : 'TRANSCRIPT_NOT_AVAILABLE');
  }

  const track = pickEnglishTrack(tracks);
  if (!track?.baseUrl) throw new TranscriptFailure('TRANSCRIPT_NOT_AVAILABLE');

  const transcriptUrl = String(track.baseUrl).replace(/&fmt=[^&]+/, '');
  const transcriptResponse = await requestText(transcriptUrl, { headers }, signal);
  if (!transcriptResponse.ok) throw new TranscriptFailure('TRANSCRIPT_NOT_AVAILABLE');
  const subtitles = parseTranscriptXml(await transcriptResponse.text());
  if (subtitles.length === 0) throw new TranscriptFailure('TRANSCRIPT_NOT_AVAILABLE');

  return {
    language: track.languageCode,
    subtitles,
  };
}
