import assert from 'node:assert/strict';
import test from 'node:test';
import { parseTranscriptXml, pickEnglishTrack } from './youtubeTranscript.js';

test('prefers a human English track over auto-generated English', () => {
  const track = pickEnglishTrack([
    { languageCode: 'en', kind: 'asr' },
    { languageCode: 'de', kind: undefined },
    { languageCode: 'en-US', kind: 'asr' },
    { languageCode: 'en', kind: undefined },
    { languageCode: 'en-GB', kind: undefined },
  ]);
  assert.equal(track.languageCode, 'en-GB');
  assert.notEqual(track.kind, 'asr');
});

test('uses auto-generated English only when no human English track exists', () => {
  const track = pickEnglishTrack([
    { languageCode: 'ja', kind: undefined },
    { languageCode: 'en-US', kind: 'asr' },
    { languageCode: 'en', kind: 'asr' },
  ]);
  assert.equal(track.languageCode, 'en-US');
  assert.equal(track.kind, 'asr');
});

test('returns no track when the video has no English captions', () => {
  assert.equal(pickEnglishTrack([{ languageCode: 'ja' }, { languageCode: 'de' }]), null);
});

test('parses timed text into start and end seconds', () => {
  const cues = parseTranscriptXml(`
    <transcript>
      <text start="18.64" dur="3.24">♪ We&amp;#39;re no strangers to love ♪</text>
      <text start="57" dur="3">Getting a car started isn&apos;t worth that much.</text>
    </transcript>
  `);
  assert.deepEqual(cues, [
    { start: 18.64, end: 21.88, text: "♪ We're no strangers to love ♪" },
    { start: 57, end: 60, text: "Getting a car started isn't worth that much." },
  ]);
});
