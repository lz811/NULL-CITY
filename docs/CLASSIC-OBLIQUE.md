# Classic artwork restored — 2026-10-15

The active game and standalone build again load the original Canvas city, human character sprites, tape-room background and dialogue portrait sheet. The two supplied HTML reference ports remain on disk but are no longer loaded. Missions, progression, customization, interiors and multiplayer remain in place. Positions from the minipixel map reset to a valid classic spawn, while story progress is preserved.

The outdoor camera uses a mild oblique affine projection (vertical factor 0.82, horizontal shear 0.08), with a larger rendering buffer to cover all screen corners. Click coordinates use the inverse projection. Building facades occupy more of their original footprint, exposing more wall and less roof without changing collision geometry. Interiors use the original projection. This is a 2D oblique view, not a new 3D engine.

Verification: syntax checks, frontend tests, projection inverse/corner coverage and standalone build. No visual browser playtest has been performed for this revision.

## Superseded: natural overhead view

At the user’s request the active camera now uses the identity projection, with no shear or vertical compression. Facades have returned to their original proportions. The imported Ramen sprite is seven tiles wide (matching its lot) and uses a 0.92 vertical anchor to account for transparent padding below its base. Oblique projection remains an unused capability only.
