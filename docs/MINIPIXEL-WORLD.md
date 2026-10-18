# Minipixel city migration — 2026-10-14

The outdoor map now uses the world generator and Canvas drawing code from the user's `null city world minipixel.html`. The unchanged source is retained in `assets/reference/minipixel-original.html`; the integrated renderer is `src/minipixel-world.js`. This is a source port, not a screenshot background or a palette replacement.

The reference's five circular roads, sixteen radial avenues, six architectural palettes, parks, waterfront, ports, building forms, windows, neon, traffic, crowds, ships and airships are retained. All outdoor campaign districts use the same continuous geography. District selection moves the player to an appropriate ring and retains operation unlock rules. Interiors keep their existing authored artwork and interactions.

Integration preserves appearance customization, named story NPCs, campaign terminals, five enterable venues, XP purchases, mission progress, accounts and multiplayer. Old map coordinates are intentionally discarded on first migration; story progress remains. New city positions carry `world: minipixel-v1`, including the saved return location while inside a building.

World coordinates are mapped into existing game coordinates at 10:1. The outdoor renderer uses display-resolution Canvas rather than enlarging the old 16px tile map. Default zoom is 100%; buttons and the wheel support 35–180%. Interiors return to their original camera scale. The minimap has a cached city background with live markers. The city overview displays actual circular geography.

Collision uses the reference's rotated footprints and props. Routes use a road graph and local A* fallback; segment/rectangle and segment/circle intersection checks avoid corner clipping. Route movement clamps steps to waypoints. Reference NPCs wrap their routes rather than walking out of the city over time. Rain can be disabled and reduced-motion freezes environmental animation.

## Validation

- `npm run check`
- `npm test`, including `tests/minipixel.test.mjs`: reference geometry, reachable campaign targets/entrances/gates, curved routes with continuous collision checks, actual player movement along the route, unique venue entrances, and render-call smoke checks across several city locations.
- `npm run build`: updates `NULL-CITY.html` with the same embedded world renderer.

The render-call test uses a stub Canvas context; it does not validate visual output. Browser screenshot/playtest verification was blocked by automatic tool approval because of the account usage limit. No browser or screenshot workaround was used. Mobile layout, visual frame rate and exact screenshot parity still require an interactive browser check.
