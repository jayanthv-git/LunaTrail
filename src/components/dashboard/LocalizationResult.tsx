import type { MatchResult, Candidate } from "../../lib/localization";
export function formatPosition(position?: { lat: number; lon: number }) {
  return position
    ? `${position.lat.toFixed(5)}°, ${position.lon.toFixed(5)}°`
    : "—";
}
export function LocalizationResult({
  result,
  selected,
  onSelect,
}: {
  result: MatchResult | null;
  selected?: Candidate;
  onSelect: (id: string) => void;
}) {
  return (
    <section className="localization panel" id="results">
      <div className="panel-heading">
        <h3>
          <span>03</span> Localization result
        </h3>
        <span className="micro">
          {result ? "COMPARISON COMPLETE" : "AWAITING MATCH"}
        </span>
      </div>
      <div className="position-result">
        <span className="micro">BEST ESTIMATED POSITION · LAT / LON</span>
        <p>{formatPosition(result?.candidates[0].position)}</p>
        <span>
          {result
            ? result.candidates[0].position
              ? "Lowest profile error among supplied references."
              : "Coordinates unavailable for illustrative profiles."
            : "Run a profile comparison to estimate a location."}
        </span>
      </div>
      <div className="result-metrics">
        <div>
          <span>PROFILE RMSE</span>
          <strong>
            {result ? result.candidates[0].score.toFixed(3) : "—"}{" "}
            <small>deg</small>
          </strong>
        </div>
        <div>
          <span>PROCESSING TIME</span>
          <strong>
            {result ? result.processingMs.toFixed(2) : "—"} <small>ms</small>
          </strong>
        </div>
      </div>
      <div className="candidate-table">
        <div className="candidate-heading">
          <span>RANK / CANDIDATE</span>
          <span>RMSE ↓</span>
        </div>
        {result ? (
          result.candidates.slice(0, 5).map((c, i) => (
            <button
              key={c.id}
              className={selected?.id === c.id ? "selected" : ""}
              onClick={() => onSelect(c.id)}
            >
              <span>
                <small>0{i + 1}</small>
                {c.id}
                {i === 0 && <em>BEST MATCH</em>}
              </span>
              <span>{c.score.toFixed(3)}°</span>
            </button>
          ))
        ) : (
          <p className="empty-message">Candidate rankings will appear here.</p>
        )}
      </div>
    </section>
  );
}
