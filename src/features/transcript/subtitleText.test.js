import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanCaptionText, cueKind, prepareCues, sentenceAtTime, sliceCues } from './subtitleText.js';

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

test('moves a trailing fragment onto the following sentence', () => {
  const cues = prepareCues([
    { start: 10, end: 14, text: 'Just rest. Just be. I will' },
    { start: 16, end: 20, text: 'be here again soon with another gentle story.' },
  ]);

  assert.deepEqual(cues.map((cue) => cue.text), [
    'Just rest. Just be.',
    'I will be here again soon with another gentle story.',
  ]);
  assert.equal(cues[0].start, 10);
  assert.equal(cues[0].end, 14);
  assert.equal(cues[1].start, 16);
  assert.equal(cues[1].end, 20);
});

test('joins separate caption fragments with the outer timestamps', () => {
  const cues = prepareCues([
    { start: 10, end: 12, text: 'I will' },
    { start: 12, end: 15, text: 'be here again soon.' },
  ]);

  assert.equal(cues.length, 1);
  assert.equal(cues[0].text, 'I will be here again soon.');
  assert.equal(cues[0].start, 10);
  assert.equal(cues[0].end, 15);
});

test('keeps two complete sentences that share one caption on that caption', () => {
  const cues = prepareCues([
    { start: 4, end: 9, text: 'Just rest. Just be.' },
  ]);

  assert.equal(cues.length, 1);
  assert.equal(cues[0].text, 'Just rest. Just be.');
  assert.equal(cues[0].start, 4);
  assert.equal(cues[0].end, 9);
});

test('does not split names, and a sound cue does not block the sentence', () => {
  const named = prepareCues([
    { start: 1, end: 3, text: 'Meet Mr. Smith today.' },
  ]);
  assert.equal(named[0].text, 'Meet Mr. Smith today.');

  const cues = prepareCues([
    { start: 1, end: 2, text: 'I will' },
    { start: 2, end: 3, text: '[Music]' },
    { start: 3, end: 5, text: 'be right back.' },
  ]);
  assert.deepEqual(cues.map((cue) => [cue.text, cue.start, cue.end]), [
    ['I will be right back.', 1, 5],
    ['[Music]', 2, 3],
  ]);
});

test('does not cut a finished sentence just because it is long', () => {
  const text = `This is a long but finished sentence about practicing English carefully, with enough words to pass the old limit, and it still ends once. ${'word '.repeat(40)}done.`;
  const cues = prepareCues([
    { start: 1, end: 8, text: text.trim() },
    { start: 8, end: 12, text: 'Next sentence starts here.' },
  ]);
  assert.equal(cues.length, 2);
  assert.equal(cues[0].text.endsWith('done.'), true);
  assert.equal(cues[1].text, 'Next sentence starts here.');
});

test('does not leave later sentences inside an earlier sentence range', () => {
  const cues = prepareCues([
    { start: 6, end: 19, text: 'The first sentence is here.' },
    { start: 13, end: 19, text: 'The second sentence is here.' },
    { start: 17, end: 22, text: 'The third sentence is here.' },
  ]);

  assert.deepEqual(cues.map((cue) => [cue.start, cue.end]), [
    [6, 13],
    [13, 17],
    [17, 22],
  ]);
  assert.equal(sentenceAtTime(cues, 18)?.text, 'The third sentence is here.');
  assert.equal(sentenceAtTime(cues, 14)?.text, 'The second sentence is here.');
  assert.equal(sentenceAtTime(cues, 8)?.text, 'The first sentence is here.');
});

test('limits an import window without moving the timestamps', () => {
  const cues = [
    { start: 10, end: 12, text: 'early' },
    { start: 20, end: 22, text: 'kept' },
    { start: 40, end: 42, text: 'late' },
  ];
  assert.deepEqual(sliceCues(cues, 15, 10).map((cue) => cue.text), ['kept']);
});
