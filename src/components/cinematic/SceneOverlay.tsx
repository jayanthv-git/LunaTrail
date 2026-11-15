import { ArrowDown } from "lucide-react";
import { scenes } from "../../config/scenes";
import { navigate } from "../../config/navigation";
export function SceneOverlay({
  index,
  bakedHero = false,
  staticScene = false,
}: {
  index: number;
  bakedHero?: boolean;
  staticScene?: boolean;
}) {
  const scene = scenes[index];
  return (
    <div
      className={`scene-overlay scene-${scene.placement} ${bakedHero && index === 7 ? "baked-copy" : ""}`}
      data-scene={index}
      aria-hidden={staticScene ? false : index !== 0}
    >
      <div className="scene-copy">
        <p className="eyebrow">{scene.eyebrow}</p>
        {index === 7 ? (
          <h1 className="chrome-title">LUNATRAIL</h1>
        ) : (
          <h2>{scene.title}</h2>
        )}
        {scene.detail && <p className="scene-detail">{scene.detail}</p>}
      </div>
      {index === 0 && (
        <div className="begin-hint">
          <span>SCROLL TO BEGIN YOUR JOURNEY</span>
          <ArrowDown size={16} />
        </div>
      )}
      {index === 3 && (
        <div className="target-reticle" aria-hidden="true">
          <span>+</span>
          <small>LUNAR REFERENCE FRAME</small>
        </div>
      )}
      {index === 5 && (
        <div className="terrain-meta">
          <p>
            TERRAIN SOURCE <strong>NASA DEM</strong>
          </p>
          <p>
            NAVIGATION <strong>SKYLINE-BASED</strong>
          </p>
        </div>
      )}
      {index === 6 && (
        <div className="process-annotations">
          {[
            "Map terrain",
            "Render skylines",
            "Match profile",
            "Estimate location",
          ].map((label, i) => (
            <span key={label}>
              <small>0{i + 1}</small>
              {label}
            </span>
          ))}
        </div>
      )}
      {index === 7 && (
        <button
          className="hero-down"
          onClick={() => navigate("#technology")}
          aria-label="Discover the technology"
        >
          <ArrowDown size={27} />
        </button>
      )}
    </div>
  );
}
