# October 16 road material update

Source: user-supplied `NULL_CITY_CHARACTERS_ASPHALT.zip`. Only the two `ground/` PNGs are used; character files are outside this request.

The original source PNGs are preserved in `assets/terrain/`. `src/terrain-assets.js` samples the user-circled grey block paving tile (fourth column, fourth row; source rectangle 674,712,176,184) from `asphalt_paving_additional_tiles.png`, excluding its detached border. The 32-world-pixel patches alternate horizontal and vertical reflections, so adjacent edges sample the same source edge. Integer-aligned clipping and an opaque backing prevent gaps and old ground showing through. A 5% cool tint fits the night lighting without hiding the stone pattern.

Roads, wet roads, crossings, ramps and track beds use this material. Crossing paint and lane stripes are sampled separately from the new sheet; manholes use the full tileset. They do not stamp an old opaque road tile over the new surface. Sidewalks and building assets are unchanged.

Both files are loaded before world baking, allowlisted by the server and embedded in the standalone build. Existing rendering remains a fallback if the new images fail to load. Tests verify road material routing and unchanged collision arrays. Browser visual review is not included in this revision.

Correction: the circled grey blocks are pedestrian paving (sidewalks, squares, paths, alleys, quays, stairs). Carriageways, crossings and ramps use the original smooth charcoal crop 246,38,174,180. Narrow clipped kerb edges retain the street boundary without restoring the old sidewalk texture.
