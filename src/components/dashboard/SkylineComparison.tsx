import type { Dataset, Candidate } from "../../lib/localization";
export function SkylineComparison({
  dataset,
  candidate,
}: {
  dataset: Dataset;
  candidate?: Candidate;
}) {
  const all = [...dataset.unknown, ...(candidate?.values || [])];
  const min = Math.min(...all) - 2,
    max = Math.max(...all) + 2;
  const points = (values: number[]) =>
    values
      .map(
        (v, i) =>
          `${40 + (i / (values.length - 1)) * 680},${190 - ((v - min) / (max - min)) * 150}`,
      )
      .join(" ");
  return (
    <section className="skyline panel">
      <div className="panel-heading">
        <h3>
          <span>02</span> Skyline matching
        </h3>
        <span className="micro">ELEVATION / AZIMUTH</span>
      </div>
      <svg
        viewBox="0 0 760 235"
        role="img"
        aria-label="Unknown skyline and selected reference elevation profiles"
      >
        <defs>
          <linearGradient id="graph-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#79cfff" stopOpacity=".12" />
            <stop offset="100%" stopColor="#79cfff" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3].map((i) => (
          <g key={i}>
            <path
              d={`M40 ${40 + i * 50} H720`}
              stroke="#20272e"
              strokeDasharray="2 6"
            />
            <text x="4" y={44 + i * 50}>
              {(max - (i * (max - min)) / 3).toFixed(0)}°
            </text>
          </g>
        ))}
        {[0, 1, 2, 3, 4].map((i) => (
          <g key={i}>
            <path d={`M${40 + i * 170} 30 V190`} stroke="#171d24" />
            <text x={40 + i * 170} y="218" textAnchor="middle">
              {
                dataset.azimuth[
                  Math.round((i / 4) * (dataset.azimuth.length - 1))
                ]
              }
              °
            </text>
          </g>
        ))}
        <polygon
          points={`40,190 ${points(dataset.unknown)} 720,190`}
          fill="url(#graph-fill)"
        />
        <polyline
          points={points(dataset.unknown)}
          fill="none"
          stroke="#88cbe9"
          strokeWidth="1.7"
        />
        {candidate && (
          <polyline
            points={points(candidate.values)}
            fill="none"
            stroke="#ecf2f5"
            strokeWidth="1.2"
            strokeDasharray="4 4"
          />
        )}
      </svg>
      <div className="graph-legend">
        <span>
          <i />
          Unknown skyline
        </span>
        <span>
          <i className="reference" />
          {candidate ? candidate.id : "Reference — run matching"}
        </span>
        <span>{dataset.unknown.length} SAMPLES</span>
      </div>
    </section>
  );
}
