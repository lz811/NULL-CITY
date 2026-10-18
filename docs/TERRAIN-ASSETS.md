# Authored road and pavement materials

The three original user PNGs are copied byte-for-byte into `assets/terrain/`:

- `stone-atlas.png` — IMG_7332.PNG: broad cracked paving variants and kerb strips.
- `stone-platform.png` — IMG_7333.PNG: plaza and park-path paving.
- `road-atlas.png` — IMG_7334.PNG: asphalt, worn lane paint, crossings, kerb elbows, drains and manholes.

These RGB sheets contain a baked checkerboard. The renderer samples rectangles strictly inside the useful surfaces, rather than treating the sheet background as transparency. The plaza image's top diamond is reprojected onto an inset square on a scratch canvas; its vertical extrusion and outer background are excluded. The camera remains unchanged. Source images are not regenerated or overwritten.

`src/terrain-assets.js` owns the sampling rectangles and rendering. Street texture spans 32 world pixels (two collision tiles); plaza texture spans 64. Road markings follow the map's authored decals. Kerbs follow neighbouring ground types; interior road joins stay open. Crosswalks preserve their authored orientation. Ground drawing never writes collision, navigation, venue or quest data.

The three sheets load before world baking, are included in the standalone build and are allowlisted by the Python server. If road or stone loading fails, procedural paving remains available. If the platform alone fails, plazas use the stone sheet.

Validation: source rectangle bounds, source file presence, loaded-material drawing, unchanged terrain/collision arrays and kerb topology are tested in `tests/terrain-assets.test.mjs`. Browser verification for this revision was blocked by the browser tool's URL security policy; visual seams and scale still need an in-browser review.
