# Null asset pack integration

Source: user-supplied `null city assets.html` (2026-10-14).

The eleven SVG illustrations are retained as self-contained files in `assets/nulls`. The room illustration is used on the main menu and multiplayer landing page. Six accessible cassette buttons align with the shelf; chapter availability continues to come from campaign progress. The room now covers the entire viewport at its original aspect ratio. Controls overlay the lower-left area (bottom area on phones); aspect-ratio differences crop the outer edges instead of leaving margins. Cassette hotspots share the same image plane and are hidden when the shelf is cropped on portrait screens; the menu cassette selector remains available. Fonts use the local monospace fallback; no remote font dependency is introduced.

Dialogue portraits use the supplied SVG characters at their original 42:46 ratio. Named residents are matched to their in-world origin. `src/null-assets.js` contains the reference pixel paths as colored pixel coordinates and metadata for ten origins. These are adapted into 32×48 walking sprites: added legs, direction changes, interaction animation and free appearance editing. The supplied portraits are waist-up; the movement sprites are adaptations, not additional source artwork. The existing small world footprint is retained. Ambient pedestrians also use the Null characters.

Origin, skin/hair/eye colors, gender and hair style persist independently of XP clothing purchases. Missing origin in older saves defaults to Desert; existing colors and campaign progress remain intact. Standalone build embeds the SVG illustrations and pixel data. HTTPS static routes explicitly allow the eleven SVG assets and serve the SVG MIME type.

Verified: JS syntax, all frontend tests including sprite bounds/actions/colors/origin migrations, static SVG response MIME and traversal rejection, standalone build. Browser visual playtest has not been performed for this revision; the previous browser session was blocked by automatic approval due to usage limits. Vector fonts, responsive layout and exact on-screen appearance still need that visual check.
