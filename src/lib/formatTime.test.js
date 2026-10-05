import assert from 'node:assert/strict';
import test from 'node:test';
import { formatRate, formatTime } from './formatTime.js';

test('formats timestamps with tenths', () => {
  assert.equal(formatTime(0), '0:00.0');
  assert.equal(formatTime(12.34), '0:12.3');
  assert.equal(formatTime(75.9), '1:15.9');
  assert.equal(formatTime(3723.2), '1:02:03.2');
  assert.equal(formatTime(Number.NaN), '0:00.0');
});

test('formats playback rates', () => {
  assert.equal(formatRate(0.5), '0.5×');
  assert.equal(formatRate(0.75), '0.75×');
  assert.equal(formatRate(0.85), '0.85×');
  assert.equal(formatRate(1), '1×');
  assert.equal(formatRate(1.25), '1.25×');
});
