import { parseTranscript } from './parseTranscript.js';

export function parseTimestamp(value) {
  const text = String(value ?? '').trim().replace(',', '.');
  const parts = text.split(':');
  if (parts.length < 2 || parts.length > 3) return null;

  const secondsPart = parts.pop();
  const [secondText, fractionText = '0'] = secondsPart.split('.');
  const seconds = Number(secondText);
  const fraction = Number(fractionText.padEnd(3, '0').slice(0, 3)) / 1000;
  const minutes = Number(parts.pop());
  const hours = parts.length ? Number(parts[0]) : 0;
  if (![hours, minutes, seconds, fraction].every(Number.isFinite)) return null;
  return hours * 3600 + minutes * 60 + seconds + fraction;
}

function cuesFromBlocks(source) {
  const blocks = source.replace(/\r/g, '').replace(/^\uFEFF/, '').split(/\n{2,}/);
  const cues = [];
  for (const block of blocks) {
    const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
    const timingIndex = lines.findIndex((line) => line.includes('-->'));
    if (timingIndex === -1) continue;
    if (/^(NOTE|STYLE|REGION)\b/i.test(lines[0])) continue;
    const [startRaw, restRaw = ''] = lines[timingIndex].split('-->');
    const start = parseTimestamp(startRaw);
    const end = parseTimestamp(restRaw.trim().split(/\s+/)[0]);
    const text = lines.slice(timingIndex + 1).join(' ').replace(/<[^>]+>/g, '').trim();
    if (start == null || end == null || end <= start || !text) continue;
    cues.push({ start, end, text });
  }
  return cues;
}

export function parseSrt(source) {
  return cuesFromBlocks(source);
}

export function parseVtt(source) {
  const body = String(source).replace(/^WEBVTT[^\n]*\n+/i, '');
  return cuesFromBlocks(body);
}

export function parseSubtitleFile(source) {
  const text = String(source ?? '').replace(/^\uFEFF/, '').trim();
  if (!text) throw new Error('字幕檔是空的。');
  if (text.startsWith('[') || text.startsWith('{')) return parseTranscript(text);
  if (/^WEBVTT/i.test(text)) return parseVtt(text);
  const cues = parseSrt(text);
  if (cues.length === 0) throw new Error('讀不到 SRT 或 VTT 字幕。');
  return cues;
}
