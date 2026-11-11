# LunaTrail

React + Vite + TypeScript + Tailwind CSS + GSAP ScrollTrigger. Native scrolling drives one sticky, reversible eight-scene journey, followed by the technology story and interactive mission dashboard.

## Start

```sh
npm install
npm run dev
npm run build
npm test
```

## Original artwork

The eight original PNGs from `photos.zip` are bundled in `public/media/` and load automatically for all visitors. They are byte-for-byte copies of the supplied files. No substitute artwork is used.

1. `01-earth.png` — dark Earth orbit
2. `02-sunrise.png` — closer Earth sunrise
3. `03-translunar.png` — Earth receding, Moon ahead
4. `04-approach.png` — rapid Moon approach
5. `05-orbit.png` — close lunar orbit
6. `06-terrain.png` — terrain with topographic data
7. `07-rover.png` — rover with navigation overlays
8. `08-hero.png` — final LunaTrail composition

The existing contour and scanning graphics are retained without duplicate HUD layers. The final reference includes typography and a navbar inside the image. On desktop, the renderer crops away the baked navbar and fits the remaining composition beneath the working HTML navigation. Duplicate title/supporting copy remains available semantically but is visually hidden. On mobile, source windows from the original sky and rover/terrain are composed behind the responsive HTML title and supporting copy. These are runtime viewport crops; the original PNG is unchanged. The translunar image is fitted in portrait view to keep both Earth and Moon visible.

Media settings still allow local storyboard, frame-sequence, or video overrides. These persist in IndexedDB only in that browser. Reset media restores the bundled originals. For a clean final render without baked text, set `heroHasText: false`. Truly independent rover/terrain parallax requires transparent separated layers, which were not supplied. The storyboard renderer uses camera transforms and cross-dissolves; it does not fabricate continuous in-between camera frames.

## Media modes

All timing lives in `src/config/scenes.ts`, including scene boundaries, blend intervals, text envelopes, final hold, scroll lengths, and easing parameters. The desktop journey is 960vh; mobile is 600vh.

```ts
// Existing original storyboard paths:
{ mode: 'storyboard', sources: storyboardSources, heroHasText: true }
// Real sequential render frames, already ordered:
{ mode: 'image-sequence', sources: ['/frames/0001.webp', '/frames/0002.webp'], heroHasText: false }
// Seek-optimized, browser-compatible video:
{ mode: 'video', src: '/media/journey.mp4', poster: '/media/01-earth.png', heroHasText: false }
```

Canvas frames use cover cropping and devicePixelRatio capped at 2. A frame key avoids redundant drawing. The storyboard transforms smoothly with scroll; rendered sequences select their frame directly. React does not receive per-frame state updates. Images preload before the scroll timeline becomes active. Use appropriately compressed, display-sized frames; a long full-resolution sequence can exceed browser memory. Local preview imports are limited to 350 MB. Prefer a compressed, densely keyframed MP4 for long sequences on memory-constrained devices.

Video is paused and scroll-controlled. A GSAP ticker interpolates toward the target time, avoids seeking while a seek is outstanding, and cleans up when unmounted. Encode with short keyframe intervals (ideally all-intra for best seeking) and fast-start metadata. Actual seek performance depends on the supplied asset and device and is unverified without a video.

Reduced-motion users receive static sequential articles. Canvas content is decorative; the story exists in semantic HTML. Navigation, chapters, map controls, candidate selection, import dialogs, and dashboard actions support keyboard use.

## Dashboard and data contract

The initial dataset is explicitly **synthetic illustration**, not NASA DEM data. It contains no lunar coordinates or ground truth. Run skyline match calculates actual RMSE and actual local processing duration for those synthetic arrays. Location/error metrics remain unavailable.

Download `public/example-profiles.json` from the dashboard for the JSON structure. Replace the illustrative arrays with actual aligned profiles; optionally add `position: {lat, lon}` to each reference and `groundTruth: {lat, lon}` to the dataset. Samples are elevations in degrees at the corresponding increasing azimuth values in degrees. Coordinates use lunar latitude/longitude in degrees.

The imported source string is author-provided and not independently verified. Import validation rejects nonfinite/mismatched data, invalid coordinates, duplicate reference IDs, more than 1000 references, more than 4096 samples, and files above 10 MB.

The matching algorithm is aligned profile RMSE; it does not solve heading or camera calibration. The best reference's coordinates are the estimate. Ground truth is revealed separately. Evaluation uses a spherical Moon radius of 1,737,400 m; median and maximum include unique revealed datasets in the current session. Exports contain computed results and only revealed ground truth.

No NASA DEM ingestion, image skyline extraction, scientific validation, or operational navigation backend is claimed. The map is a schematic coordinate plot with explicitly illustrative contour lines. Raw DEM raster rendering and test-viewpoint imagery require additional data/services.

## Verification

`npm test` verifies profile ranking, input rejection, lunar distance, synthetic-data labeling, timeline coverage, and reversible overlay values. `npm run build` performs strict TypeScript checking and the production build.

Browser QA is not verified: the managed environment exposes no `cua_repl.js` browser-control tool. The Sites managed-preview instructions prohibit an alternate browser-control path in this state. Desktop/mobile/ultrawide visual inspection, actual media scrubbing, and frame-rate testing remain outstanding.
