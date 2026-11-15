import { useState } from "react";
import { Plus, Minus, RotateCcw } from "lucide-react";
import type { Dataset, Candidate } from "../../lib/localization";
export function TerrainMap({
  dataset,
  candidate,
  reveal,
  onSelect,
}: {
  dataset: Dataset;
  candidate?: Candidate;
  reveal: boolean;
  onSelect: (id: string) => void;
}) {
  const [zoom, setZoom] = useState(1);
  const coords = dataset.references.flatMap((r) =>
    r.position ? [r.position] : [],
  );
  if (dataset.groundTruth) coords.push(dataset.groundTruth);
  const latMin = Math.min(...coords.map((c) => c.lat)),
    latMax = Math.max(...coords.map((c) => c.lat));
  const lonMin = Math.min(...coords.map((c) => c.lon)),
    lonMax = Math.max(...coords.map((c) => c.lon));
  const position = (lat: number, lon: number) => ({
    x: 80 + ((lon - lonMin) / (lonMax - lonMin || 1)) * 500,
    y: 300 - ((lat - latMin) / (latMax - latMin || 1)) * 220,
  });
  return (
    <section className="terrain panel">
      <div className="panel-heading">
        <h3>
          <span>01</span> Terrain map
        </h3>
        <span className="micro">
          {coords.length
            ? "LOCAL COORDINATE EXTENT"
            : "SCHEMATIC / NO DEM LOADED"}
        </span>
      </div>
      <div className="map-container">
        <svg
          viewBox="0 0 680 380"
          role="img"
          aria-label="Reference viewpoints on a schematic terrain grid, not a measured elevation map"
        >
          <defs>
            <pattern
              id="map-grid"
              width="34"
              height="34"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M34 0H0V34"
                fill="none"
                stroke="#1a252d"
                strokeWidth=".6"
              />
            </pattern>
            <radialGradient id="map-vignette">
              <stop stopColor="#101a22" />
              <stop offset="1" stopColor="#06090c" />
            </radialGradient>
          </defs>
          <rect width="680" height="380" fill="url(#map-vignette)" />
          <rect width="680" height="380" fill="url(#map-grid)" />
          <g
            transform={`translate(340 190) scale(${zoom}) translate(-340 -190)`}
          >
            {Array.from({ length: 13 }, (_, i) => (
              <path
                key={i}
                d={`M${-70 + i * 8} ${320 - i * 16} C${100 + i * 5} ${330 - i * 25},${120 + i * 18} ${70 - i * 9},${310 + i * 7} ${130 - i * 8} S${500 + i * 12} ${340 - i * 22},${760 + i * 6} ${180 - i * 12}`}
                fill="none"
                stroke="#314452"
                strokeWidth=".7"
                opacity=".5"
              />
            ))}
            {dataset.references.map((r, i) => {
              const pos = r.position
                ? position(r.position.lat, r.position.lon)
                : { x: 130 + (i % 3) * 190, y: 90 + Math.floor(i / 3) * 105 };
              return (
                <g
                  key={r.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`Select reference ${r.id}`}
                  className="map-point"
                  onClick={() => onSelect(r.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelect(r.id);
                    }
                  }}
                >
                  <circle cx={pos.x} cy={pos.y} r="16" fill="transparent" />
                  {candidate?.id === r.id && (
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r="13"
                      fill="none"
                      stroke="#79cfff"
                      strokeWidth=".8"
                    />
                  )}
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r="3"
                    fill={candidate?.id === r.id ? "#79cfff" : "#87919b"}
                  />
                  <text x={pos.x + 12} y={pos.y + 4}>
                    {r.id}
                  </text>
                </g>
              );
            })}
            {reveal &&
              dataset.groundTruth &&
              (() => {
                const p = position(
                  dataset.groundTruth.lat,
                  dataset.groundTruth.lon,
                );
                return (
                  <g>
                    <path
                      d={`M${p.x - 7} ${p.y}h14 M${p.x} ${p.y - 7}v14`}
                      stroke="#fff"
                    />
                    <text x={p.x + 12} y={p.y - 10}>
                      GROUND TRUTH
                    </text>
                  </g>
                );
              })()}
          </g>
          <text x="24" y="30">
            N ↑
          </text>
          <text x="24" y="357">
            {coords.length
              ? "COORDINATE PLOT · NO ELEVATION RASTER"
              : "ILLUSTRATIVE TOPOGRAPHY · NOT TO SCALE"}
          </text>
        </svg>
        <div className="map-controls">
          <button
            aria-label="Zoom in"
            onClick={() => setZoom((z) => Math.min(2, z + 0.25))}
          >
            <Plus size={15} />
          </button>
          <button
            aria-label="Zoom out"
            onClick={() => setZoom((z) => Math.max(0.75, z - 0.25))}
          >
            <Minus size={15} />
          </button>
          <button aria-label="Reset map view" onClick={() => setZoom(1)}>
            <RotateCcw size={13} />
          </button>
        </div>
      </div>
      <div className="map-legend">
        <span>
          <i />
          Reference viewpoint
        </span>
        <span>
          <i className="blue" />
          Selected candidate
        </span>
        <span>+ Ground truth {reveal ? "revealed" : "hidden"}</span>
      </div>
    </section>
  );
}
