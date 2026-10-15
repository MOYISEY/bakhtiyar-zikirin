# Comparable visual review — 15 October 2026

18 desktop/touch-emulation pairs; all camera and projection matrices match exactly. [Raw poses and totals](frames.json). Images are actual Edge PNG frames. The baseline review fixture only synchronizes HTML actions after the final capture camera pose; source geometry is unchanged.

| View | Published 8c baseline | Candidate | Calls before → after | Triangles before → after |
|---|---|---|---|---|
| desktop-drawer | [before](screenshots/before-desktop-drawer.png) | [after](screenshots/after-desktop-drawer.png) | 809 → 776 | 1127389 → 1141699 |
| desktop-gallery | [before](screenshots/before-desktop-gallery.png) | [after](screenshots/after-desktop-gallery.png) | 807 → 772 | 1064414 → 1080650 |
| desktop-gallery-keyform | [before](screenshots/before-desktop-gallery-keyform.png) | [after](screenshots/after-desktop-gallery-keyform.png) | 773 → 738 | 1008456 → 1024214 |
| desktop-gallery-corner | [before](screenshots/before-desktop-gallery-corner.png) | [after](screenshots/after-desktop-gallery-corner.png) | 807 → 772 | 1062644 → 1078880 |
| desktop-door03 | [before](screenshots/before-desktop-door03.png) | [after](screenshots/after-desktop-door03.png) | 809 → 767 | 1036270 → 1056502 |
| desktop-door03-handle | [before](screenshots/before-desktop-door03-handle.png) | [after](screenshots/after-desktop-door03-handle.png) | 768 → 726 | 988192 → 1006164 |
| desktop-door03-corner | [before](screenshots/before-desktop-door03-corner.png) | [after](screenshots/after-desktop-door03-corner.png) | 779 → 742 | 1015616 → 1034212 |
| desktop-entrance | [before](screenshots/before-desktop-entrance.png) | [after](screenshots/after-desktop-entrance.png) | 986 → 948 | 1245147 → 1263965 |
| desktop-threshold | [before](screenshots/before-desktop-threshold.png) | [after](screenshots/after-desktop-threshold.png) | 840 → 801 | 1112560 → 1128236 |
| mobile-drawer | [before](screenshots/before-mobile-drawer.png) | [after](screenshots/after-mobile-drawer.png) | 749 → 725 | 1056045 → 1069715 |
| mobile-gallery | [before](screenshots/before-mobile-gallery.png) | [after](screenshots/after-mobile-gallery.png) | 798 → 763 | 1014326 → 1030562 |
| mobile-gallery-keyform | [before](screenshots/before-mobile-gallery-keyform.png) | [after](screenshots/after-mobile-gallery-keyform.png) | 755 → 721 | 977426 → 994078 |
| mobile-gallery-corner | [before](screenshots/before-mobile-gallery-corner.png) | [after](screenshots/after-mobile-gallery-corner.png) | 775 → 740 | 1015258 → 1031494 |
| mobile-door03 | [before](screenshots/before-mobile-door03.png) | [after](screenshots/after-mobile-door03.png) | 791 → 747 | 1008910 → 1026222 |
| mobile-door03-handle | [before](screenshots/before-mobile-door03-handle.png) | [after](screenshots/after-mobile-door03-handle.png) | 696 → 654 | 890511 → 908183 |
| mobile-door03-corner | [before](screenshots/before-mobile-door03-corner.png) | [after](screenshots/after-mobile-door03-corner.png) | 762 → 728 | 982324 → 1001616 |
| mobile-entrance | [before](screenshots/before-mobile-entrance.png) | [after](screenshots/after-mobile-entrance.png) | 902 → 869 | 1184951 → 1204513 |
| mobile-threshold | [before](screenshots/before-mobile-threshold.png) | [after](screenshots/after-mobile-threshold.png) | 805 → 774 | 1093967 → 1108295 |

Reviewed native frames: separate supported papers and visible labels; recessed artwork/mitred corners; door corner, pull mount, entrance and threshold contact. Mobile is Edge touch emulation, not a physical device. Existing published room-UX captures with explicit cameraPose had stale HTML markers; see [erratum](../room-ux/VISUAL-REVIEW.md).

Additional actual follow-up frames: [60% opening](screenshots/native-partial-60.png), [80% opening](screenshots/native-partial-80.png), [320px partial opening](screenshots/320-partial-12.png), [390px partial opening](screenshots/390-partial-16.png), [corrected floor-camera actions](screenshots/native-capture-floor.png).
