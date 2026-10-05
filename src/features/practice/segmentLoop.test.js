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
  loopTarget: 3,
  loopsCompleted: 0,
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

test('loops back before the target count is reached', () => {
  const decision = evaluateSegmentEnd(base);
  assert.equal(decision.type, 'seek-start');
  assert.equal(decision.seekTo, 0);
  assert.equal(decision.loopsCompleted, 1);
  assert.equal(decision.gate, true);
});

test('does not count the same pass twice while the gate is closed', () => {
  const decision = evaluateSegmentEnd({ ...base, gate: true, loopsCompleted: 1 });
  assert.deepEqual(decision, { type: 'none', gate: true });
});

test('opens the gate again once playback is back inside the segment', () => {
  const decision = evaluateSegmentEnd({ ...base, time: 1, gate: true });
  assert.deepEqual(decision, { type: 'none', gate: false });
});

test('stops on the last requested loop', () => {
  const decision = evaluateSegmentEnd({ ...base, loopsCompleted: 2 });
  assert.equal(decision.type, 'finish');
  assert.equal(decision.loopsCompleted, 3);
  assert.equal(decision.seekTo, 10);
});

test('a target of one plays the segment a single time', () => {
  const decision = evaluateSegmentEnd({ ...base, loopTarget: 1 });
  assert.equal(decision.type, 'finish');
  assert.equal(decision.loopsCompleted, 1);
});

test('infinity keeps seeking back to A', () => {
  const decision = evaluateSegmentEnd({
    ...base,
    loopTarget: Infinity,
    loopsCompleted: 40,
  });
  assert.equal(decision.type, 'seek-start');
  assert.equal(decision.loopsCompleted, 41);
});

test('pause-and-repeat waits instead of seeking immediately', () => {
  const decision = evaluateSegmentEnd({ ...base, mode: 'pause' });
  assert.equal(decision.type, 'pause-wait');
  assert.equal(decision.loopsCompleted, 1);
});

test('pause-and-repeat still finishes on the last pass', () => {
  const decision = evaluateSegmentEnd({
    ...base,
    mode: 'pause',
    loopTarget: 5,
    loopsCompleted: 4,
  });
  assert.equal(decision.type, 'finish');
  assert.equal(decision.loopsCompleted, 5);
});

test('ignores the boundary while waiting, finished, or paused', () => {
  assert.equal(evaluateSegmentEnd({ ...base, phase: 'waiting' }).type, 'none');
  assert.equal(evaluateSegmentEnd({ ...base, phase: 'complete', gate: true }).gate, true);
  assert.equal(evaluateSegmentEnd({ ...base, playing: false, gate: true }).gate, true);
  assert.equal(evaluateSegmentEnd({ ...base, mode: null }).type, 'none');
});

test('a chosen sentence plays once and stops at B', () => {
  const decision = evaluateSegmentEnd({ ...base, mode: 'once', loopsCompleted: 2 });
  assert.equal(decision.type, 'finish');
  assert.equal(decision.seekTo, 10);
  assert.equal(decision.loopsCompleted, 2);
});

test('restarts from A only when playback is outside the segment', () => {
  assert.equal(shouldRestartFromA({ time: 0, pointA: 2, pointB: 8, mode: 'loop' }), true);
  assert.equal(shouldRestartFromA({ time: 8, pointA: 2, pointB: 8, mode: 'pause' }), true);
  assert.equal(shouldRestartFromA({ time: 4, pointA: 2, pointB: 8, mode: 'loop' }), false);
  assert.equal(shouldRestartFromA({ time: 4, pointA: 2, pointB: 8, mode: null }), false);
});
