export type Rect = { x: number; y: number; w: number; h: number };
export type DrawRegion = { source: Rect; destination: Rect };

/** Cover a target rectangle without distorting the original source region. */
export function coverRegion(source: Rect, target: Rect): DrawRegion {
  const ratio = Math.max(target.w / source.w, target.h / source.h);
  const w = target.w / ratio,
    h = target.h / ratio;
  return {
    source: {
      x: source.x + (source.w - w) / 2,
      y: source.y + (source.h - h) / 2,
      w,
      h,
    },
    destination: target,
  };
}

/** Preserve the reference's title on desktop; use clean source windows on mobile. */
export function heroRegions(
  imageW: number,
  imageH: number,
  viewW: number,
  viewH: number,
): DrawRegion[] {
  if (viewW <= 760) {
    return [
      coverRegion(
        { x: 0, y: imageH * 0.09, w: imageW, h: imageH * 0.18 },
        { x: 0, y: viewH * 0.1, w: viewW, h: viewH * 0.13 },
      ),
      coverRegion(
        { x: 0, y: imageH * 0.58, w: imageW, h: imageH * 0.21 },
        { x: 0, y: viewH * 0.48, w: viewW, h: viewH * 0.28 },
      ),
      coverRegion(
        { x: 0, y: imageH * 0.89, w: imageW, h: imageH * 0.11 },
        { x: 0, y: viewH * 0.76, w: viewW, h: viewH * 0.24 },
      ),
    ];
  }
  const source = { x: 0, y: imageH * 0.085, w: imageW, h: imageH * 0.915 };
  const top = Math.min(96, viewH * 0.12),
    bottom = 46;
  const ratio = Math.min(viewW / source.w, (viewH - top - bottom) / source.h);
  const w = source.w * ratio,
    h = source.h * ratio;
  return [
    {
      source,
      destination: {
        x: (viewW - w) / 2,
        y: top + (viewH - top - bottom - h) / 2,
        w,
        h,
      },
    },
  ];
}
