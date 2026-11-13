# LunaTrail MVP terrain data

Downloaded 2026-11-13 from NASA Goddard's Planetary Geodesy Data Archive (PGDA).

## Sources
- Dataset page: https://pgda.gsfc.nasa.gov/products/90
- Original DEM: https://pgda.gsfc.nasa.gov/data/LOLA_20mpp/LDEM_80S_80MPP_ADJ.TIF
- Preferred USGS product (server unavailable during download): https://astrogeology.usgs.gov/search/map/moon_lro_south_pole_dem

## Files
- `source/LDEM_80S_80MPP_ADJ.TIF`: original NASA LOLA south-pole elevation GeoTIFF, preserved under its source filename. Covers 80–90 degrees south. Pixel spacing: 80 m. South polar stereographic coordinates in meters, MOON_ME reference frame of JPL DE421; elevations in meters. Full CRS, bounds, NoData, scale/offset, and checksum are in the JSON metadata.
- `source/NASA_PGDA_product_90.html`: saved official dataset documentation; includes links to other products, which were not downloaded.
- `source/terrain_metadata.json`: metadata read directly with Rasterio, source URLs, SHA-256, and exact crop window.
- `processed/LDEM_80S_80MPP_ADJ_crop_20480m.tif`: 256 × 256 pixels (20.48 × 20.48 km), selected from fully valid central terrain with appreciable relief. Original values and georeferencing retained; no resampling. Ready for quick skyline tests.

## Use
Open either GeoTIFF with `rasterio.open(path)` and read elevation using `read(1, masked=True)`. Respect NoData in the full DEM. Coordinates are lunar projected meters, not Earth latitude/longitude. The 80 m pixel spacing supports an MVP localization demonstration but cannot resolve 4 m terrain features; it is coarser than the unavailable preferred USGS DEM. The small crop is a computational starter: limit ray length to available terrain and keep viewpoints away from its edges. Use the full DEM when a larger horizon context is needed. No imagery, hillshade, slope, or duplicate datasets were downloaded.

## GitHub clone note
The 180 MB original source GeoTIFF is omitted from GitHub because of its standard 100 MB per-file limit. The included processed crop supports the default demonstration. The source metadata and saved NASA product documentation remain included.
