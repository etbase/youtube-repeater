import assert from 'node:assert/strict';
import test from 'node:test';
import { parseTranscript } from './parseTranscript.js';

const sample = `[
  { "start": 140.0, "end": 143.0, "text": "You're the woman from earlier." },
  { "start": 150.0, "end": 152.0, "text": "Mason." },
  { "start": 158.0, "end": 161.0, "text": "What the hell?" }
]`;

test('reads start, end, and text from a transcript array', () => {
  const cues = parseTranscript(sample);
  assert.equal(cues.length, 3);
  assert.deepEqual(
    cues.map(({ start, end, text }) => ({ start, end, text })),
    [
      { start: 140, end: 143, text: "You're the woman from earlier." },
      { start: 150, end: 152, text: 'Mason.' },
      { start: 158, end: 161, text: 'What the hell?' },
    ],
  );
});

test('rejects a transcript that is not a cue array', () => {
  assert.throws(() => parseTranscript('not json'), /JSON/);
  assert.throws(() => parseTranscript('{"start":1}'), /陣列/);
  assert.throws(() => parseTranscript('[{"start":1,"end":1.1,"text":"hi"}]'), /0\.4 秒/);
});
