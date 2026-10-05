import assert from 'node:assert/strict';
import test from 'node:test';
import { TRANSCRIPT_API_URL, getTranscript } from './subtitleService.js';

test('a missing transcript API fails without taking the page down', async () => {
  assert.equal(TRANSCRIPT_API_URL, '');
  await assert.rejects(getTranscript('dQw4w9WgXcQ'), (error) => {
    assert.equal(error.code, 'transcript-api-unconfigured');
    return true;
  });
});
