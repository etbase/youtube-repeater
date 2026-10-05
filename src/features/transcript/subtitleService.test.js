import assert from 'node:assert/strict';
import test from 'node:test';
import {
  TRANSCRIPT_API_URL,
  cuesFromTranscriptResponse,
  getTranscript,
  parseTranscriptApiConfig,
} from './subtitleService.js';

test('a missing transcript API fails without taking the page down', async () => {
  assert.equal(TRANSCRIPT_API_URL, '');
  await assert.rejects(getTranscript('dQw4w9WgXcQ'), (error) => {
    assert.equal(error.code, 'transcript-api-unconfigured');
    return true;
  });
});

test('reads one API address from the config file and ignores comments', () => {
  const text = `# note
# https://example.com/ignored

https://example.vercel.app/api/transcript
`;
  assert.equal(parseTranscriptApiConfig(text), 'https://example.vercel.app/api/transcript');
  assert.equal(parseTranscriptApiConfig('# only a comment\n'), '');
});

test('turns a successful transcript response into cue objects', () => {
  const cues = cuesFromTranscriptResponse({
    success: true,
    language: 'en',
    subtitles: [
      { start: 57, end: 60, text: 'Getting a car started isn\'t worth that much.' },
    ],
  });
  assert.deepEqual(cues, [
    { start: 57, end: 60, text: 'Getting a car started isn\'t worth that much.' },
  ]);
});

test('a failed transcript response stays a normal error', () => {
  assert.throws(
    () => cuesFromTranscriptResponse({
      success: false,
      error: 'TRANSCRIPT_NOT_AVAILABLE',
      message: '無法自動取得這部影片的字幕',
    }),
    (error) => error.code === 'TRANSCRIPT_NOT_AVAILABLE',
  );
});
