// Point this at a Vercel Function (or any JSON API) when one exists.
// Leave it empty on GitHub Pages so a missing backend never crashes the app.
export const TRANSCRIPT_API_URL = '';

function normalizeCue(item, index) {
  const start = Number(item?.start);
  const end = Number(item?.end);
  const text = typeof item?.text === 'string' ? item.text.trim() : '';
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || !text) {
    throw new Error(`字幕 API 的第 ${index + 1} 句格式不正確。`);
  }
  return { start, end, text };
}

export async function getTranscript(videoId) {
  if (!videoId) throw new Error('沒有影片可以取得字幕。');
  if (!TRANSCRIPT_API_URL) {
    const error = new Error('字幕 API 尚未設定。');
    error.code = 'transcript-api-unconfigured';
    throw error;
  }

  const endpoint = new URL(TRANSCRIPT_API_URL);
  endpoint.searchParams.set('videoId', videoId);
  const response = await fetch(endpoint);
  if (!response.ok) throw new Error('字幕 API 沒有回應這部影片。');
  const data = await response.json();
  if (!Array.isArray(data)) throw new Error('字幕 API 格式不正確。');
  return data.map(normalizeCue);
}
