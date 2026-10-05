import assert from 'node:assert/strict';
import test from 'node:test';
import { parseSubtitleFile, parseTimestamp } from './parseSubtitles.js';

test('reads SRT and VTT timestamps', () => {
  assert.equal(parseTimestamp('00:00:57,000'), 57);
  assert.equal(parseTimestamp('01:00.500'), 60.5);
  assert.equal(parseTimestamp('1:02:03.250'), 3723.25);
});

test('parses srt and vtt cues, including a speaker arrow', () => {
  const srt = `1
00:00:57,000 --> 00:01:00,000
Getting a car started isn't worth that much.

2
00:01:00,000 --> 00:01:03,000
>> Why?
`;
  const vtt = `WEBVTT

00:57.000 --> 01:00.000
Getting a car started isn't worth that much.

00:01:00.000 --> 00:01:03.000 align:start
[Music]
`;

  assert.equal(parseSubtitleFile(srt)[1].text, '>> Why?');
  assert.equal(parseSubtitleFile(vtt)[1].text, '[Music]');
  assert.equal(parseSubtitleFile(srt)[0].start, 57);
  assert.equal(parseSubtitleFile(vtt)[0].end, 60);
});
