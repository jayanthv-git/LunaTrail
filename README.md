# Current eight-page mission dashboard

See [the verified continuation handover](docs/HANDOVER.md) for current routes, demo steps, test results and known limits. The research/benchmark details below also describe the retained legacy API.

# LunaTrail local DEM research demonstration

A complete local FastAPI + SQLite backend connected to the existing React cinematic frontend. Real NASA LOLA terrain → rendered references → hidden held-out observation → position and heading estimate → explicit truth reveal → measured errors. This uses simulated observations from the same DEM, **not real camera photographs**.

## Start

Tested on this Apple Silicon Mac with Python 3.14.6 (Rasterio 1.5.2 binary wheel), Node 24, and pinned Python dependencies. No Docker or cloud account needed.

```sh
cd LunaTrail
npm run setup
npm run prepare:terrain
npm run dev:all
```

Open http://127.0.0.1:5173/ for the cinematic landing, then ENTER LUNATRAIL for `/dashboard`. API documentation: http://127.0.0.1:8000/docs. Both services bind to loopback. Ctrl+C stops both process groups; active background work is given 30 seconds to finish before termination. Do not run multiple backend workers against the same state directory. Vite proxies `/api` to port 8000; no broad CORS is enabled. `npm run dev` starts only the frontend.

Setup and preparation are repeatable: migrations are applied and the same DEM/configuration reuses the existing dataset and index. `.env.example` documents optional settings; copy it to `.env` to customize. Environment paths resolve against the project root, including spaces.

Click Build / reuse index → New hidden experiment → Run localization → Reveal ground truth → Evaluate 20 trials. Seed, heading mode and Gaussian angular noise are selectable. Changes apply to the **next** generated experiment or evaluation. Export links provide JSON and CSV. The imported/illustrative toggle retains the original JSON importer with its separate browser-only aligned-profile comparison and unverified provenance labels. Backend failures never select synthetic data.

## Geometry and data

The processed crop and source documentation are included. The original 180 MB source GeoTIFF is omitted from GitHub; the default crop works without it. For full-source mode, download the NASA DEM linked in `data/README.md` to `data/source/LDEM_80S_80MPP_ADJ.TIF` and set `LUNATRAIL_DEM` accordingly. Both raster headers are validated, including CRS, scale, offset, NoData, transform, bounds and resolution. The source is 7600×7600; the default crop is 256×256 with all 65,536 pixels valid. Pixel centers span −10,200 to +10,200 m; outer pixel edges are −10,240 to +10,240 m. Preview bounds use outer pixel edges for exact raster/overlay alignment.

Computations use the embedded lunar south polar stereographic x/y meters. PyProj converts to the raster's own lunar geodetic CRS for display; there is no Earth EPSG conversion. Radius is 1,737,400 m from the CRS. Elevations are meters as specified by the saved NASA product documentation. The active raster is SHA-256 fingerprinted. A source file selected through `LUNATRAIL_DEM` is read as a central 256×256 window, avoiding a full-band allocation; this MVP intentionally keeps its search region bounded. Expanding or choosing another full-source region is not exposed in the UI.

Default renderer:

- Full circular 360-sample profile, 1° azimuth spacing. Azimuth is clockwise from **grid +Y**, not geographic north at each point. +X is 90°.
- Observer is 1.5 m above bilinearly interpolated local ground. Bilinear samples require all four contributing cells to be finite. NoData never becomes zero elevation.
- Ray samples are at 80, 160, …, 4000 m; zero distance is excluded. The maximum apparent elevation angle is retained, including negative angles.
- For distance d and lunar radius R: horizontal = (R+terrain elevation) sin(d/R); vertical = (R+terrain elevation) cos(d/R) − (R+observer ground+height). Angle is atan2(vertical,horizontal) in degrees. No atmospheric refraction.
- The spherical drop at 4 km is approximately 4.60 m (0.066°). Projected distance approximates local surface arc length; projection distortion near this polar crop is negligible relative to an 80 m pixel, but this is not an exact planetary ray tracer. Relief, finite radius, sampling, DEM uncertainty and omitted distant terrain remain limitations.
- Viewpoints stay within [−6199,+6199] m on both axes, providing a 4 km complete horizon plus interpolation margin. Interior NoData causes rejection of the whole profile. Rays are never silently shortened.
- Default grid: 640 m spacing, 400 candidates. Configurable index geometry has bounded radius, step, height, sample count and spacing; maximum 2000 candidates.

Matching uses angular RMSE. Unknown heading searches all circular shifts efficiently via FFT correlation. Observation sample i corresponds to reference sample i+h; a positive h means clockwise heading. Aligned predictions use roll(reference, −h). Only full uniformly sampled circular server profiles support heading search. The imported workflow remains known-heading only. Score gaps are ambiguity indicators, not confidence probabilities.

Seeded test viewpoints are continuously sampled within usable bounds and rejected if within 1 m of any reference. Unknown headings use integer sample shifts (1° default); known-heading observations use 0°. Noise is independent Gaussian angular noise with specified standard deviation. The matcher receives only public observed values, geometry, mode and index; it never receives private ground truth. Reveal requires a persisted completed match. Local position error is Euclidean distance in lunar projected meters. The nearest-grid distance is reported as a discretization baseline. Repeated localization/reveal reuses the same run; trials have unique evaluation/number keys.

