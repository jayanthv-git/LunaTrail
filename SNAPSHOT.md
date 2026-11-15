# Desktop snapshot — 2026-11-15

This branch preserves the previously uncommitted desktop version of LunaTrail.
It is an older implementation than the mission dashboard on `main`; it is kept
separately so saving the local work does not replace the newer application.

The processed terrain crop is included. The original 189 MB NASA source GeoTIFF
remains local and is excluded from Git. Its source URL and metadata are documented
in [data/README.md](data/README.md).

Dependencies, generated builds, Python caches, local environment settings, and
runtime databases are excluded from the snapshot.
