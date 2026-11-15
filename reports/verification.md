# Verification — 2026-11-13

- Existing frontend suite: 9/9 passed.
- TypeScript + Vite production build passed.
- Backend suite: four test groups passed (coordinate/boundary checks; flat/ridge/NoData rendering; ranking/rotation/geometry rejection; real-DEM API, held-out isolation, idempotence, migrations, persistence, cache invalidation, request limits, background evaluation and exports).
- Original 189,158,392-byte source SHA-256 matches supplied provenance: `82030dcbdd7c4bb0c7d858e9b4b293b9f2cda5a543ba31ec0f42784bd6beee5a`.
- Real-data index: 400 candidates × 360 samples, 0.487526 s build, 1,105,694-byte NPZ.
- 80 benchmark condition trials saved, using 20 paired held-out viewpoints; zero failures. See benchmark.json and condition CSVs.
- Additional browser-driven 20-trial batch saved in browser-evaluation.json/.csv; zero failures, worse errors retained in README.
- Browser exercised build/reuse, observation generation, ranking, explicit reveal, and asynchronous batch evaluation. Visual inspection confirmed raster with grid/prediction/truth overlays and aligned skyline curves in responsive single-column rendering.
- Startup and orderly service shutdown exercised. No source terrain files modified; no additional terrain downloaded.
- One dependency deprecation warning remains: Starlette's HTTPX TestClient compatibility layer. Tests pass.

Limits: finite 4 km horizon, 80 m DEM, discretized 640 m position candidates and 1° unknown headings, ideal shared-DEM camera model, no photographs, no calibrated confidence. Configured full-source rasters use a bounded central 256×256 window rather than indexing all 7600×7600 pixels. Automated browser breakpoint sweeps and real-camera validation were not performed.
