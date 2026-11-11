import { useRef, useState } from "react";
import { ArrowUpRight, Download, Upload, RotateCcw } from "lucide-react";
import { TerrainMap } from "./TerrainMap";
import { SkylineComparison } from "./SkylineComparison";
import { LocalizationResult } from "./LocalizationResult";
import { EvaluationPanel } from "./EvaluationPanel";
import {
  demoDataset,
  lunarDistance,
  rankProfiles,
  validateDataset,
} from "../../lib/localization";
import type { Dataset, MatchResult } from "../../lib/localization";
export function Dashboard() {
  const [dataset, setDataset] = useState<Dataset>(demoDataset);
  const [result, setResult] = useState<MatchResult | null>(null);
  const [selected, setSelected] = useState("");
  const [reveal, setReveal] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Ready for profile comparison.");
  const [errors, setErrors] = useState<number[]>([]);
  const input = useRef<HTMLInputElement>(null);
  const evaluated = useRef(new Set<string>());
  const candidate =
    result?.candidates.find((c) => c.id === selected) ??
    (selected ? dataset.references.find((r) => r.id === selected) : undefined);
  const chosen = candidate
    ? {
        ...candidate,
        score:
          "score" in candidate && typeof candidate.score === "number"
            ? candidate.score
            : 0,
      }
    : undefined;
  function run() {
    const start = performance.now();
    const candidates = rankProfiles(dataset);
    const processingMs = performance.now() - start;
    setResult({ candidates, processingMs });
    setSelected(candidates[0].id);
    setReveal(false);
    setStatus(
      `Compared ${candidates.length} profiles. ${candidates[0].id} has the lowest RMSE.`,
    );
  }
  async function importFile(file: File) {
    setError("");
    try {
      if (file.size > 10 * 1024 * 1024)
        throw new Error("Dataset must be smaller than 10 MB.");
      const d = validateDataset(JSON.parse(await file.text()));
      setDataset(d);
      setResult(null);
      setSelected("");
      setReveal(false);
      setStatus(
        `Loaded ${d.name}. ${d.references.length} reference profiles ready.`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to read dataset.");
    }
  }
  function revealTruth() {
    setReveal(true);
    const position = result?.candidates[0].position;
    const key = JSON.stringify(dataset);
    if (position && dataset.groundTruth && !evaluated.current.has(key)) {
      setErrors((values) => [
        ...values,
        lunarDistance(position, dataset.groundTruth!),
      ]);
      evaluated.current.add(key);
    }
  }
  function download() {
    const data = {
      dataset: dataset.name,
      source: dataset.source,
      synthetic: !!dataset.synthetic,
      method: "Aligned elevation-profile RMSE; heading must be known",
      result,
      groundTruth: reveal ? dataset.groundTruth : null,
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "lunatrail-comparison.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <section className="dashboard" id="system">
      <div className="section-kicker">
        <span>MISSION CONTROL</span>
        <span>
          <i className="status-dot" /> LOCAL PROTOTYPE
        </span>
      </div>
      <div className="system-heading">
        <div>
          <h2>
            LunaTrail system<span> / 01</span>
          </h2>
          <p>One horizon. A field of possible locations.</p>
        </div>
        <button className="primary-button" onClick={run}>
          Run skyline match <ArrowUpRight size={16} />
        </button>
      </div>
      <div className="system-toolbar">
        <div>
          <span className="micro">DATASET</span>
          <strong>{dataset.name}</strong>
          <span className="dataset-badge">
            {dataset.synthetic ? "ILLUSTRATIVE DATA" : "IMPORTED PROFILES"}
          </span>
        </div>
        <div className="toolbar-actions">
          <button onClick={() => input.current?.click()}>
            <Upload size={13} /> Import profiles
          </button>
          <button disabled={!result} onClick={download}>
            <Download size={13} /> Export result
          </button>
          <button
            aria-label="Reset to illustrative dataset"
            onClick={() => {
              setDataset(demoDataset);
              setResult(null);
              setReveal(false);
              setSelected("");
              setStatus("Illustrative dataset restored.");
              setError("");
            }}
          >
            <RotateCcw size={13} />
          </button>
        </div>
        <input
          hidden
          ref={input}
          type="file"
          accept="application/json,.json"
          onChange={(e) => {
            if (e.target.files?.[0]) void importFile(e.target.files[0]);
            e.target.value = "";
          }}
        />
      </div>
      <p className="dataset-note">
        {dataset.source}.{" "}
        {dataset.synthetic
          ? "Profiles are synthetic; lunar positions and accuracy metrics are unavailable."
          : "Source is supplied by the dataset author; provenance is not independently verified."}
      </p>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="dashboard-grid">
        <TerrainMap
          dataset={dataset}
          candidate={chosen}
          reveal={reveal}
          onSelect={setSelected}
        />
        <LocalizationResult
          result={result}
          selected={chosen}
          onSelect={setSelected}
        />
        <SkylineComparison dataset={dataset} candidate={chosen} />
        <EvaluationPanel
          dataset={dataset}
          result={result}
          reveal={reveal}
          onReveal={revealTruth}
          errors={errors}
        />
      </div>
      <div className="system-status">
        <span role="status">{status}</span>
        <a href="/example-profiles.json" download>
          Dataset format <ArrowUpRight size={12} />
        </a>
      </div>
      <details className="method-details">
        <summary>
          Method & limitations <span>+</span>
        </summary>
        <p>
          Import aligned skyline elevation arrays sampled at the same increasing
          azimuths. LunaTrail ranks references by root-mean-square elevation
          error. The lowest-error reference supplies the estimated position;
          this score is not a calibrated probability.
        </p>
        <p>
          This browser prototype assumes known heading and matching camera
          geometry. It does not ingest raw DEM rasters, correct image
          distortion, resolve heading, or provide operational navigation.
          Terrain elevation data and a skyline-rendering backend are required
          for a validated lunar experiment. The map is a schematic coordinate
          plot; it is not a NASA DEM raster.
        </p>
      </details>
    </section>
  );
}
