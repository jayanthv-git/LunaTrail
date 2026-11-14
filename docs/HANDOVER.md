> GitHub publication note (2026-11-14): This snapshot was prepared from the active local application in a fresh clone of `jayanthv-git/LunaTrail`, based on commit `5022faf`. The local folders were preserved. Session history below describes the earlier local development state. For a fresh clone, follow `README.md` / `START-HERE.txt`; `.env`, runtime databases, virtual environments, dependencies, builds and scratch artifacts are excluded. The bundled NASA crop is included; the 180 MB full-source DEM is excluded. Camera imagery is illustrative AI-generated artwork.

# LunaTrail — verified continuation handover
14 November 2026

The existing application was repaired in place at `/Users/jayanthv/Desktop/lunatrail 2`. No reset, clone-overwrite, commit, push, or remote alteration occurred. This folder has no `.git`; local branch/status/history cannot be provided. GitHub main was inspected read-only: latest commit `5022faf`, preceded by `671dd18`. The local eight-page mission UI is newer. Original source/configuration and mission/preferences snapshots are preserved in this chat's `work/session-baseline`.

## Open and start
The final updated demo is running at **http://127.0.0.1:5187/**, dashboard **http://127.0.0.1:5187/dashboard**, API docs **http://127.0.0.1:8017/docs**. It uses separate `work/demo-state`; the original `backend/var` mission store remains available.

Reproduce the current demo after stopping its existing launcher:

```sh
cd "/Users/jayanthv/Desktop/lunatrail 2"
LUNATRAIL_STATE=work/demo-state LUNATRAIL_API_PORT=8017 LUNATRAIL_WEB_PORT=5187 npm run dev:all
```

Normal startup using original saved state and default ports:

```sh
cd "/Users/jayanthv/Desktop/lunatrail 2"
npm run dev:all
```

Default landing: http://127.0.0.1:5173/ ; dashboard: http://127.0.0.1:5173/dashboard ; API: http://127.0.0.1:8000/docs . Older processes already occupied these ports during this session. Stop their original terminal session before using them. The launcher now refuses occupied ports and returns a nonzero exit code. Ctrl+C shuts down both process groups.

Separate terminals, if needed:

```sh
# Backend (project root)
backend/.venv/bin/python -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
# Frontend (project root)
npm run dev -- --port 5173 --strictPort
```

Dependencies already exist. On a fresh machine: `npm run setup`, then `npm run prepare:terrain`, then `npm run dev:all`. Preserve the bundled data and media. `.env.example` documents DEM/state/API/web settings; shell variables take precedence. No internet is required for the prepared local demonstration.

## Architecture and pages
React 19 + TypeScript + Vite + React Router; GSAP cinematic scroll; SVG charts and canvas-rendered terrain. A shared MissionProvider connects all mission pages to FastAPI. NumPy renders and matches skyline profiles; Rasterio reads GeoTIFF; PyProj respects the raster's lunar CRS. SQLite/WAL stores research datasets, indexes, experiments, localizations, evaluations, trials and jobs; NPZ stores numerical artifacts. Atomic JSON files store mission state and preferences. A bounded worker serves the legacy research API; the mission API serializes mission mutations.

| Page | Route | Responsibility |
|---|---|---|
| Mission Dashboard | `/dashboard` | Localization, shared map/skyline/results and evaluation summary |
| Terrain Map | `/terrain` | DEM layers, zoom/pan, reference selection and terrain inspection |
| Skyline Match | `/skyline` | Select/generate held-out observation, run match, reset |
| Candidate Ranking | `/candidates` | Top/all candidates, sorting, selected profile and map navigation |
| Evaluation | `/evaluation` | All/selected tests, metrics, distribution, results, CSV/JSON |
| Dataset | `/dataset` | Metadata, GeoTIFF import, reference/test generation, demo reset, legacy importer |
| System Status | `/status` | Live component readiness and processing activity |
| Settings | `/settings` | Geometry, algorithm, rendering, persistence and evaluation parameters |

The cinematic landing remains separate at `/`.

