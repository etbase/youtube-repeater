import assert from 'node:assert/strict';
import test from 'node:test';
import {
  evaluateSegmentEnd,
  isValidSegment,
  segmentHint,
  shouldRestartFromA,
} from './segmentLoop.js';

const base = {
  time: 10,
  pointA: 0,
  pointB: 10,
  mode: 'loop',
  gate: false,
  phase: 'listening',
  playing: true,
};

test('validates a usable sentence length', () => {
  assert.equal(isValidSegment(1, 1.5), true);
  assert.equal(isValidSegment(1, 1.2), false);
  assert.equal(isValidSegment(null, 2), false);
  assert.equal(segmentHint(null, null), '先設定 A 點與 B 點，再開始復讀。');
  assert.equal(segmentHint(2, 1), 'B 點需要晚於 A 點。');
});

test('loops back to A at the end of the segment', () => {
  const decision = evaluateSegmentEnd(base);
  assert.equal(decision.type, 'seek-start');
  assert.equal(decision.seekTo, 0);
  assert.equal(decision.gate, true);
});

test('does not seek twice while the gate is closed', () => {
  const decision = evaluateSegmentEnd({ ...base, gate: true });
  assert.deepEqual(decision, { type: 'none', gate: true });
});

test('opens the gate again once playback is back inside the segment', () => {
  const decision = evaluateSegmentEnd({ ...base, time: 1, gate: true });
  assert.deepEqual(decision, { type: 'none', gate: false });
});

test('keeps seeking back to A on later passes', () => {
  const decision = evaluateSegmentEnd({ ...base, gate: false });
  assert.equal(decision.type, 'seek-start');
  assert.equal(decision.seekTo, 0);
});

test('ignores the boundary while finished or paused', () => {
  assert.equal(evaluateSegmentEnd({ ...base, phase: 'complete', gate: true }).gate, true);
  assert.equal(evaluateSegmentEnd({ ...base, playing: false, gate: true }).gate, true);
  assert.equal(evaluateSegmentEnd({ ...base, mode: null }).type, 'none');
});

test('a chosen sentence plays once and stops at B', () => {
  const decision = evaluateSegmentEnd({ ...base, mode: 'once' });
  assert.equal(decision.type, 'finish');
  assert.equal(decision.seekTo, 10);
});

test('restarts from A only when playback is outside the segment', () => {
  assert.equal(shouldRestartFromA({ time: 0, pointA: 2, pointB: 8, mode: 'loop' }), true);
  assert.equal(shouldRestartFromA({ time: 8, pointA: 2, pointB: 8, mode: 'loop' }), true);
  assert.equal(shouldRestartFromA({ time: 4, pointA: 2, pointB: 8, mode: 'loop' }), false);
  assert.equal(shouldRestartFromA({ time: 4, pointA: 2, pointB: 8, mode: null }), false);
});
