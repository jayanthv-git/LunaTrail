import type { Candidate, MatchResult } from "./localization";
export type Position = { x: number; y: number; lat: number; lon: number };
export type TerrainDataset = {
  id: string;
  active_bounds: number[];
  resolution: number[];
  active_shape: number[];
};
export type Index = {
  id: string;
  count: number;
  build_seconds: number;
  artifact: { bytes: number };
  points: (Position & { id: string })[];
  parameters: { spacing: number };
  usable_bounds: number[];
};
export type Observation = {
  id: string;
  observed: number[];
  mode: string;
  geometry: { samples: number };
  limitation: string;
};
export type Result = Omit<MatchResult, "candidates"> & {
  candidates: (Candidate & { heading: number; position: Position })[];
  score_gap_deg: number;
  searched: number;
};
export type Reveal = {
  true_position: Position;
  predicted_position: Position;
  position_error_m: number;
  heading_error_deg: number;
  nearest_candidate_m: number;
  limitation: string;
};
export type Evaluation = {
  id: string;
  failed: number;
  position_m: { mean: number; median: number; p90: number } | null;
  heading_deg: { mean: number } | null;
  runtime_ms: { mean: number } | null;
  success_rates: Record<string, number>;
  nearest_candidate_m: { mean: number } | null;
};
export async function api<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(
    `/api/v1${path}`,
    body === undefined
      ? undefined
      : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
  );
  const data = await response
    .json()
    .catch(() => ({
      error: {
        message: "Backend unavailable. Start npm run dev:all and retry.",
      },
    }));
  if (!response.ok)
    throw new Error(
      data.error?.message || `Request failed (${response.status})`,
    );
  return data as T;
}
export async function waitJob(
  id: string,
  onProgress: (s: string) => void,
): Promise<void> {
  for (;;) {
    const j = await api<{ status: string; progress: number; error?: string }>(
      `/jobs/${id}`,
    );
    onProgress(`${j.status} · ${Math.round(j.progress * 100)}%`);
    if (j.status === "complete") return;
    if (["failed", "interrupted"].includes(j.status))
      throw new Error(j.error || j.status);
    await new Promise((r) => setTimeout(r, 500));
  }
}