## Changes and repaired bugs
- `src/mission/context.tsx`, `selection.ts`, `tests/selection.test.ts`: candidate selection survives refresh in session storage, scoped to reference index and observation. Fresh observations immediately clear obsolete predictions even if subsequent matching fails. Disabled storage is tolerated.
- `src/pages/SkylineMatch.tsx`, `Evaluation.tsx`: observation selectors initialize from the active observation. Evaluation charts limit crowded tick labels.
- `src/mission/candidateRows.ts`, `components.tsx`, `tests/candidates.test.ts`: sorting by ID preserves the best-scoring top-K subset instead of replacing it with the lowest IDs; sorting never mutates original rankings. Added explicit sort label and keyboard-focusable chart/table scroll areas.
- `src/mission/TerrainViewer.tsx`: rendering settings synchronize with layer state; changing DEM resets stale inspection/viewport state.
- `src/mission/Layout.tsx`, `src/styles/mission.css`: clear regeneration guidance, Escape closes navigation, navigation expansion semantics, hidden mobile navigation, scrollable short-window sidebar, readable horizontally scrollable mobile charts.
- `backend/app/mission.py`: threshold changes invalidate old evaluation metrics. Geometry combinations producing fewer than 2 or more than 2,000 references are rejected before saving or destroying the current mission.
- `backend/app/indexing.py`: serialized reference builds prevent duplicate concurrent writes; NPZ artifacts use atomic replacement.
- `backend/app/matching.py`: normalized-correlation score gaps are no longer mislabeled as degrees; the existing degree field remains valid for angular RMSE.
- `scripts/dev.py`: consistent `.env` loading through the project virtualenv, configurable web/API ports, collision detection, correct failure exit, clean process shutdown. Port checks allow immediate restart after sockets close.
- `scripts/verify_lifecycle.py`: repeatable real HTTP test through Vite, settings/results persistence across process restart, collision handling, and port release.
- `backend/tests/test_regressions.py`: evaluation validation, failed-trial metrics/export, private-truth independence, autosave, geometry/settings invalidation, concurrent builds/requests and worker restart tests.
- `package.json`, `.env.example`: explicit typecheck/lifecycle commands and documented ports.
- `README.md`, `START-HERE.txt`, `docs/HANDOVER.md`: updated start/demo guidance and this handover. Generated `dist` and TypeScript build metadata were refreshed. Verification state is under `work/`; original source data was not altered.

`session-changes.patch` captures code/config changes before the documentation update; `changed-files.json` lists those source changes. This handover additionally records documentation and generated outputs.

## Executed verification
| Command / check | Result |
|---|---|
| `npm test` | 12 passed |
| `npm run typecheck` | Passed |
| `npm run build` | Passed; 1,632 modules, production bundle generated |
| `npm run test:backend` | 20 passed; one Starlette/httpx deprecation warning |
| `npm run verify:lifecycle` | Passed: two real startups/shutdowns, HTTP proxy, persistence, collision rejection, ports released |
| Browser responsive matrix | All 8 routes at 1440×900, 1280×800, 768×1024, 390×844; 32 passes, no page-level horizontal overflow or API alerts |
| Browser scientific workflow | All/selected evaluation, reset, charts/table, second observation, match, selection/refresh/map, zoom/scale/layers, status refresh, full candidate list/sort |
| Browser settings | Save/reload; zero observer height rejected by form; geometry invalidation/regeneration; invalid combined geometry rejected by API without losing current mission |
| Browser landing | Desktop and mobile video/scroll/final Enter; dashboard transition; desktop back/forward and refresh |

There is no configured linter, so no lint pass is claimed. Browser tests were executed through the connected browser tool, not a checked-in Playwright suite. Raw responsive measurements and screenshots are included. A console error about an empty image href was observed on the earlier port-5173 build; no new error from the updated app was observed in that log check. Browser access became unavailable during the final evidence-cleanup call, so earlier saved screenshots are the visual evidence.

Browser GeoTIFF upload was blocked by the browser approval gate (permission declined). It was not retried or bypassed. API upload tests had already verified valid TIFF, malformed TIFF, content type, size limit, provenance labeling and reset. Browser file-picker completion remains unverified. Terrain inspection and drag handlers were inspected and backend coordinates tested, but the attempted browser terrain click did not provide conclusive new elevation evidence; do not count that as a completed pointer-inspection test. Reduced-motion fallback was code-reviewed, not separately browser-emulated.

## Scientific result and scope
Default settings: real NASA LOLA south-pole crop, 256×256 cells at 80 m/pixel; 400 reference viewpoints spaced 640 m; observer 1.5 m; 4 km horizon; 80 m ray spacing; 360 azimuth samples. Rays use bilinear elevation and lunar curvature. Matching uses normalized correlation by default, or angular RMSE, with optional circular heading alignment. Held-out positions are sampled continuously and kept at least 1 m from references. Matching gets profiles and geometry; truth is accessed only after prediction. Regression tests change private truth and verify predictions/scores remain unchanged.

