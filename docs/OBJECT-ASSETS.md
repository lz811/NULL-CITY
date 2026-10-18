# User-drawn objects

The first imported object is the Midnight Ramen building, based on the user's `perchance-219758684-upscaled.png`. A background-removal edit was created with imagegen and copied to `assets/objects/midnight-ramen.png`; the original user file remains untouched. The generated cutout is an edited version, not guaranteed pixel-identical to the original.

`src/object-assets.js` is the asset registry: image path, district, tile placement, width, source rectangle, base anchor, venue identity and collision policy. Loading failures retain the original procedural building. Loaded objects replace the original building drawing and enter the scene's depth-sorted layer, allowing characters to pass in front of or behind the object. Loaded assets release their old rectangular lot and use an explicit normalized wall footprint. The stone apron is walkable, the entrance is placed beside the visible door, and depth sorting uses the wall base rather than the pavement edge. The image silhouette is not an automatic collision mask. Ramen keeps its existing interior, resident and side quest.

To add another object: add its local image and registry entry, connect an existing placement or create a new world footprint, then include the asset in HTTPS static serving and the standalone build. This is the first reusable asset adapter, not a completed drag-and-drop map editor.

Validated: JS syntax, loaded-world doorway reachability, walkable perimeter, wall collision and preservation of neighbouring obstacles, frontend tests, standalone build. Browser verified: capital and district paving renders, the route reaches Midnight Ramen, E enters its interior, and the exit returns to the visible doorway. Screenshot: ramen-paving-check.png.
