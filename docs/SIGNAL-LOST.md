# SIGNAL LOST — implemented art direction

Updated 13 October 2026 against the supplied Visual Reference & Work Prompt.

## Working implementation

The existing Canvas game remains the runtime. Streets, buildings, rooftop modules,
characters, props, reflections, light, weather and UI are separate render layers.
The city is not a flattened illustration. The reusable 96×24 rooftop atlas is baked
once by `drawRoofModule`; customized character strips are baked at 32×48 per frame.
Both are real canvas image resources consumed by drawImage. Source code is the
editable asset source; no external sprite pack or asset server is needed.

- Top-down roof-dominant buildings, masonry, gutters, service pipes, ladders,
  fans, ventilation, skylights, window frames, vending machines, plants and signs.
- Connected crossroads and zebra crossings replace the central empty plaza.
  Existing collision footprints, doors, quest coordinates and route connectivity remain.
- Irregular clipped water surfaces reflect nearby light colours, with moving streaks
  and rain rings; local sign reflections are drawn only on passable ground.
- Day, sunset, night, rain, heavy rain, fog and storm presets, plus automatic cycle.
  Ambient exposure, window emission, wetness, rainfall and fog interpolate independently.
  Weather selection is saved. Reduced motion suppresses thunder flashes and rain movement.
- Source character strips: idle 4, walk/run 6, interact/hack 4 frames, three directions
  with horizontal mirroring. The world footprint stays 16×24. Hair, skin, gender and
  outfit customization are preserved. Hacking is connected to terminal interaction.
- Warm diner, blue technical rooms and red/amber shop accents on walkable interiors.
- Separate CRT/VHS room menu, cassette selection, transition skip, paper journal,
  readable DOM terminal, inventory and compact HUD. Unreleased course tapes are marked.

## Existing illustrated assets

`assets/signal-lost/tape-room.png` and `portraits.png` were generated with the built-in
ImageGen tool during the prior art pass, then copied into the project and embedded in
the standalone build. They are menu/portrait assets; neither replaces the playable map.
Briefs: a detailed 1990s pixel-noir bedroom with blank CRT at left, VHS deck, rainy
window, black cat and warm desk lamp; a four-column original cast portrait strip for
Mara, Yuna, Echo and Ivo with blue-grey shadows and amber light. The exact generation
requests are retained in the conversation. All world sprites are authored in code.

## Validation and remaining visual differences

The current implementation has been compared with the supplied reference using a real
1280×720 game screenshot. It now follows the roof view, crossed streets, warm windows,
blue shadows and small character scale. It is **not a pixel-identical reconstruction**:
architecture and NPC silhouettes remain simpler and more repetitive than the painted
reference, the underlying map retains existing story landmarks, and the portrait strip
has one expression per character. These are not claimed as completed exact-match assets.

Browser QA covered boot, VHS continuation, settings/day selection, click-to-route,
E interaction, pwd/ls/cat mission completion (+80 XP), and 390×844 world/menu layout.
No horizontal overflow at 390px. Browser console reported no errors during that pass.
Screenshots: signal-room.png, signal-city.png, signal-day.png, signal-mobile.png,
signal-terminal.png. Full weather-cycle visual comparison and foreground frame-rate
benchmarking remain unverified; background browser throttling prevents useful FPS claims.

JS/Python syntax checks, six frontend test files, and six HTTPS integration scenarios
pass. Tests include old-save migration, settings validation, smooth weather convergence,
animation strip availability, chapter progression, navigation and server multiplayer.
The existing real-time shared-world multiplayer expansion and complete certification
courses have not been added by this visual patch. Existing quiz multiplayer is preserved.
