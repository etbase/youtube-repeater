// The production site reads the API address from /transcript-api.txt
// so GitHub Pages can be pointed at Vercel without rebuilding.
// VITE_TRANSCRIPT_API_URL overrides that file during local development.
export const TRANSCRIPT_API_URL = import.meta.env?.VITE_TRANSCRIPT_API_URL || '';

function normalizeCue(item, index) {
  const start = Number(item?.start);
  const end = Number(item?.end);
  const text = typeof item?.text === 'string' ? item.text.trim() : '';
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || !text) {
    throw new Error(`字幕 API 的第 ${index + 1} 句格式不正確。`);
  }
  return { start, end, text };
}

export function parseTranscriptApiConfig(text) {
  const line = String(text ?? '')
    .split('\n')
    .map((item) => item.trim())
    .find((item) => item && !item.startsWith('#'));
  if (!line) return '';
  try {
    const url = new URL(line);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return '';
    return url.toString();
  } catch {
    return '';
  }
}

export function cuesFromTranscriptResponse(data) {
  if (!data || data.success !== true || !Array.isArray(data.subtitles)) {
    const error = new Error(data?.message || '無法自動取得這部影片的字幕');
    error.code = data?.error || 'TRANSCRIPT_NOT_AVAILABLE';
    throw error;
  }
  return data.subtitles.map(normalizeCue);
}

let configuredUrl;

function configuredUrlPromise() {
  if (TRANSCRIPT_API_URL) return Promise.resolve(TRANSCRIPT_API_URL);
  if (typeof document === 'undefined') return Promise.resolve('');
  if (!configuredUrl) {
    configuredUrl = fetch(new URL('./transcript-api.txt', document.baseURI))
      .then((response) => (response.ok ? response.text() : ''))
      .then(parseTranscriptApiConfig)
      .catch(() => '');
  }
  return configuredUrl;
}

export async function getTranscript(videoId) {
  if (!videoId) throw new Error('沒有影片可以取得字幕。');

  const apiUrl = await configuredUrlPromise();
  if (!apiUrl) {
    const error = new Error('字幕 API 尚未設定。');
    error.code = 'transcript-api-unconfigured';
    throw error;
  }

  const endpoint = new URL(apiUrl);
  endpoint.searchParams.set('videoId', videoId);
  let response;
  try {
    response = await fetch(endpoint, { signal: AbortSignal.timeout(12000) });
  } catch {
    const error = new Error('無法自動取得這部影片的字幕');
    error.code = 'TRANSCRIPT_TIMEOUT';
    throw error;
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  if (!response.ok && !data) {
    const error = new Error('無法自動取得這部影片的字幕');
    error.code = 'TRANSCRIPT_ERROR';
    throw error;
  }
  return cuesFromTranscriptResponse(data);
}
