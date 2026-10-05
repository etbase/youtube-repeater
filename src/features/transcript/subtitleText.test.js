import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanCaptionText, cueKind, prepareCues, sliceCues } from './subtitleText.js';

test('joins broken auto-captions into one sentence and keeps the outer times', () => {
  const cues = prepareCues([
    { start: 57, end: 58, text: 'Getting a' },
    { start: 58, end: 59, text: 'car started isn\'t' },
    { start: 59, end: 60, text: 'worth that much.' },
    { start: 60, end: 63, text: 'If everyone did business like you, New York would be bankrupt.' },
  ]);

  assert.equal(cues.length, 2);
  assert.equal(cues[0].text, "Getting a car started isn't worth that much.");
  assert.equal(cues[0].start, 57);
  assert.equal(cues[0].end, 60);
  assert.equal(cues[1].start, 60);
});

test('does not merge across a pause, a finished sentence, or a sound effect', () => {
  const cues = prepareCues([
    { start: 1, end: 2, text: 'Hello there.' },
    { start: 2.1, end: 3, text: 'Next line' },
    { start: 10, end: 11, text: 'Much later' },
    { start: 11.1, end: 12, text: '[Music]' },
    { start: 12.1, end: 13, text: 'After the music' },
  ]);

  assert.deepEqual(cues.map((cue) => cue.text), [
    'Hello there.',
    'Next line',
    'Much later',
    '[Music]',
    'After the music',
  ]);
  assert.equal(cues[3].kind, 'sound');
  assert.equal(cueKind('Why?'), 'speech');
});

test('strips speaker arrows from caption text', () => {
  assert.equal(cleanCaptionText('>> Why?'), 'Why?');
  assert.equal(cleanCaptionText('  >>   Why?  '), 'Why?');
});

test('limits an import window without moving the timestamps', () => {
  const cues = [
    { start: 10, end: 12, text: 'early' },
    { start: 20, end: 22, text: 'kept' },
    { start: 40, end: 42, text: 'late' },
  ];
  assert.deepEqual(sliceCues(cues, 15, 10).map((cue) => cue.text), ['kept']);
});
