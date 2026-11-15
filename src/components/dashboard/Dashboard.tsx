import { useEffect, useState } from "react";
import { ImportedDashboard } from "./ImportedDashboard";
import { SkylineComparison } from "./SkylineComparison";
import { LocalizationResult } from "./LocalizationResult";
import { api, waitJob } from "../../lib/api";
import type {
  TerrainDataset,
  Index,
  Observation,
  Result,
  Reveal,
  Evaluation,
} from "../../lib/api";
export function Dashboard() {
  const [imported, setImported] = useState(false),
    [terrain, setTerrain] = useState<TerrainDataset>(),
    [index, setIndex] = useState<Index>(),
    [obs, setObs] = useState<Observation>(),
    [result, setResult] = useState<Result>(),
    [truth, setTruth] = useState<Reveal>(),
    [evaluation, setEvaluation] = useState<Evaluation>();
  const [busy, setBusy] = useState(false),
    [status, setStatus] = useState("Connecting to local terrain service…"),
    [error, setError] = useState(""),
    [selected, setSelected] = useState(""),
    [seed, setSeed] = useState(42),
    [noise, setNoise] = useState(0),
    [mode, setMode] = useState("unknown");
  async function task(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Backend unavailable");
      setStatus("Action failed. Retry after checking backend.");
    } finally {
      setBusy(false);
    }
  }
  async function load() {
    await task(async () => {
      const ds = await api<TerrainDataset[]>("/datasets");
      if (!ds.length) throw new Error("No dataset available");
      setTerrain(ds[0]);
      setStatus(
        "Real NASA LOLA terrain ready. Build or reuse the reference index.",
      );
    });
  }
  useEffect(() => {
    void load();
  }, []);
  const chosen =
    result?.candidates.find((c) => c.id === selected) ?? result?.candidates[0];
  const bounds = terrain?.active_bounds ?? [-1, -1, 1, 1];
  const xy = (p: { x: number; y: number }) => ({
    x: 40 + ((p.x - bounds[0]) / (bounds[2] - bounds[0])) * 320,
    y: 350 - ((p.y - bounds[1]) / (bounds[3] - bounds[1])) * 320,
  });
  return (
    <>
      <section className="dashboard" id="system">
        <div className="section-kicker">
          <span>MISSION CONTROL</span>
          <span>LOCAL DEM SIMULATION</span>
        </div>
        <div className="system-heading">
          <div>
            <h2>
              LunaTrail system<span> / 01</span>
            </h2>
            <p>Real lunar terrain. A hidden viewpoint. A measured result.</p>
          </div>
          <button
            onClick={() => setImported(!imported)}
            className="text-button"
          >
            {imported
              ? "Close imported profiles"
              : "Imported / illustrative profiles ↗"}
          </button>
        </div>
        <div className="system-toolbar">
          <div>
            <span className="micro">NASA LOLA · 80 M / PIXEL</span>
            <strong>South-pole DEM experiment</strong>
            <span className="dataset-badge">
              REAL DEM · SIMULATED OBSERVATION
            </span>
          </div>
          <button disabled={busy} onClick={() => void load()}>
            Retry connection
          </button>
        </div>
        <p className="dataset-note">
          Rendered from actual elevations. Shared-DEM simulation is an
          optimistic benchmark and does not validate real camera photographs.
        </p>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="system-toolbar" style={{ flexWrap: "wrap", gap: 16 }}>
          <label>
            Seed{" "}
            <input
              aria-label="Experiment seed"
              type="number"
              min="0"
              max="4294967295"
              value={seed}
              disabled={busy}
              onChange={(e) => setSeed(Number(e.target.value))}
            />
          </label>
          <label>
            Heading{" "}
            <select
              aria-label="Heading mode"
              value={mode}
              disabled={busy}
              onChange={(e) => setMode(e.target.value)}
            >
              <option value="unknown">Unknown</option>
              <option value="known">Known (0°)</option>
            </select>
          </label>
          <label>
            Noise σ (°){" "}
            <input
              aria-label="Angular noise"
              type="number"
              min="0"
              max="2"
              step="0.05"
              value={noise}
              disabled={busy}
              onChange={(e) => setNoise(Number(e.target.value))}
            />
          </label>
          <button
            disabled={busy || !terrain}
            onClick={() =>
              void task(async () => {
                const r = await api<{ index_id: string; job_id?: string }>(
                  "/indexes",
                  {},
                );
                if (r.job_id) await waitJob(r.job_id, setStatus);
                const idx = await api<Index>(`/indexes/${r.index_id}`);
                setIndex(idx);
                setStatus(
                  `${idx.count} candidates · ${idx.build_seconds.toFixed(2)} s build · ${(idx.artifact.bytes / 1024).toFixed(0)} KiB`,
                );
              })
            }
          >
            1. Build / reuse index
          </button>
          <button
            disabled={busy || !index}
            onClick={() =>
              void task(async () => {
                setObs(undefined);
                setResult(undefined);
                setTruth(undefined);
                setSelected("");
                setObs(
                  await api<Observation>("/experiments", {
                    index_id: index!.id,
                    seed,
                    mode,
                    noise,
                  }),
                );
                setStatus(
                  "Held-out observation generated. Ground truth is private on the server.",
                );
              })
            }
          >
            2. New hidden experiment
          </button>
          <button
            className="primary-button"
            disabled={busy || !obs}
            onClick={() =>
              void task(async () => {
                const r = await api<Result>("/localizations", {
                  experiment_id: obs!.id,
                });
                setResult(r);
                setSelected(r.candidates[0].id);
                setStatus(
                  `Searched ${r.searched} candidates in ${r.processingMs.toFixed(2)} ms`,
                );
              })
            }
          >
            3. Run localization ↗
          </button>
        </div>
        <div className="dashboard-grid">
          <section className="terrain panel">
            <div className="panel-heading">
              <h3>
                <span>01</span> Terrain map
              </h3>
              <span className="micro">PROJECTED METERS · +Y ↑</span>
            </div>
            <svg
              viewBox="0 0 400 390"
              style={{ width: "100%", maxHeight: 420 }}
              role="img"
              aria-label="Real lunar elevation raster with candidate positions"
            >
              {terrain && (
                <image
                  href={`/api/v1/datasets/${terrain.id}/preview.png`}
                  x="40"
                  y="30"
                  width="320"
                  height="320"
                  preserveAspectRatio="none"
                />
              )}
              {index?.points.map((p) => {
                const q = xy(p);
                return (
                  <circle key={p.id} cx={q.x} cy={q.y} r="1.4" fill="#b0c8d5" />
                );
              })}
              {chosen &&
                (() => {
                  const p = xy(chosen.position);
                  return (
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r="5"
                      stroke="#79cfff"
                      strokeWidth="2"
                      fill="none"
                    />
                  );
                })()}
              {truth &&
                (() => {
                  const p = xy(truth.true_position);
                  return (
                    <path
                      d={`M${p.x - 6} ${p.y}h12 M${p.x} ${p.y - 6}v12`}
                      stroke="white"
                      strokeWidth="2"
                    />
                  );
                })()}
              <text x="40" y="374" fill="#a3b4c1" fontSize="10">
                X {bounds[0].toFixed(0)} … {bounds[2].toFixed(0)} m
              </text>
              <text x="40" y="18" fill="#a3b4c1" fontSize="10">
                Y {bounds[1].toFixed(0)} … {bounds[3].toFixed(0)} m
              </text>
            </svg>
            <div className="map-legend">
              <span>• Candidate grid</span>
              <span>○ Selected prediction</span>
              <span>+ {truth ? "Truth revealed" : "Truth hidden"}</span>
            </div>
          </section>
          <div>
            <LocalizationResult
              result={result ?? null}
              selected={chosen}
              onSelect={setSelected}
            />
            {result && (
              <p className="dataset-note">
                Heading {result.candidates[0].heading.toFixed(1)}° clockwise
                from grid +Y · best–second gap {result.score_gap_deg.toFixed(4)}
                ° (not confidence). X/Y{" "}
                {result.candidates[0].position.x.toFixed(0)},{" "}
                {result.candidates[0].position.y.toFixed(0)} m.
              </p>
            )}
          </div>
          {obs ? (
            <SkylineComparison
              dataset={{
                name: "DEM observation",
                source: "NASA LOLA",
                azimuth: obs.observed.map(
                  (_, i) => (i * 360) / obs.observed.length,
                ),
                unknown: obs.observed,
                references: [],
              }}
              candidate={chosen}
            />
          ) : (
            <section className="skyline panel">
              <p className="empty-message">
                Generate an experiment to view its skyline.
              </p>
            </section>
          )}
          <section className="evaluation panel">
            <div className="panel-heading">
              <h3>
                <span>04</span> Reveal & evaluation
              </h3>
            </div>
            <button
              className="text-button"
              disabled={busy || !result || !!truth}
              onClick={() =>
                void task(async () => {
                  setTruth(
                    await api<Reveal>(`/experiments/${obs!.id}/reveal`, {}),
                  );
                  setStatus(
                    "Ground truth revealed. Error is projected Euclidean distance in meters.",
                  );
                })
              }
            >
              4. Reveal ground truth ↗
            </button>
            {truth && (
              <>
                <div className="evaluation-row">
                  <span>Position error</span>
                  <strong>{truth.position_error_m.toFixed(1)} m</strong>
                </div>
                <div className="evaluation-row">
                  <span>Heading error</span>
                  <strong>{truth.heading_error_deg.toFixed(1)}°</strong>
                </div>
                <div className="evaluation-row">
                  <span>Nearest-candidate baseline</span>
                  <strong>{truth.nearest_candidate_m.toFixed(1)} m</strong>
                </div>
                <p className="fine-print">
                  Truth X/Y: {truth.true_position.x.toFixed(1)},{" "}
                  {truth.true_position.y.toFixed(1)} m ·{" "}
                  {truth.true_position.lat.toFixed(5)}°,{" "}
                  {truth.true_position.lon.toFixed(5)}°
                </p>
              </>
            )}
            <button
              className="text-button"
              disabled={busy || !index}
              onClick={() =>
                void task(async () => {
                  const r = await api<{
                    evaluation_id: string;
                    job_id: string;
                  }>("/evaluations", {
                    index_id: index!.id,
                    seed,
                    mode,
                    noise,
                    trials: 20,
                  });
                  await waitJob(r.job_id, setStatus);
                  setEvaluation(
                    await api<Evaluation>(`/evaluations/${r.evaluation_id}`),
                  );
                  setStatus("20 held-out trials completed and persisted.");
                })
              }
            >
              5. Evaluate 20 trials ↗
            </button>
            {evaluation && (
              <>
                <p className="dataset-note">
                  Mean / median / P90: {evaluation.position_m?.mean.toFixed(1)}{" "}
                  / {evaluation.position_m?.median.toFixed(1)} /{" "}
                  {evaluation.position_m?.p90.toFixed(1)} m. Failed:{" "}
                  {evaluation.failed}/20. Mean heading error:{" "}
                  {evaluation.heading_deg?.mean.toFixed(2)}°. Match:{" "}
                  {evaluation.runtime_ms?.mean.toFixed(2)} ms.
                </p>
                <p className="fine-print">
                  Success ≤640 m:{" "}
                  {((evaluation.success_rates["640"] ?? 0) * 100).toFixed(0)}% ·
                  nearest-grid baseline{" "}
                  {evaluation.nearest_candidate_m?.mean.toFixed(1)} m.
                </p>
                <a
                  href={`/api/v1/evaluations/${evaluation.id}/export?format=json`}
                  download
                >
                  Export JSON ↗
                </a>{" "}
                ·{" "}
                <a
                  href={`/api/v1/evaluations/${evaluation.id}/export?format=csv`}
                  download
                >
                  Export CSV ↗
                </a>
              </>
            )}
            {obs && result && (
              <p>
                <a href={`/api/v1/experiments/${obs.id}/export`} download>
                  Export localization JSON ↗
                </a>
              </p>
            )}
          </section>
        </div>
        <div className="system-status">
          <span role="status">
            {busy ? "Working · " : ""}
            {status}
          </span>
          <a href="http://127.0.0.1:8000/docs" target="_blank" rel="noreferrer">
            API docs ↗
          </a>
        </div>
        <details className="method-details">
          <summary>
            Method & limitations <span>+</span>
          </summary>
          <p>
            Bilinear terrain samples every 80 m to a fixed 4 km radius; 1.5 m
            observer height; lunar spherical curvature correction. Full 360°
            skylines at 1° spacing. Azimuth and heading increase clockwise from
            projected +Y. Unknown-heading matching searches circular shifts
            using angular RMSE. Reference spacing is 640 m. Every observation is
            held out from the reference grid.
          </p>
          <p>
            The finite-radius skyline omits distant terrain. Shared terrain,
            idealized camera geometry, discretized heading and an 80 m DEM make
            this an optimistic research demonstration. Negative elevation angles
            are retained. No calibrated confidence or real-camera accuracy is
            claimed.
          </p>
        </details>
      </section>
      {imported && <ImportedDashboard />}
    </>
  );
}
