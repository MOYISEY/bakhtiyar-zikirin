# Editable studio furniture

Open studio-furniture.blend in Blender 4.5 LTS. Model scenes are StudioChair, StudioTaskLamp, StudioDoorLeaf and StudioDeskDrawer. Each separates editable asset parts from a render-only studio. Bevels, fabric/wood material nodes, packed authored maps and physical units remain editable. No downloaded mesh or texture was used.

Rebuild with Blender's background Python runner:

    blender --background --factory-startup --python scripts/blender/build-studio-furniture.py -- models/room qa-private/furniture-export

The first output path contains the .blend source; the second receives isolated GLBs, deterministic gzip companions, studio PNGs and model-report.json. Web exports bake copies and merge static parts by material. The source hierarchy and modifiers are preserved. Runtime semantic nodes use the studioNode extra. DrawerTray moves on glTF +Z by 0.29 m; DrawerPull remains a physical mesh for interaction. The door origin matches the existing hinge. The lamp's luminous surface material contains studio_lamp_light.

assets.json records exact model triangles, material primitive counts, raw/gzip sizes and hashes. The current exports are integrated under public/room/assets/studio-furniture/. Existing legacy assets remain available for comparison with ?furniture=legacy. Runtime changes preserve the original door collision meshes, scroll route and pull switch.
