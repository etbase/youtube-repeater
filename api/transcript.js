import { TranscriptFailure, fetchYouTubeTranscript } from './supadataTranscript.js';

const USER_MESSAGE = '無法自動取得這部影片的字幕';

function corsHeaders(request) {
  const origin = request.headers?.origin || request.headers?.get?.('origin') || '';
  const allowed = origin === 'https://etbase.github.io'
    || /^http:\/\/localhost:\d+$/.test(origin)
    || /^http:\/\/127\.0\.0\.1:\d+$/.test(origin);
  const headers = {
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
  if (allowed) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
}

function failure(code) {
  return {
    success: false,
    error: code,
    message: USER_MESSAGE,
  };
}

export default async function handler(request, response) {
  const headers = corsHeaders(request);
  Object.entries(headers).forEach(([key, value]) => response.setHeader(key, value));

  if (request.method === 'OPTIONS') {
    response.status(204).end();
    return;
  }

  if (request.method !== 'GET') {
    response.status(405).json(failure('METHOD_NOT_ALLOWED'));
    return;
  }

  const videoId = request.query?.videoId
    || new URL(request.url, 'http://localhost').searchParams.get('videoId')
    || '';

  try {
    const result = await fetchYouTubeTranscript(videoId);
    response.setHeader('Cache-Control', 'public, max-age=300');
    response.status(200).json({
      success: true,
      language: result.language,
      subtitles: result.subtitles,
    });
  } catch (error) {
    const code = error instanceof TranscriptFailure ? error.code : 'TRANSCRIPT_ERROR';
    response.setHeader('Cache-Control', 'no-store');
    response.status(200).json(failure(code));
  }
}
