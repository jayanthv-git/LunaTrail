import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validateDataset,
  rankProfiles,
  lunarDistance,
  demoDataset,
} from "../src/lib/localization.ts";
import { sceneOpacity, scenes } from "../src/config/scenes.ts";
test("closest profile wins regardless of reference order", () => {
  const d = {
    name: "known",
    source: "test",
    azimuth: [0, 1, 2, 3, 4, 5, 6, 7],
    unknown: [1, 2, 3, 4, 5, 6, 7, 8],
    references: [
      { id: "far", values: [8, 7, 6, 5, 4, 3, 2, 1] },
      {
        id: "exact",
        values: [1, 2, 3, 4, 5, 6, 7, 8],
        position: { lat: -89, lon: 20 },
      },
    ],
  };
  const result = rankProfiles(validateDataset(d));
  assert.equal(result[0].id, "exact");
  assert.equal(result[0].score, 0);
  assert.deepEqual(result[0].position, { lat: -89, lon: 20 });
});
test("malformed data is rejected before matching", () => {
  assert.throws(() => validateDataset({ ...demoDataset, unknown: [1, 2] }));
  assert.throws(() =>
    validateDataset({
      ...demoDataset,
      references: [
        {
          id: "bad",
          values: demoDataset.unknown,
          position: { lat: 91, lon: 0 },
        },
      ],
    }),
  );
  assert.throws(() =>
    validateDataset({
      ...demoDataset,
      azimuth: demoDataset.azimuth.map(() => 0),
    }),
  );
  assert.throws(() =>
    validateDataset({
      ...demoDataset,
      references: [demoDataset.references[0], demoDataset.references[0]],
    }),
  );
  assert.throws(() =>
    validateDataset({
      ...demoDataset,
      unknown: demoDataset.unknown.map(() => Infinity),
    }),
  );
});
test("lunar distance uses lunar radius and wraps antimeridian", () => {
  assert.equal(lunarDistance({ lat: 0, lon: 0 }, { lat: 0, lon: 0 }), 0);
  assert.ok(
    Math.abs(
      lunarDistance({ lat: 0, lon: 0 }, { lat: 0, lon: 90 }) -
        (Math.PI * 1737400) / 2,
    ) < 1e-6,
  );
  assert.ok(lunarDistance({ lat: 0, lon: 179 }, { lat: 0, lon: -179 }) < 61000);
});
test("synthetic sample does not invent positions", () => {
  assert.equal(demoDataset.synthetic, true);
  assert.ok(rankProfiles(demoDataset).every((c) => !c.position));
  assert.equal(demoDataset.groundTruth, undefined);
});
test("all scenes cover the timeline without gaps", () => {
  assert.equal(scenes[0].start, 0);
  assert.equal(scenes[7].end, 1);
  for (let i = 1; i < scenes.length; i++)
    assert.equal(scenes[i].start, scenes[i - 1].end);
});
test("overlay visibility is reversible and final frame holds", () => {
  const samples = [0, 0.04, 0.19, 0.35, 0.49, 0.63, 0.76, 0.87, 0.97, 1];
  const first = samples.map((p) => scenes.map((_, i) => sceneOpacity(p, i)));
  const reverse = [...samples]
    .reverse()
    .map((p) => scenes.map((_, i) => sceneOpacity(p, i)))
    .reverse();
  assert.deepEqual(first, reverse);
  assert.equal(sceneOpacity(1, 7), 1);
  assert.equal(sceneOpacity(0, 0), 1);
});
