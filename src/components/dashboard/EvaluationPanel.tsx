import type { Dataset, MatchResult } from "../../lib/localization";
import { lunarDistance } from "../../lib/localization";
import { formatPosition } from "./LocalizationResult";
export function EvaluationPanel({
  dataset,
  result,
  reveal,
  onReveal,
  errors,
}: {
  dataset: Dataset;
  result: MatchResult | null;
  reveal: boolean;
  onReveal: () => void;
  errors: number[];
}) {
  const best = result?.candidates[0];
  const error =
    best?.position && dataset.groundTruth
      ? lunarDistance(best.position, dataset.groundTruth)
      : null;
  const sorted = [...errors].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length
    ? sorted.length % 2
      ? sorted[mid]
      : (sorted[mid - 1] + sorted[mid]) / 2
    : null;
  return (
    <section className="evaluation panel">
      <div className="panel-heading">
        <h3>
          <span>04</span> Evaluation
        </h3>
        <span className="micro">{errors.length} EVALUATED TESTS</span>
      </div>
      <div className="evaluation-row">
        <span>Predicted coordinates</span>
        <strong>{formatPosition(best?.position)}</strong>
      </div>
      <div className="evaluation-row">
        <span>Ground truth</span>
        <strong>
          {reveal ? formatPosition(dataset.groundTruth) : "Not revealed"}
        </strong>
      </div>
      <div className="evaluation-row">
        <span>Localization error</span>
        <strong>
          {reveal && error !== null ? `${error.toFixed(1)} m` : "—"}
        </strong>
      </div>
      <div className="evaluation-row">
        <span>Median / maximum error</span>
        <strong>
          {median !== null
            ? `${median.toFixed(1)} / ${Math.max(...errors).toFixed(1)} m`
            : "— / —"}
        </strong>
      </div>
      <div className="evaluation-row">
        <span>Processing time</span>
        <strong>{result ? `${result.processingMs.toFixed(2)} ms` : "—"}</strong>
      </div>
      <button
        className="text-button"
        disabled={!result || !dataset.groundTruth || reveal}
        onClick={onReveal}
      >
        {reveal
          ? "GROUND TRUTH REVEALED"
          : dataset.groundTruth
            ? "REVEAL GROUND TRUTH ↗"
            : "GROUND TRUTH NOT PROVIDED"}
      </button>
      <p className="fine-print">
        Lunar great-circle distance. Session statistics include one revealed
        test per imported dataset. No deployment accuracy is implied.
      </p>
    </section>
  );
}
