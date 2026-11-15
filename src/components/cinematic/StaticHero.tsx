import { useEffect, useRef } from "react";
import type { MediaConfig } from "../../config/scenes";
import { CinematicMedia } from "./CinematicMedia";
import type { MediaHandle } from "./CinematicMedia";
import { HeroNavigation } from "./HeroNavigation";
const noop = () => {};
export function StaticHero({
  config,
  images,
}: {
  config: MediaConfig;
  images: (HTMLImageElement | null)[];
}) {
  const ref = useRef<MediaHandle>(null);
  useEffect(() => {
    ref.current?.draw(1);
  }, [config, images]);
  return (
    <>
      <CinematicMedia
        ref={ref}
        config={config}
        images={images}
        onVideoReady={noop}
        onVideoError={noop}
      />
      <HeroNavigation />
    </>
  );
}