The default eight-test browser batch measured **303.4 m median, 373.3 m mean, 744.4 m maximum**, **7/8 within 640 m**, zero failed trials. Time varies per run and hardware. `demo-evaluation.json` is the actual exported result. These are simulated observations from the same DEM, not independent camera validation; similarity is not probability. Finite horizon, coarse terrain, discrete reference spacing, idealized camera and skyline ambiguity limit accuracy. No CNN, calibrated uncertainty, hazard-routing model or camera horizon extraction is implemented. Hazards are visibly disabled.

## Demo rehearsal (about 3 minutes)
1. If preparing a fresh repeatable presentation, Dataset → Reset Demo. This resets current mission/settings to bundled defaults; historical research database records remain.
2. Open `/`, wait for the local video, scroll to the final lunar scene, click ENTER LUNATRAIL.
3. Show Mission Dashboard and Dataset source/resolution. References/test set initialize automatically.
4. Terrain Map: show reference grid, contours, hillshade, zoom and scale.
5. Skyline Match: choose T-02, Generate Test Skyline. Point out that truth and prediction are hidden.
6. Run Match. Explain the terrain-derived angular profile and circular comparison; T-02 defaults to C-78 with roughly 292.8 m error.
7. Candidate Ranking: select another ranked candidate, compare its curve, click View on Map. Refresh to demonstrate selection persistence.
8. Evaluation → Run All Tests. Show the full distribution including the 744.4 m error, not just the strongest example. Export CSV/JSON.
9. Settings → General → projected coordinates → Save Changes → refresh. Show coordinate changes on dependent pages. Restore geographic format if desired.
10. Explain geometry changes invalidate profiles; Dataset → Regenerate Profiles rebuilds them. System Status reports readiness. End with the simulation limitations above.

## API contracts
The saved `openapi.json` is the complete machine-readable request/validation contract; live `/docs` exposes interactive schemas. Existing endpoints were preserved. Responses are additionally typed in `src/mission/types.ts`; many original FastAPI responses lack formal response models.

- Mission snapshot `GET /api/mission`: dataset, index, tests (opaque IDs/labels), observation, result, truth, evaluation, settings, status.
- Terrain: metadata/grid/inspect; inspect accepts finite x/y and returns lunar position/elevation. Upload accepts raw TIFF bytes, never browser filesystem paths.
- References/tests generation use current validated preferences. `/api/skyline/generate` accepts `test_id`; `/api/localize` accepts `test_id` and a 180–720-value profile that must exactly match the held-out observation; returns ranked result and post-prediction truth.
- `/api/evaluation/run` accepts optional unique active `test_ids` (1–40), returns per-trial records plus count/failures/mean/median/max/success threshold/rate/time. Exports are JSON or CSV. Reset endpoints clear the relevant active results.
- Settings PUT accepts the full strict Preferences schema. Geometry/spacing/seed/noise/count/heading mode invalidate profiles; algorithm invalidates predictions/evaluation; threshold invalidates evaluation.
- `/api/v1` retains datasets, asynchronous index/jobs, experiments, localizations, explicit post-match reveal, evaluations and exports.
- Errors: validation 422, invalid domain operation 409, missing record 404, oversized request 413, unexpected server failure 500 with non-sensitive message. Same-origin Vite proxy; no broad CORS.

## Future improvements (not completed)
Add a maintained automated browser suite and lint configuration; expose explicit response models for every endpoint; further harden multi-client mission consistency and artifact recovery; optimize large candidate payloads; validate against independent camera observations and broader terrain/seed sets; quantify DEM/projection/camera uncertainties. Keep a single backend worker per state directory for this prototype.

## Editable demo input addition
Skyline Match now includes “Demo input data · inspect and edit”. It displays the real angular array, terrain filename, demo seed, noise and azimuth spacing. Load a held-out observation, edit by sample index or paste the complete JSON array, and click Match Edited Data. Input must match the active geometry's sample count and contain finite angles from −90° to 90°. Invalid input preserves the current mission. Discard Unsaved Edits restores the last submitted array; Restore Demo Observation loads the first original test.

`POST /api/localize/manual` accepts `{index_id, profile}`. It verifies the current index and profile geometry, matches against the actual reference array, persists a manual observation and results, and clears ground truth. Manual inputs never receive localization-error claims; existing held-out evaluation remains separate. A global banner identifies manual input on dependent pages.