## Architecture and persistence

`backend/app/` separates configuration, schemas, terrain, rendering, indexing, matching, experiments, evaluation, jobs, database and API routes. `backend/migrations/` contains the Alembic initial migration. `scripts/dev.py` supervises both local services. `src/lib/api.ts` is the typed frontend client. The existing cinematic media remains described in `docs/CINEMATIC.md`.

SQLite tables:

| Table | Purpose |
| --- | --- |
| datasets | SHA-256 identity, actual raster metadata, NASA provenance |
| reference_indexes | Dataset FK, geometry, region, renderer signature, artifact checksum/shape, build metrics |
| candidates | Index FK, projected/geographic position, NPZ row reference |
| experiments | Index FK, public configuration, private true position/heading/seed, observation artifact |
| localizations | Unique experiment FK, ranked scores/positions/headings, aligned-profile artifact |
| evaluations / trials | Parameters, aggregate metrics, unique per-trial results and failure reasons |
| jobs | Bounded worker status, progress, parameters and errors |

Large profile arrays live in compressed NPZ files; SQLite holds small metadata and checksums. Artifact reads verify checksums, index identities include terrain/configuration/region, and file stat changes reload terrain. Corrupt/stale artifacts are rejected. One bounded worker handles index and evaluation jobs (at most three active/queued); database transactions are serialized in-process with an RLock and SQLite WAL. Restart explicitly marks unfinished jobs/evaluations interrupted. Failed trials remain in reports, and success rates include failures in the denominator. Job status is available at `/api/v1/jobs/{id}`.

The local API is documented by OpenAPI: health/readiness; datasets/metadata/preview/usable bounds; index creation/summary; jobs; experiments/public observation; localization; explicit reveal; evaluations/results; JSON/CSV exports. Request bodies are limited to 64 KiB; schemas reject unknown fields, nonfinite values and out-of-range parameters. Browsers cannot submit filesystem paths. Raw DEM/NPZ upload and raw-camera extraction are outside this MVP.

## Verify and benchmark

```sh
npm test
npm run build
npm run test:backend
npm run benchmark
```

The benchmark saves four groups of 20 trials (seed 20261113 through 20261132): clean/noisy × known/unknown heading. Reports are in `reports/benchmark.json`, `reports/index.json`, and four CSVs. Results are also persisted in SQLite. The same 20 held-out positions are paired across conditions, not 80 independent locations. Do not interpret these results as real-camera validation.

Measured on this device:

| Heading / noise σ | Mean position | Median | P90 | Mean heading error | Mean matching time | Success ≤640 m |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Known / 0° | 337.4 m | 297.9 m | 530.1 m | 0° supplied | 0.49 ms | 95% |
| Known / 0.1° | 337.4 m | 297.9 m | 530.1 m | 0° supplied | 0.48 ms | 95% |
| Unknown / 0° | 418.9 m | 402.1 m | 617.9 m | 3.2° | 1.64 ms | 90% |
| Unknown / 0.1° | 418.9 m | 402.1 m | 617.9 m | 3.2° | 1.34 ms | 90% |

All 80 trials completed, zero failures. Small added noise did not change winning candidates in this sample. Mean nearest-candidate baseline: 256.1 m. Index build: 0.488 s; compressed artifact: 1,105,694 bytes. Match time measures algorithm/ranking/alignment only, excluding HTTP, file validation and database I/O.

Browser verification also ran the default seed 42 unknown-heading clean experiment: 719.0 m position error and 5° heading error, versus a 318.8 m nearest-grid baseline. A separate browser-driven batch at seeds 42–61 measured **741.1 m mean, 338.1 m median, 1164.4 m P90, 65% within 640 m**, zero failures. This worse sample illustrates ambiguity and seed sensitivity; it is included in `reports/browser-evaluation.json` and CSV rather than omitted. Visual inspection verified terrain overlays, ranked results, aligned curves, reveal and completed evaluation in the responsive dashboard.

## Troubleshooting and clearing generated state

- Backend unavailable: run `npm run dev:all`, check port 8000 logs, then Retry connection. A frontend alone cannot run DEM experiments.
- Port occupied: stop the earlier local service; launcher uses strict port 5173 so it does not silently move.
- Python wheel installation: use this supported Python 3.14/macOS Apple Silicon environment and the pinned requirements; no source GDAL build is needed here.
- Stale or corrupted cache: stop both services, move only generated state aside and prepare again. This resets experiments too. Preserve it if you need past results:

```sh
cd LunaTrail
mv backend/var "backend/var-backup-$(date +%Y%m%d-%H%M%S)"
npm run prepare:terrain
npm run dev:all
```

If using a custom `LUNATRAIL_STATE`, move that directory instead. Never clear `data/source` or `data/processed`. Virtualenvs, runtime state and caches are ignored by Git; this folder currently has no Git repository.
