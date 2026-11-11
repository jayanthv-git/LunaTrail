export type Coordinate = { lat: number; lon: number };
export type Profile = { id: string; values: number[]; position?: Coordinate };
export type Dataset = {
  name: string;
  source: string;
  azimuth: number[];
  unknown: number[];
  references: Profile[];
  groundTruth?: Coordinate;
  synthetic?: boolean;
};
export type Candidate = {
  id: string;
  score: number;
  position?: Coordinate;
  values: number[];
};
export type MatchResult = { candidates: Candidate[]; processingMs: number };
function validCoordinate(v: unknown): v is Coordinate {
  if (!v || typeof v !== "object") return false;
  const c = v as Coordinate;
  return (
    Number.isFinite(c.lat) &&
    Math.abs(c.lat) <= 90 &&
    Number.isFinite(c.lon) &&
    Math.abs(c.lon) <= 180
  );
}
export function validateDataset(value: unknown): Dataset {
  if (!value || typeof value !== "object")
    throw new Error("Expected a JSON dataset object.");
  const d = value as Dataset;
  const valid = (a: unknown): a is number[] =>
    Array.isArray(a) &&
    a.length >= 8 &&
    a.length <= 4096 &&
    a.every((v) => typeof v === "number" && Number.isFinite(v));
  if (
    typeof d.name !== "string" ||
    typeof d.source !== "string" ||
    !valid(d.azimuth) ||
    !valid(d.unknown) ||
    d.azimuth.length !== d.unknown.length
  )
    throw new Error(
      "Provide name, source, and equally sized azimuth and unknown arrays (8–4096 finite samples).",
    );
  if (d.azimuth.some((v, i) => i > 0 && v <= d.azimuth[i - 1]))
    throw new Error("Azimuth values must be strictly increasing.");
  if (
    !Array.isArray(d.references) ||
    d.references.length === 0 ||
    d.references.length > 1000
  )
    throw new Error("Provide between 1 and 1000 reference profiles.");
  if (
    d.unknown.some((v) => Math.abs(v) > 90) ||
    d.references.some(
      (r) =>
        Array.isArray(r?.values) &&
        r.values.some((v) => typeof v === "number" && Math.abs(v) > 90),
    )
  )
    throw new Error("Skyline elevations must be between -90 and 90 degrees.");
  if (d.synthetic !== undefined && typeof d.synthetic !== "boolean")
    throw new Error("The synthetic flag must be a boolean.");
  const ids = new Set();
  for (const r of d.references) {
    if (
      !r ||
      typeof r.id !== "string" ||
      ids.has(r.id) ||
      !valid(r.values) ||
      r.values.length !== d.unknown.length
    )
      throw new Error(
        "Each reference needs a unique id and a profile matching the unknown sample count.",
      );
    ids.add(r.id);
    if (r.position && !validCoordinate(r.position))
      throw new Error(
        "Reference coordinates must be valid lunar latitude / longitude.",
      );
  }
  if (d.groundTruth && !validCoordinate(d.groundTruth))
    throw new Error("Ground truth must be valid lunar latitude / longitude.");
  return d;
}
export function rankProfiles(dataset: Dataset): Candidate[] {
  return dataset.references
    .map((r) => ({
      id: r.id,
      position: r.position,
      values: r.values,
      score: Math.sqrt(
        r.values.reduce((sum, v, i) => sum + (v - dataset.unknown[i]) ** 2, 0) /
          r.values.length,
      ),
    }))
    .sort((a, b) => a.score - b.score);
}
export function lunarDistance(a: Coordinate, b: Coordinate) {
  const r = Math.PI / 180,
    dl = (b.lat - a.lat) * r,
    dn = (b.lon - a.lon) * r;
  const h =
    Math.sin(dl / 2) ** 2 +
    Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dn / 2) ** 2;
  return 2 * 1737400 * Math.asin(Math.sqrt(Math.min(1, h)));
}
export const demoDataset: Dataset = {
  name: "Horizon study 01",
  source: "Synthetic illustration · not NASA terrain",
  synthetic: true,
  azimuth: Array.from({ length: 121 }, (_, i) => i * 1.5),
  unknown: Array.from(
    { length: 121 },
    (_, i) =>
      12 +
      4 * Math.sin(i * 0.07) +
      2 * Math.sin(i * 0.21) +
      0.7 * Math.cos(i * 0.64),
  ),
  references: Array.from({ length: 9 }, (_, k) => ({
    id: `REF-${String(k + 1).padStart(3, "0")}`,
    values: Array.from(
      { length: 121 },
      (_, i) =>
        12 +
        4 * Math.sin(i * 0.07 + k * 0.045) +
        2 * Math.sin(i * 0.21 + k * 0.03) +
        0.7 * Math.cos(i * 0.64) +
        0.2 * Math.sin(i * 0.9 + k),
    ),
  })),
};
