# Native Canvas city renderer

Exterior buildings and sidewalks are drawn with Canvas 2D rectangles, lines and hand-authored pixel lettering. There are no external building images.

- `src/noir-art.js`: street materials, roof silhouettes, shopfront details, windows and wet reflections.
- `drawProceduralStorefront`: draws fixed-height native-resolution shop fronts, anchored doors and signs inside each building footprint.
- `src/engine.js`: collision grid, layout, character rendering and underlying tile kit.
- `src/places.js`: enterable interiors and venue doors.

Use `npm run dev` for the multi-file game; use `npm run build` to regenerate single-file `NULL-CITY.html`. The menu artwork remains unchanged; only building PNGs were removed.

## Volumetric buildings (v0.8)

`src/noir-art.js` now draws every building as a lit volume instead of flat rectangles. The static canvas is baked at 2x, so details sit on a half-pixel grid.

- **Light** comes from the upper left: lit north/west edges, shaded east/south faces, cast shadows on the pavement (`drawBuildingShadow`) and on the roof/wall (parapet, cornice, awnings, window sills, balconies).
- **Roof** (`drawRoof`): tile, corrugated metal, tar/gravel membrane or roof garden, a parapet with a shaded inner face, and 3D rooftop equipment (`roofProp`: AC units, tanks, skylights, solar panels, planters, stair bulkheads, pipes).
- **Facade** (`drawFacadeWall`, `drawUpperFloors`, `drawWindow`, `drawBalcony`): brick / stucco / panel walls, corner quoins, dentil cornice, recessed windows with lintels and sills, curtains, shutters, flower boxes, AC units, balconies, fire escapes, drain pipes.
- **Ground floor**: `drawProceduralStorefront` (sign board, striped awnings, glass bays with goods, door recess, string lights, vending machine) and `drawResidentialFront` (portico, numbered door, grilled windows, bins, planters).
- **Colour**: 16 wall palettes (`BPAL`) with a trim colour, an accent and an awning pair each; lit windows use 8 warm and cool tints.
- `drawSignBoard` is shared with `places.js`, which re-labels NEON THREAD and paints the rooftop billboards of the Radio and Archive buildings.

Collision, world coordinates, door positions, `W.noirWindows` (night window glow) and the shop labels are unchanged.