Added `DemoDataEditor.tsx`, `profileInput.ts`, client context/types integration, and manual backend endpoint; regression coverage verifies shape/range/flat/stale-input rejection, state persistence, original-test isolation and absent manual truth. Verification: 14 frontend tests, 28 backend tests, typecheck and build passed. Active backend restarted at 8001; both frontend 5173 and 5174 proxies verified via HTTP. Direct browser access was unavailable and Safari access was not approved, so this addition was not visually verified in the browser.

## Dashboard camera preview and active-input matching
Added `src/mission/ObservationPreview.tsx`: a responsive SVG panorama of the actual active skyline, shown alongside the winning database reference after angular alignment. Both use the same elevation scale and explicitly identify simulation/manual input. A dashboard selector loads an original demo observation; a link opens the manual editor. These are angular-profile reconstructions, not camera photographs or a connected camera feed.

The dashboard no longer invokes `match(true)`. Matching is handled by `localizeActive.ts`, which preserves the active original or manual observation. Only a mission without an observation loads its first test. A returned manual observation identity is preserved together with its result. The dashboard run button supports manual observations and checks reference availability. Regression tests verify repeated T-02 runs, manual profile identity, empty-state initialization and failed-request preservation.

Validation: 18 frontend tests and 28 backend tests passed; TypeScript check and production build passed. Frontend port 5174 serves the new camera card, calls matching without reset, and its API reports Operational. Browser access was unavailable, so no visual browser pass is claimed for this addition.

## Camera View demonstration tab (2026-11-14)

The dashboard observation card now defaults to Camera View, alongside the existing Horizon Comparison tab. It renders a textured grayscale lunar scene from the active demo or manual skyline. Viewing direction covers 0–359 degrees through a 90-degree equirectangular window, with automatic vertical framing, an optional cyan horizon overlay, and a reset-view control. It is explicitly labeled illustrative and disconnected from live cameras. Surface texture, craters, rocks and lighting are decorative; the silhouette alone is derived from the actual matching input. No ground truth is used, and camera controls never mutate mission state or trigger localization.

Changed files:
- `src/mission/CameraView.tsx`: canvas preview, direction/overlay controls and accessible description.
- `src/mission/cameraScene.ts`: wrapped profile interpolation, automatic viewport framing and deterministic procedural rendering.
- `src/mission/ObservationPreview.tsx`: Camera View / Horizon Comparison keyboard-accessible tabs.
- `src/styles/mission.css`: responsive camera frame, HUD, tabs and controls.
- `tests/cameraScene.test.ts`: azimuth wrapping, changed-input behavior, repeatability, immutability and extreme-profile framing.

Validation: `npm test` (21 passed), `npm run typecheck`, `npm run build` all passed. The existing dashboard selection regressions remain green. An isolated Canvas smoke test (`node --experimental-strip-types work/camera-render/verify.mjs`) passed actual rendering, repeatability, direction changes, overlay changes and edited-profile behavior using the current backend observation. Its temporary renderer dependency lives only under `work/camera-render`, not in application dependencies. The rendered frame was visually inspected. HTTP checks confirmed port 5174 serves the component and mission API. Browser UI automation remains unavailable for this chat; no new browser interaction or responsive visual pass is claimed. No backend/database changes were needed for this feature.

## Camera realism upgrade (2026-11-14)

Replaced the primary camera surface with locally bundled AI-generated photographic lunar terrain (`public/media/lunar-camera-surface-v2.png`, approximately 4 MB). Generated via the imagegen skill; this is synthetic artwork, not NASA photography or reconstructed DEM surface detail. Only the horizon is fitted to the active observation. Per-profile texture phase is deterministic and azimuth panning blends texture edges without mirroring rocks/shadows. No prediction, ground truth, API or database changes.

Updated `src/mission/cameraScene.ts` with the photographic rendering path and a procedural fallback; `src/mission/CameraView.tsx` loads the local asset, handles load failure, uses a 1200x600 canvas, and starts with the cyan overlay off for the photographic presentation. It retains the overlay toggle, direction slider, and explicit demo labeling. `tests/cameraScene.test.ts` adds bounds/wrapping/blend regression coverage. The surface is illustrative and repeats around the panorama; it is not a spatially calibrated 3D lunar scene.

Validation: `npm test` (22 passed), `npm run typecheck`, `npm run build`; both `node --experimental-strip-types work/camera-render/verify.mjs` (procedural fallback) and `node --experimental-strip-types work/camera-render/verify-realism.mjs` (photo texture) passed. Rendered frames were inspected; photo smoke checks include 0/360-degree equality, heading changes, overlay differences, profile edits and input immutability. Full browser layout testing remains unavailable. No new runtime dependencies were added.
