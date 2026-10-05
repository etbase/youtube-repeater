import assert from 'node:assert/strict';
import test from 'node:test';
import { cuesFromSupadata, failureCodeForSupadata } from './supadataTranscript.js';

test('converts Supadata millisecond offsets into seconds', () => {
  const result = cuesFromSupadata({
    lang: 'en',
    availableLangs: ['en', 'de'],
    content: [
      {
        text: 'All right, so here we are, in front of the elephants',
        offset: 1200,
        duration: 2160,
        lang: 'en',
      },
      {
        text: "Getting a car started isn't worth that much.",
        offset: 57000,
        duration: 3000,
        lang: 'en',
      },
    ],
  });
  assert.equal(result.language, 'en');
  assert.deepEqual(result.subtitles, [
    { start: 1.2, end: 3.36, text: 'All right, so here we are, in front of the elephants' },
    { start: 57, end: 60, text: "Getting a car started isn't worth that much." },
  ]);
});

test('rejects a transcript that is not English', () => {
  assert.throws(
    () => cuesFromSupadata({
      lang: 'ja',
      content: [{ text: 'こんにちは', offset: 0, duration: 1000, lang: 'ja' }],
    }),
    (error) => error.code === 'TRANSCRIPT_NOT_AVAILABLE',
  );
});

test('rejects a plain-text transcript because it has no timestamps', () => {
  assert.throws(
    () => cuesFromSupadata({ lang: 'en', content: 'All right, so here we are.' }),
    (error) => error.code === 'TRANSCRIPT_NOT_AVAILABLE',
  );
});

test('maps Supadata failures onto the existing error codes', () => {
  assert.equal(failureCodeForSupadata(206, { error: 'transcript-unavailable' }), 'TRANSCRIPT_NOT_AVAILABLE');
  assert.equal(failureCodeForSupadata(404, { error: 'not-found' }), 'VIDEO_UNAVAILABLE');
  assert.equal(failureCodeForSupadata(429, { error: 'limit-exceeded' }), 'QUOTA_EXCEEDED');
});
