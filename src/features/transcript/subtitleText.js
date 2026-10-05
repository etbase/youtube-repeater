const SENTENCE_END = /[.!?…。？！]["'”’)\]]*$/;
const MAX_CHARS = 160;
const MAX_SECONDS = 12;
const MAX_GAP_SECONDS = 1.25;

const SOUND_LABEL = /^(?:\[|\()(music|applause|gasp|gasping|laughter|laughs|laughing|silence|noise|inaudible|cheering|clapping|sigh|sighs|crying|screaming)(?:\]|\))$/i;

export function cleanCaptionText(text) {
  return String(text ?? '')
    .replace(/<[^>]+>/g, '')
    .replace(/^\s*>>\s*/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function cueKind(text) {
  return SOUND_LABEL.test(String(text ?? '').trim()) ? 'sound' : 'speech';
}

function canMerge(previous, next) {
  if (previous.kind === 'sound' || next.kind === 'sound') return false;
  if (SENTENCE_END.test(previous.text)) return false;
  if (next.start - previous.end > MAX_GAP_SECONDS) return false;
  if (previous.text.length + 1 + next.text.length > MAX_CHARS) return false;
  if (next.end - previous.start > MAX_SECONDS) return false;
  return true;
}

export function prepareCues(cues, mode = 'smart') {
  const cleaned = [];
  for (const cue of cues) {
    const text = cleanCaptionText(cue.text);
    if (!text || !Number.isFinite(cue.start) || !Number.isFinite(cue.end) || cue.end <= cue.start) continue;
    cleaned.push({
      start: cue.start,
      end: cue.end,
      text,
      kind: cueKind(text),
    });
  }

  if (mode !== 'smart') return cleaned;

  const merged = [];
  for (const cue of cleaned) {
    const previous = merged[merged.length - 1];
    if (!previous || !canMerge(previous, cue)) {
      merged.push({ ...cue });
      continue;
    }
    previous.text = `${previous.text} ${cue.text}`.replace(/\s+/g, ' ').trim();
    previous.end = cue.end;
    previous.kind = cueKind(previous.text);
  }
  return merged;
}

export function sliceCues(cues, startAt, lengthSeconds) {
  const start = Number(startAt);
  const from = Number.isFinite(start) && start > 0 ? start : 0;
  const length = Number(lengthSeconds);
  const to = Number.isFinite(length) && length > 0 ? from + length : Infinity;
  return cues.filter((cue) => cue.end > from && cue.start < to);
}
