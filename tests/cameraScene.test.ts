import test from 'node:test';
import assert from 'node:assert/strict';
import {cameraHorizon, cameraTexturePosition, skylineAt} from '../src/mission/cameraScene.ts';

test('camera samples interpolate the active profile and wrap across north', () => {
  assert.equal(skylineAt([0, 10, 20, 30], 45), 5);
  assert.equal(skylineAt([0, 10, 20, 30], 315), 15);
  assert.equal(skylineAt([0, 10, 20, 30], -45), 15);
  assert.equal(skylineAt([0, 10, 20, 30], 360), 0);
});

test('camera horizon tracks data changes and repeats at the same direction', () => {
  const profile = Array.from({length: 360}, (_, i) => 10 + Math.sin(i * Math.PI / 180) * 5);
  const original = [...profile];
  const north = cameraHorizon(profile, 0, 101, 100);
  assert.deepEqual(north, cameraHorizon(profile, 360, 101, 100));
  assert.notDeepEqual(north, cameraHorizon(profile, 90, 101, 100));
  const edited = [...profile]; edited[0] += 10;
  assert.ok(cameraHorizon(edited, 0, 101, 100)[50] < north[50]);
  assert.deepEqual(profile, original);
});

test('camera auto framing keeps extreme valid manual horizons visible', () => {
  for (const profile of [Array(180).fill(-90), Array(720).fill(90), [-90, 90, -90, 90]]) {
    for (const y of cameraHorizon(profile, 359, 1000, 500)) {
      assert.ok(Number.isFinite(y) && y >= 0 && y <= 500);
    }
  }
});

test('surface texture wraps in bounds with a smooth edge blend', () => {
  for (let direction = -360; direction <= 720; direction++) {
    const {primary, secondary, blend} = cameraTexturePosition(direction, .125);
    assert.ok(primary >= 0 && primary <= 1);
    assert.ok(secondary >= 0 && secondary <= 1);
    assert.ok(blend >= 0 && blend <= 1);
  }
  assert.deepEqual(cameraTexturePosition(0, .125), cameraTexturePosition(360, .125));
  const before = cameraTexturePosition(180 - 1e-6, 0);
  const after = cameraTexturePosition(180, 0);
  assert.ok(before.blend > .99999);
  assert.ok(Math.abs(before.secondary - after.primary) < 1e-6);
});
