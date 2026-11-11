import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import gsap from "gsap";
import { clamp, motion, scenes } from "../../config/scenes";
import type { MediaConfig } from "../../config/scenes";
import { heroRegions } from "../../lib/framing";
export type MediaHandle = { draw: (p: number) => void };
export const CinematicMedia = forwardRef<
  MediaHandle,
  {
    config: MediaConfig;
    images: (HTMLImageElement | null)[];
    onVideoReady: () => void;
    onVideoError: () => void;
  }
>(function CinematicMedia({ config, images, onVideoReady, onVideoError }, ref) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const p = useRef(0);
  const last = useRef("");
  const drawRef = useRef<(p: number) => void>(() => {});
  const [size, setSize] = useState({ w: 0, h: 0 });
  useImperativeHandle(
    ref,
    () => ({
      draw: (value) => {
        p.current = value;
        drawRef.current(value);
      },
    }),
    [],
  );
  useEffect(() => {
    const host = (canvas.current || video.current)?.parentElement;
    if (!host) return;
    const resize = () => setSize({ w: host.clientWidth, h: host.clientHeight });
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (config.mode === "video") {
      let current = video.current?.currentTime || 0;
      const tick = () => {
        const v = video.current;
        if (!v || !Number.isFinite(v.duration) || v.seeking) return;
        const target = p.current * Math.max(0, v.duration - 0.035);
        current +=
          (target - current) *
          (1 - Math.pow(1 - motion.videoLerp, gsap.ticker.deltaRatio()));
        if (Math.abs(target - current) < 0.015) current = target;
        if (Math.abs(v.currentTime - current) > 0.018) v.currentTime = current;
      };
      gsap.ticker.add(tick);
      drawRef.current = (value) => {
        p.current = value;
      };
      return () => gsap.ticker.remove(tick);
    }
    const c = canvas.current,
      ctx = c?.getContext("2d", { alpha: false });
    if (!c || !ctx || !size.w) return;
    const dpr = Math.min(devicePixelRatio || 1, motion.maxDpr);
    c.width = Math.round(size.w * dpr);
    c.height = Math.round(size.h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    last.current = "";
    // Align the interactive HTML hit target with the arrow already in the art.
    const hero = images[7];
    if (config.mode === "storyboard" && config.heroHasText && hero && size.w > 760) {
      const {source:s,destination:d}=heroRegions(hero.naturalWidth,hero.naturalHeight,size.w,size.h)[0];
      const host=c.parentElement;
      host?.style.setProperty("--hero-arrow-x", `${d.x+(hero.naturalWidth*.08-s.x)/s.w*d.w}px`);
      host?.style.setProperty("--hero-arrow-y", `${d.y+(hero.naturalHeight*.867-s.y)/s.h*d.h}px`);
    }
    const paint = (
      img: HTMLImageElement,
      opacity: number,
      zoom: number,
      sceneIndex: number,
    ) => {
      ctx.globalAlpha = opacity;
      if (
        config.mode === "storyboard" &&
        sceneIndex === 7 &&
        config.heroHasText
      ) {
        for (const { source: s, destination: d } of heroRegions(
          img.naturalWidth,
          img.naturalHeight,
          size.w,
          size.h,
        )) {
          ctx.drawImage(img, s.x, s.y, s.w, s.h, d.x, d.y, d.w, d.h);
        }
        return;
      }
      if (config.mode === "storyboard" && sceneIndex === 2 && size.w <= 760) {
        const fit = Math.min(
          size.w / img.naturalWidth,
          size.h / img.naturalHeight,
        );
        const w = img.naturalWidth * fit,
          h = img.naturalHeight * fit;
        ctx.drawImage(img, (size.w - w) / 2, (size.h - h) / 2, w, h);
        return;
      }
      const ratio =
        Math.max(size.w / img.naturalWidth, size.h / img.naturalHeight) * zoom;
      const w = img.naturalWidth * ratio,
        h = img.naturalHeight * ratio;
      ctx.globalAlpha = opacity;
      ctx.drawImage(img, (size.w - w) / 2, (size.h - h) / 2, w, h);
    };
    drawRef.current = (value) => {
      const sequence = config.mode === "image-sequence";
      const index = sequence
        ? Math.round(value * (images.length - 1))
        : value >= 1
          ? 7
          : Math.max(
              0,
              scenes.findIndex((s) => value < s.end),
            );
      const scene = scenes[Math.min(index, 7)];
      const local = clamp((value - scene.start) / (scene.end - scene.start));
      const mix =
        sequence || index === 7
          ? 0
          : clamp((value - (scene.end - motion.crossfade)) / motion.crossfade);
      const zoom = sequence
        ? 1
        : scene.scale[0] + (scene.scale[1] - scene.scale[0]) * local;
      const key = sequence
        ? String(index)
        : `${index}-${mix.toFixed(3)}-${zoom.toFixed(4)}`;
      if (key === last.current) return;
      last.current = key;
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#020407";
      ctx.fillRect(0, 0, size.w, size.h);
      const img = images[index];
      if (img) paint(img, 1, zoom, index);
      if (mix > 0 && images[index + 1]) {
        // A fitted hero does not cover every pixel. Fade the prior shot to black
        // before compositing it so no rover/sky pixels remain in the margins.
        if (
          config.mode === "storyboard" &&
          index + 1 === 7 &&
          config.heroHasText
        ) {
          ctx.globalAlpha = mix;
          ctx.fillStyle = "#020407";
          ctx.fillRect(0, 0, size.w, size.h);
        }
        paint(images[index + 1]!, mix, scenes[index + 1].scale[0], index + 1);
      }
      ctx.globalAlpha = 1;
    };
    drawRef.current(p.current);
  }, [config, images, size]);
  return config.mode === "video" ? (
    <video
      className="cinematic-media"
      ref={video}
      src={config.src}
      poster={config.poster}
      muted
      playsInline
      preload="auto"
      onLoadedData={onVideoReady}
      onError={onVideoError}
      aria-hidden="true"
    />
  ) : (
    <canvas ref={canvas} className="cinematic-media" aria-hidden="true" />
  );
});
