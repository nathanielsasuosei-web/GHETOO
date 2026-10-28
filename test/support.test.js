import test from 'node:test';
import assert from 'node:assert/strict';
import { MIN_SUPPORT_PESEWAS, MAX_SUPPORT_PESEWAS, isValidSupportMinimum, supportMinimum, supportPresets } from '../src/lib/support.js';

test('global support minimum accepts valid pesewa amounts and rejects invalid settings', () => {
  assert.equal(isValidSupportMinimum(100), true);
  assert.equal(isValidSupportMinimum(1255), true);
  assert.equal(isValidSupportMinimum(MAX_SUPPORT_PESEWAS), true);
  for (const invalid of [0, 99, 100.5, MAX_SUPPORT_PESEWAS + 1, NaN, '500', null]) {
    assert.equal(isValidSupportMinimum(invalid), false);
    assert.equal(supportMinimum(invalid), MIN_SUPPORT_PESEWAS);
  }
});

test('suggested amounts respect the artist minimum and maximum checkout amount', () => {
  assert.deepEqual(supportPresets(2500), [2500, 5000, 12500, 25000]);
  assert.deepEqual(supportPresets(1255), [1255, 2510, 6275, 12550]);
  assert.deepEqual(supportPresets(MAX_SUPPORT_PESEWAS), [MAX_SUPPORT_PESEWAS]);
  assert.deepEqual(supportPresets(0), [100, 200, 500, 1000]);
});
