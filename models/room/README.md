# Editable studio models

Open studio-furniture.blend in Blender 4.5 LTS. Seven original model scenes: chair, lamp, entrance leaf, desk drawer, cabinet, reading table and workbench (desk, monitor case/stand, keyboard, mouse). Editable bevels, material nodes and packed authored maps remain in source.

Rebuild:

    blender --background --factory-startup --python scripts/blender/build-studio-furniture.py -- models/room qa-private/furniture-export

Exports isolate each scene, bake copies and merge by material. CabinetLeftHinge / CabinetRightHinge retain independent transforms; CabinetPull and DrawerPull retain physical geometry. Cabinet leaves open outward by at most 1.30 radians. The closed leaf backs start in front of the 0.260 m case front. The collection shelf is 0.409 m above the floor. The desk drawer mounts at world Y = 0.64 m, below the 0.7819 m apron underside, with 0.29 m travel. The monitor live image remains runtime-owned.

assets.json records triangles, primitives, bytes and exact hashes. Legacy cabinet/table assets remain for explicit ?joinery=legacy comparison. No downloaded mesh or texture was added.

Entrance seating: the editable leaf root coincides with the hinge pin. Runtime root (-0.515, 0.025, 1.90), maximum angle 1.54 rad, passage threshold 1.48 rad. Three physical jamb mortises clear the knuckles; QA tests all visible leaf triangles against the actual static collision boxes at 41 positions, without excluding hinges.

The runtime reuses the room's existing photographed oak map on the cabinet, reading table and workbench for material continuity. These shared runtime materials are separate from the packed authored procedural maps retained in the editable Blender source.

## Completion accents

room-accents.blend adds three original editable scenes: robot, orbit and a hollow ceiling panel. Rebuild with scripts/blender/build-room-accents.py using the same SOURCE_DIR OUTPUT_DIR arguments. accents.json records exact web budgets and hashes. Runtime instances the ceiling panel four times; its origin touches the ceiling plane and its opal diffuser is separate from the housing. Miniature geometry/materials clone independently for safe viewer disposal. No new image texture. The cube remains procedural with exact legal turn state.

Workbench trestles use an editable graphite powder-coat material (roughness 0.58, metalness 0.10); rubber feet remain separate. Geometry and pivots are unchanged.
