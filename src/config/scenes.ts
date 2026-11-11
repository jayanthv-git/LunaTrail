export const scenes = [
  {
    id: "earthIntro",
    start: 0,
    end: 0.13,
    name: "Earth orbit",
    image: "/media/01-earth.png",
    eyebrow: "01 / THE POINT OF DEPARTURE",
    title: "Every journey\nbegins somewhere.",
    detail: "A new frontier awaits.",
    placement: "intro",
    scale: [1, 1.035],
  },
  {
    id: "earthDeparture",
    start: 0.13,
    end: 0.28,
    name: "Departure",
    image: "/media/02-sunrise.png",
    eyebrow: "02 / BEYOND THE FAMILIAR",
    title: "But beyond Earth,\nnavigation becomes\na different challenge.",
    detail: "",
    placement: "left",
    scale: [1, 1.07],
  },
  {
    id: "translunarJourney",
    start: 0.28,
    end: 0.42,
    name: "Translunar coast",
    image: "/media/03-translunar.png",
    eyebrow: "03 / TRANSLUNAR COAST",
    title: "No GPS.\nNo towers.\nNo positioning infrastructure.",
    detail: "",
    placement: "telemetry",
    scale: [1.06, 1],
  },
  {
    id: "moonApproach",
    start: 0.42,
    end: 0.56,
    name: "Lunar approach",
    image: "/media/04-approach.png",
    eyebrow: "04 / LUNAR APPROACH",
    title: "",
    detail: "DESTINATION: MOON",
    placement: "approach",
    scale: [1, 1.15],
  },
  {
    id: "lunarDescent",
    start: 0.56,
    end: 0.7,
    name: "Lunar descent",
    image: "/media/05-orbit.png",
    eyebrow: "05 / A NEW FRAME OF REFERENCE",
    title: "The Moon has no GPS.\nSo we look to the horizon.",
    detail: "",
    placement: "left",
    scale: [1, 1.09],
  },
  {
    id: "terrainIntelligence",
    start: 0.7,
    end: 0.82,
    name: "Terrain intelligence",
    image: "/media/06-terrain.png",
    eyebrow: "06 / TERRAIN INTELLIGENCE",
    title: "The horizon\nbecomes the map.",
    detail: "Terrain-derived skyline localization\nusing lunar elevation data.",
    placement: "left",
    scale: [1.04, 1],
  },
  {
    id: "roverNavigation",
    start: 0.82,
    end: 0.92,
    name: "Surface navigation",
    image: "/media/07-rover.png",
    eyebrow: "07 / SURFACE NAVIGATION",
    title: "Position from the\ngeometry of the horizon.",
    detail: "No satellite signal.",
    placement: "rover",
    scale: [1.04, 1],
  },
  {
    id: "lunatrailReveal",
    start: 0.92,
    end: 1,
    name: "LunaTrail",
    image: "/media/08-hero.png",
    eyebrow: "[ GPS FOR A WORLD THAT HAS NONE ]",
    title: "LUNATRAIL",
    detail:
      "Navigate the lunar unknown.\nFind your position through\nthe geometry of the horizon.",
    placement: "hero",
    scale: [1, 1],
  },
] as const;
export const motion = {
  desktopVh: 960,
  mobileVh: 600,
  hold: 0.045,
  scrub: 0.7,
  crossfade: 0.025,
  textIn: 0.19,
  textOut: 0.83,
  videoLerp: 0.16,
  maxDpr: 2,
};
export function clamp(v: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, v));
}
export function sceneAt(p: number) {
  return p >= 1
    ? 7
    : Math.max(
        0,
        scenes.findIndex((s) => p < s.end),
      );
}
export function sceneOpacity(p: number, index: number) {
  const s = scenes[index];
  if (index === 0)
    return clamp(
      (scenes[0].end - p) /
        ((scenes[0].end - scenes[0].start) * (1 - motion.textOut)),
    );
  const span = s.end - s.start;
  const local = (p - s.start) / span;
  return (
    clamp(local / motion.textIn) *
    (index === 7 ? 1 : clamp((1 - local) / (1 - motion.textOut)))
  );
}
export type MediaConfig =
  | { mode: "storyboard"; sources: string[]; heroHasText: boolean }
  | { mode: "image-sequence"; sources: string[]; heroHasText: boolean }
  | { mode: "video"; src: string; poster?: string; heroHasText: boolean };
// Original PNG artwork from photos.zip, preserved without alteration.
export const storyboardSources = scenes.map((s) => s.image);
export const defaultMedia: MediaConfig = {
  mode: "storyboard",
  sources: storyboardSources,
  heroHasText: true,
};
