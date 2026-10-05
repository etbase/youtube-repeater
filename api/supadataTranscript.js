const USER_MESSAGE = '無法自動取得這部影片的字幕';
const SUPADATA_URL = 'https://api.supadata.ai/v1/transcript';

export class TranscriptFailure extends Error {
  constructor(code) {
    super(USER_MESSAGE);
    this.code = code;
  }
}

function isEnglish(language) {
  return String(language || '').toLowerCase().startsWith('en');
}

export function cuesFromSupadata(payload) {
  const language = String(payload?.lang || '');
  if (!isEnglish(language) || !Array.isArray(payload?.content)) {
    throw new TranscriptFailure('TRANSCRIPT_NOT_AVAILABLE');
  }

  const subtitles = payload.content.flatMap((chunk) => {
    const startMs = Number(chunk?.offset);
    const durationMs = Number(chunk?.duration);
    const text = typeof chunk?.text === 'string' ? chunk.text.replace(/\s+/g, ' ').trim() : '';
    if (!text || !Number.isFinite(startMs) || !Number.isFinite(durationMs) || durationMs <= 0) return [];
    const start = startMs / 1000;
    const end = (startMs + durationMs) / 1000;
    if (end <= start) return [];
    return [{ start, end, text }];
  });

  if (subtitles.length === 0) throw new TranscriptFailure('TRANSCRIPT_NOT_AVAILABLE');
  return { language, subtitles };
}

export function failureCodeForSupadata(status, payload) {
  const code = String(payload?.error || '');
  if (status === 206 || code === 'transcript-unavailable') return 'TRANSCRIPT_NOT_AVAILABLE';
  if (status === 404 || code === 'not-found') return 'VIDEO_UNAVAILABLE';
  if (status === 429 || code === 'limit-exceeded') return 'QUOTA_EXCEEDED';
  if (status === 401 || code === 'unauthorized') return 'TRANSCRIPT_ERROR';
  return 'TRANSCRIPT_ERROR';
}

function assertVideoId(videoId) {
  if (!/^[a-zA-Z0-9_-]{11}$/.test(String(videoId || ''))) {
    throw new TranscriptFailure('INVALID_VIDEO_ID');
  }
}

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function transcriptFromPayload(payload) {
  if (payload?.result && typeof payload.result === 'object') return cuesFromSupadata(payload.result);
  return cuesFromSupadata(payload);
}

async function pollJob(jobId, apiKey, signal) {
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    if (signal.aborted) throw new TranscriptFailure('TRANSCRIPT_TIMEOUT');
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const response = await fetch(`${SUPADATA_URL}/${encodeURIComponent(jobId)}`, {
      headers: { 'x-api-key': apiKey },
      signal,
    });
    const payload = await readJson(response);
    if (payload?.status === 'failed') throw new TranscriptFailure('TRANSCRIPT_NOT_AVAILABLE');
    if (payload?.status === 'completed' || Array.isArray(payload?.content) || Array.isArray(payload?.result?.content)) {
      return transcriptFromPayload(payload);
    }
    if (!response.ok) throw new TranscriptFailure(failureCodeForSupadata(response.status, payload));
  }
  throw new TranscriptFailure('TRANSCRIPT_TIMEOUT');
}

export async function fetchYouTubeTranscript(videoId, { apiKey = process.env.SUPADATA_API_KEY, timeoutMs = 10000 } = {}) {
  assertVideoId(videoId);
  if (!apiKey) throw new TranscriptFailure('TRANSCRIPT_ERROR');

  const signal = AbortSignal.timeout(timeoutMs);
  const endpoint = new URL(SUPADATA_URL);
  endpoint.searchParams.set('url', `https://www.youtube.com/watch?v=${videoId}`);
  endpoint.searchParams.set('lang', 'en');
  endpoint.searchParams.set('mode', 'native');

  let response;
  try {
    response = await fetch(endpoint, {
      headers: { 'x-api-key': apiKey },
      signal,
    });
  } catch (error) {
    if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
      throw new TranscriptFailure('TRANSCRIPT_TIMEOUT');
    }
    throw new TranscriptFailure('TRANSCRIPT_ERROR');
  }

  const payload = await readJson(response);
  if (response.status === 202 && payload?.jobId) return pollJob(payload.jobId, apiKey, signal);
  if (response.status === 206 || !response.ok) {
    throw new TranscriptFailure(failureCodeForSupadata(response.status, payload));
  }
  return transcriptFromPayload(payload);
}
