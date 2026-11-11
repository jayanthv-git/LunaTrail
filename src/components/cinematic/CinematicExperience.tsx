import { useCallback, useEffect, useRef, useState } from "react";
import { CinematicMedia } from "./CinematicMedia";
import type { MediaHandle } from "./CinematicMedia";
import { SceneOverlay } from "./SceneOverlay";
import { StaticHero } from "./StaticHero";
import { HeroNavigation } from "./HeroNavigation";
import { MissionLoader } from "./MissionLoader";
import { useMediaPreloader } from "../../hooks/useMediaPreloader";
import { useScrollTimeline } from "../../hooks/useScrollTimeline";
import { scenes, motion } from "../../config/scenes";
import type { CSSProperties } from "react";
import type { MediaConfig } from "../../config/scenes";
const noSources: string[] = [];
export function CinematicExperience({
  config,
  reduced,
  onConfigure,
}: {
  config: MediaConfig;
  reduced: boolean;
  onConfigure: () => void;
}) {
  const root = useRef<HTMLElement>(null);
  const media = useRef<MediaHandle>(null);
  const {
    images,
    progress,
    ready: imagesReady,
  } = useMediaPreloader(config.mode === "video" ? noSources : config.sources);
  const [videoReady, setVideoReady] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const ready =
    config.mode === "video"
      ? reduced || videoReady || videoFailed
      : imagesReady;
  const available =
    config.mode === "video"
      ? reduced
        ? Boolean(config.poster)
        : !videoFailed
      : images.some(Boolean);
  const draw = useCallback((p: number) => media.current?.draw(p), []);
  useScrollTimeline(root, ready, reduced, draw);
  useEffect(() => {
    if (ready) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [ready]);
  useEffect(() => {
    if (config.mode !== "video" || videoReady || reduced) return;
    const timer = setTimeout(() => setVideoFailed(true), 20000);
    return () => clearTimeout(timer);
  }, [config, videoReady, reduced]);
  const baked =
    config.heroHasText &&
    (config.mode === "video" ? available : Boolean(images[images.length - 1]));
  const representative = (index: number) =>
    config.mode === "image-sequence"
      ? images[
          Math.round(
            ((scenes[index].start + scenes[index].end) / 2) *
              (images.length - 1),
          )
        ]?.src
      : config.mode === "video"
        ? config.poster
        : images[index]?.src;
  return (
    <>
      <MissionLoader
        progress={config.mode === "video" ? (ready ? 100 : 25) : progress}
        ready={ready}
      />
      <section
        id="overview"
        ref={root}
        style={
          {
            "--journey-desktop": `${motion.desktopVh}vh`,
            "--journey-mobile": `${motion.mobileVh}vh`,
          } as CSSProperties
        }
        className={`cinematic-experience ${reduced ? "reduced" : ""}`}
        aria-label="Earth to the Moon: the LunaTrail journey"
      >
        <div className="cinematic-viewport">
          <HeroNavigation />
          {!reduced && (
            <CinematicMedia
              ref={media}
              config={config}
              images={images}
              onVideoReady={() => {
                setVideoReady(true);
                setVideoFailed(false);
              }}
              onVideoError={() => setVideoFailed(true)}
            />
          )}
          <div className="cinematic-shade" />
          {reduced ? (
            <div className="static-scenes">
              {scenes.map((s, i) => (
                <article key={s.id} data-static-scene={i}>
                  {i === 7 && config.mode === "storyboard" && baked ? (
                    <StaticHero config={config} images={images} />
                  ) : (
                    representative(i) && (
                      <img
                        src={representative(i)}
                        alt={s.name}
                        loading="lazy"
                      />
                    )
                  )}
                  <SceneOverlay index={i} bakedHero={baked} staticScene />
                </article>
              ))}
            </div>
          ) : (
            scenes.map((s, i) => (
              <SceneOverlay key={s.id} index={i} bakedHero={baked} />
            ))
          )}
          {ready && !available && (
            <button onClick={onConfigure} className="media-missing">
              REFERENCE MEDIA AWAITING IMPORT{" "}
              <span>Load your storyboard ↗</span>
            </button>
          )}
          {!reduced && (
            <div className="journey-footer">
              <span className="chapter-current">01 / Earth orbit</span>
              <div className="chapter-controls" aria-label="Journey chapters">
                {scenes.map((s, i) => (
                  <button
                    key={s.id}
                    data-chapter={i}
                    className={i === 0 ? "active" : ""}
                    aria-label={`Chapter ${i + 1}: ${s.name}`}
                    onClick={() =>
                      root.current?.dispatchEvent(
                        new CustomEvent("chapter-jump", { detail: i }),
                      )
                    }
                  >
                    <span />
                  </button>
                ))}
              </div>
              <span className="journey-tag">A LUNAR NAVIGATION EXPERIMENT</span>
            </div>
          )}
          <div className="journey-progress">
            <i />
          </div>
        </div>
      </section>
    </>
  );
}
