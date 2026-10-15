# Narrow-screen cabinet close command

Baseline: `88c6691a4dbbcede5fa0ed8346605891cdfd45e4`. Scope: one compact, localised 124 × 44 px close command in cabinet inspection at widths up to 420 px. No room or portfolio redesign.

The command appears beside the cabinet only while the actual cabinet is visible, the camera is inside reach and the cabinet is open. Tap or Space/Enter closes the existing mechanism; focus returns to the reachable physical handle. The command disappears when closed or in another view. Its activation rechecks the context, camera, distance, opaque occlusion and modal hold. It is a deliberate view command, separate from physical hotspots. No offscreen handle is moved onto the viewport edge.

The existing `actionEligible`, `projectedAction` and `hitAt` functions are byte-identical to the baseline; their before/after SHA-256 values are in [verification.json](verification.json). The cabinet mechanism, authored GLB assets, frame profiles, shaders, light, resolution and document data are unchanged.

## Verification

- [216 checks](reports/matrix.json): 320/360/390 px × normal/reduced motion, RU/KK/EN, open/closed, direct touch, native keyboard, focus restoration, physical drag/reverse, camera ownership, actual mechanical gaps, blocked wall, modal hold, other views and stale DOM activation.
- [12 captured-pose gate checks](reports/commandGates.json): actual cabinet inspection both inside, outside the doorway and beyond reach, on 320/390 px. Forced stale click/keyboard cannot bypass camera eligibility.
- [144 existing physical-access checks](reports/physicalGates.json) and [112 existing native handle checks](reports/handles.json) rerun unchanged.
- `npm run build` and `git diff --check` pass. Actual Edge frames were viewed; mobile means touch emulation, not a physical Android/Safari test.

| Width | Normal open | Reduced open | Native drag/reverse |
|---|---|---|---|
| 320 | [frame](frames/320-no-preference-open.png) | [frame](frames/320-reduce-open.png) | [frame](frames/320-no-preference-reverse.png) |
| 360 | [frame](frames/360-no-preference-open.png) | [frame](frames/360-reduce-open.png) | [frame](frames/360-no-preference-reverse.png) |
| 390 | [frame](frames/390-no-preference-open.png) | [frame](frames/390-reduce-open.png) | [frame](frames/390-no-preference-reverse.png) |

## Previously requested fixes

These were already implemented before this small patch and are preserved:

- Gallery pictures: four mitred rails, an actual aperture, recessed prints, backing and wall mounts. Door profiles: shallow caps/rebates aligned with baked bounds, separate turned pull stand-offs/roses/fixings. [Joinery QA](../detail-review-2026-10-15/QA-2026-10-15.md).
- Drawer GLB and gzip: authored separated supports; the old Ivory note paper and pencil are removed. Thin documents sit above their supports. The latest drawer has the single CV and diploma, with genuine certificates on the cabinet. Actual geometry/ray sweeps cover 101 positions; no known remaining collision in those tested cases. This is not a claim of exhaustive collision proof for every room object.
- Capture helper: HTML targets are updated after the final camera/entrance override. The old stale-marker capture is retained with an erratum; current comparable pairs have exactly equal camera/projection matrices. [Real frames and provenance](../interaction-review-2026-10-16/VISUAL-REVIEW.md).

No further change to these accepted details was necessary here. Physical Android/Safari remain deferred; no new full-room redesign or reduction of quality was introduced.

## Cold-load diagnosis

The [controlled 16-run investigation](../loading-review-2026-10-15/QA-LOADING.md) measured exact release `8c82487`: live cold 9.87–29.46 s, warm 2.36–2.44 s; local cold approximately 2.1–2.6 s. In three of four cold live cases the unchanged 1,211,256-byte tree atlas had a 14.79–25.03 s body-delivery tail. A fixed 48.7 s loader timer was not reproduced; attribution between client, intermediary and CDN delivery remains unresolved. No loader/cache/quality change or general startup speedup is claimed. The later [88c6691 performance report](../interaction-review-2026-10-16/PERFORMANCE.md) keeps its own conditions and caveats. This close-button patch adds no images, models or network assets.

The original 320 × 844 cabinet inspection limitation is visible [before](frames/320-before.png); the same viewport now has a direct [close command](frames/320-reduce-open.png). These are actual site screenshots, not generated mockups.
