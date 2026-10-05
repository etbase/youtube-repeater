const SENTENCE_END = /[.!?…。？！]["'”’)\]]*$/;
const SOFT_GAP_SECONDS = 4;
const UNFINISHED_GAP_SECONDS = 15;
const LONG_SENTENCE_CHARS = 480;

const ABBREVIATIONS = new Set([
  'mr', 'mrs', 'ms', 'dr', 'prof', 'sr', 'jr', 'st', 'vs', 'etc', 'inc', 'ltd',
  'gen', 'col', 'sgt', 'rev', 'hon', 'fig', 'vol', 'no', 'pp', 'al', 'approx',
  'dept', 'est', 'mt', 'ft',
]);

// Words that cannot honestly end an English sentence. A caption may still
// pause after them; the following words belong to the same sentence.
const UNFINISHED_ENDING = /(?:\b(?:i|you|we|they|he|she|it|to|of|for|and|but|or|so|if|when|because|although|while|that|which|who|a|an|the|my|your|will|would|can|could|should|have|has|had|been|being|am|is|are|was|were|do|does|did|not|then|with|from|into|about|just|need|needs|needed)|n't|'ll|'re|'ve)\s*$/i;

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

function joinText(left, right) {
  return `${left} ${right}`.replace(/\s+/g, ' ').trim();
}

function periodIsInternal(text, index) {
  const before = text.slice(0, index);
  if (/\d$/.test(before) && /\d/.test(text[index + 1] || '')) return true;
  const word = (before.match(/[A-Za-z]+$/) || [''])[0];
  if (!word) return false;
  if (ABBREVIATIONS.has(word.toLowerCase())) return true;
  if (word.length === 1) return true;
  return /[A-Za-z]/.test(text[index + 1] || '');
}

function isSentenceEnd(text, index) {
  const mark = text[index];
  if (!/[.!?…。？！]/.test(mark)) return false;
  if (mark === '.' && periodIsInternal(text, index)) return false;
  if (mark === '.' || mark === '…') {
    let cursor = index + 1;
    while (text[cursor] === '.') cursor += 1;
    const next = text.slice(cursor).trimStart().replace(/^["'”’)\]]+/, '');
    if (next && /^[a-z]/.test(next) && (mark === '…' || text[index + 1] === '.')) return false;
  }
  return true;
}

export function splitCaptionSentences(text) {
  const complete = [];
  let start = 0;
  for (let index = 0; index < text.length; index += 1) {
    if (!isSentenceEnd(text, index)) continue;
    let end = index + 1;
    while (text[end] === '.' || text[end] === '…') end += 1;
    while (/["'”’)\]]/.test(text[end] || '')) end += 1;
    const sentence = text.slice(start, end).trim();
    if (sentence) complete.push(sentence);
    while (text[end] === ' ') end += 1;
    start = end;
    index = end - 1;
  }
  return { complete, tail: text.slice(start).trim() };
}

function endsSentence(text) {
  return SENTENCE_END.test(text);
}

function shouldContinue(text, gap) {
  if (endsSentence(text)) return false;
  if (gap <= SOFT_GAP_SECONDS) return true;
  return UNFINISHED_ENDING.test(text) && gap <= UNFINISHED_GAP_SECONDS;
}

function lastNaturalBreak(text) {
  const pattern = /,|;|:|\s(?:and|but|so|because|which|while|when)\s/gi;
  let match = pattern.exec(text);
  let index = -1;
  while (match) {
    index = match.index + match[0].length;
    match = pattern.exec(text);
  }
  return index > 0 ? index : -1;
}

function sameTimedSentence(previous, sentence) {
  return previous
    && previous.kind !== 'sound'
    && previous.start === sentence.start
    && previous.end === sentence.end
    && endsSentence(previous.text)
    && endsSentence(sentence.text);
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

  const output = [];
  let open = null;

  function pushSentence(sentence) {
    const last = output[output.length - 1];
    if (sameTimedSentence(last, sentence)) {
      last.text = joinText(last.text, sentence.text);
      return;
    }
    output.push(sentence);
  }

  function closeOpen() {
    if (!open) return;
    pushSentence({
      start: open.start,
      end: open.end,
      text: open.text,
      kind: 'speech',
    });
    open = null;
  }

  function splitOpenIfHuge() {
    if (!open || open.text.length < LONG_SENTENCE_CHARS) return;
    const cut = lastNaturalBreak(open.text.slice(0, LONG_SENTENCE_CHARS));
    if (cut < 0) return;
    const head = open.text.slice(0, cut).trim();
    const rest = open.text.slice(cut).trim();
    if (!head || !rest) return;
    pushSentence({
      start: open.start,
      end: open.end,
      text: head,
      kind: 'speech',
    });
    open = {
      start: open.start,
      end: open.end,
      text: rest,
      continueFromNext: false,
    };
  }

  for (const cue of cleaned) {
    if (cue.kind === 'sound') {
      output.push({ ...cue });
      if (open && !UNFINISHED_ENDING.test(open.text)) closeOpen();
      continue;
    }

    if (open) {
      const gap = Math.max(0, cue.start - open.end);
      if (!shouldContinue(open.text, gap)) closeOpen();
    }

    const { complete, tail } = splitCaptionSentences(cue.text);

    if (open) {
      if (complete.length === 0) {
        open.text = joinText(open.text, tail);
        if (open.continueFromNext) {
          open.start = cue.start;
          open.continueFromNext = false;
        }
        open.end = cue.end;
        splitOpenIfHuge();
        continue;
      }

      const start = open.continueFromNext ? cue.start : open.start;
      pushSentence({
        start,
        end: cue.end,
        text: joinText(open.text, complete[0]),
        kind: 'speech',
      });
      open = null;
      const rest = complete.slice(1);
      if (rest.length) {
        pushSentence({
          start: cue.start,
          end: cue.end,
          text: rest.join(' '),
          kind: 'speech',
        });
      }
      if (tail) {
        open = {
          start: cue.start,
          end: cue.end,
          text: tail,
          continueFromNext: rest.length > 0 || complete.length > 0,
        };
      }
      continue;
    }

    if (complete.length) {
      pushSentence({
        start: cue.start,
        end: cue.end,
        text: complete.join(' '),
        kind: 'speech',
      });
    }
    if (tail) {
      open = {
        start: cue.start,
        end: cue.end,
        text: tail,
        // The tail shares this caption with earlier sentences. The next
        // caption boundary is the last real timestamp we can use without
        // guessing where the new sentence starts inside this caption.
        continueFromNext: complete.length > 0,
      };
    }
  }

  closeOpen();
  output.sort((left, right) => left.start - right.start);
  return output;
}

export function sliceCues(cues, startAt, lengthSeconds) {
  const start = Number(startAt);
  const from = Number.isFinite(start) && start > 0 ? start : 0;
  const length = Number(lengthSeconds);
  const to = Number.isFinite(length) && length > 0 ? from + length : Infinity;
  return cues.filter((cue) => cue.end > from && cue.start < to);
}
