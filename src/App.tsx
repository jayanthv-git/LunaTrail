import { useEffect, useState } from "react";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { CinematicExperience } from "./components/cinematic/CinematicExperience";
import { Dashboard } from "./components/dashboard/Dashboard";
import { MediaSettings } from "./components/ui/MediaSettings";
import { Logo } from "./components/ui/Logo";
import { useReducedMotion } from "./hooks/useReducedMotion";
import { defaultMedia } from "./config/scenes";
import type { MediaConfig } from "./config/scenes";
import { releaseMedia } from "./lib/mediaStore";
import { navigate } from "./config/navigation";
export default function App() {
  const [media, setMedia] = useState<MediaConfig>(defaultMedia);
  const [settings, setSettings] = useState(false);
  const reduced = useReducedMotion();
  useEffect(() => () => releaseMedia(media), [media]);
  return (
    <>
      <a className="skip-link" href="#system">
        Skip to LunaTrail system
      </a>
      <main>
        <CinematicExperience
          key={
            media.mode + (media.mode === "video" ? media.src : media.sources[0])
          }
          config={media}
          reduced={reduced}
          onConfigure={() => setSettings(true)}
        />
        <section className="technology editorial-section" id="technology">
          <div className="section-kicker">
            <span>01 / THE TECHNOLOGY</span>
            <span>TERRAIN AS A SIGNAL</span>
          </div>
          <div className="technology-layout">
            <h2>
              A familiar horizon.
              <br />
              <span>An unfamiliar world.</span>
            </h2>
            <div>
              <p>
                On Earth, we look to satellites for our position. On the Moon,
                LunaTrail explores a different reference: the landscape itself.
              </p>
              <p>
                Every viewpoint reveals a distinctive skyline. By comparing that
                outline with profiles derived from lunar elevation data, we can
                investigate where an observer might be.
              </p>
              <a
                className="text-link"
                href="#workflow"
                onClick={(e) => {
                  e.preventDefault();
                  navigate("#workflow");
                }}
              >
                FOLLOW THE GEOMETRY <ArrowDown size={15} />
              </a>
            </div>
          </div>
          <div
            className="horizon-diagram"
            aria-label="Illustration of a skyline converted into an elevation profile"
          >
            <svg
              viewBox="0 0 1200 210"
              role="img"
              aria-label="Illustrative terrain horizon"
            >
              <defs>
                <linearGradient id="ridge" x1="0" y1="0" x2="0" y2="1">
                  <stop stopColor="#8c969d" stopOpacity=".15" />
                  <stop offset="1" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M0 160 70 145 98 155 170 105 205 120 260 85 290 110 345 50 385 75 430 65 485 105 530 120 590 88 650 108 700 65 730 90 780 110 840 50 875 75 910 58 960 110 1020 130 1060 98 1130 140 1200 120V210H0Z"
                fill="url(#ridge)"
              />
              <path
                d="M0 160 70 145 98 155 170 105 205 120 260 85 290 110 345 50 385 75 430 65 485 105 530 120 590 88 650 108 700 65 730 90 780 110 840 50 875 75 910 58 960 110 1020 130 1060 98 1130 140 1200 120"
                fill="none"
                stroke="#87b9d4"
                strokeWidth="1"
              />
              {[170, 345, 590, 840, 1060].map((x, i) => (
                <g key={x}>
                  <path
                    d={`M${x} 25V190`}
                    stroke="#79cfff"
                    strokeOpacity=".2"
                    strokeDasharray="2 5"
                  />
                  <text x={x + 8} y="30">
                    P.0{i + 1}
                  </text>
                </g>
              ))}
            </svg>
            <div>
              <span>OBSERVED GEOMETRY</span>
              <span>ILLUSTRATIVE HORIZON PROFILE</span>
              <span>REFERENCE SIGNATURE</span>
            </div>
          </div>
        </section>
        <section className="workflow editorial-section" id="workflow">
          <div className="section-kicker">
            <span>02 / THE WORKFLOW</span>
            <span>FROM ELEVATION TO LOCATION</span>
          </div>
          <div className="workflow-heading">
            <h2>
              The landscape is
              <br />
              the reference.
            </h2>
            <p>
              No positioning constellation.
              <br />A new way to read the terrain.
            </p>
          </div>
          <ol className="workflow-steps">
            {[
              {
                title: "Map terrain",
                body: "Start with a region of NASA lunar digital elevation data.",
                note: "INPUT / ELEVATION",
              },
              {
                title: "Render skylines",
                body: "Generate horizon profiles from known reference viewpoints.",
                note: "MODEL / GEOMETRY",
              },
              {
                title: "Match profile",
                body: "Compare an unknown skyline against aligned reference profiles.",
                note: "COMPARE / SIGNATURE",
              },
              {
                title: "Estimate location",
                body: "Rank the candidates, then evaluate against a known position.",
                note: "OUTPUT / HYPOTHESIS",
              },
            ].map((s, i) => (
              <li key={s.title}>
                <div>
                  <span>0{i + 1}</span>
                  <ArrowUpRight size={16} />
                </div>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
                <small>{s.note}</small>
              </li>
            ))}
          </ol>
          <div className="research-note">
            <span>RESEARCH, IN PROGRESS.</span>
            <p>
              LunaTrail is a proof-of-concept for terrain-derived localization.
              Performance depends on terrain, profile quality, viewpoint
              coverage, and camera geometry. It is not a deployment-ready GPS
              replacement.
            </p>
          </div>
        </section>
        <Dashboard />
      </main>
      <footer>
        <div className="footer-top">
          <a className="brand" href="#overview">
            <Logo />
            <span>LUNATRAIL</span>
          </a>
          <p>
            The next frontier needs
            <br />a different point of reference.
          </p>
          <a
            className="text-link"
            href="#overview"
            onClick={(e) => {
              e.preventDefault();
              navigate("#overview");
            }}
          >
            BACK TO EARTH <ArrowUpRight size={15} />
          </a>
        </div>
        <div className="footer-bottom">
          <span>LUNATRAIL / LUNAR NAVIGATION PROOF-OF-CONCEPT</span>
          <button onClick={() => setSettings(true)}>
            Cinematic media settings ↗
          </button>
          <span>BUILT TO EXPLORE.</span>
        </div>
      </footer>
      {settings && (
        <MediaSettings
          onClose={() => setSettings(false)}
          onApply={(value) => setMedia(value || defaultMedia)}
        />
      )}
    </>
  );
}
