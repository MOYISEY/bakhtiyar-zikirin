# Matched full-frame review

Baseline: `4b342abb836f817dcabc76e2d99f265c15945c4c`. 52 matched pairs, including desktop and mobile touch emulation. Camera/projection matrices match exactly. Capture mode freezes seed/time and forces fresh shadow maps for every pose; this tests preserved geometry, light and static batching separately from shadow reuse. [Raw PNG pixel comparison](visual-comparison.json), [image provenance](screenshots.json). Full PNG originals remain in the task workspace `captures/before` and `captures/after`.

35 pairs are byte-identical pixels. Other pairs differ only on sparse raster edges: max RMSE 0.03191/255, max 4 pixels per image above an 8/255 channel threshold. Authored topology is unchanged. Merged bounds alter conservative shadow-frustum culling in 13 poses (-2,100 to +6,600 submitted triangles; at most +0.76%), while fresh-shadow calls fall by 44–88 in the main corridor/desk views. This is numerical evidence; selected complete frames were also viewed directly.

| View | Before | After | Fresh-shadow draw calls | Changed PNG pixels |
|---|---|---|---|---|
| desktop-corridor | [Before](screenshots/before-desktop-corridor.webp) | [After](screenshots/after-desktop-corridor.webp) | 1044 → 956 | 309 |
| desktop-side-door-01 | [Before](screenshots/before-desktop-side-door-01.webp) | [After](screenshots/after-desktop-side-door-01.webp) | 886 → 800 | 0 |
| desktop-side-door-02 | [Before](screenshots/before-desktop-side-door-02.webp) | [After](screenshots/after-desktop-side-door-02.webp) | 820 → 754 | 0 |
| desktop-side-door-03 | [Before](screenshots/before-desktop-side-door-03.webp) | [After](screenshots/after-desktop-side-door-03.webp) | 813 → 747 | 0 |
| desktop-overhead | [Before](screenshots/before-desktop-overhead.webp) | [After](screenshots/after-desktop-overhead.webp) | 769 → 690 | 0 |
| desktop-entry-front-0.25 | [Before](screenshots/before-desktop-entry-front-0.25.webp) | [After](screenshots/after-desktop-entry-front-0.25.webp) | 957 → 891 | 0 |
| desktop-entry-back-0.25 | [Before](screenshots/before-desktop-entry-back-0.25.webp) | [After](screenshots/after-desktop-entry-back-0.25.webp) | 911 → 823 | 113 |
| desktop-entry-front-0.5 | [Before](screenshots/before-desktop-entry-front-0.5.webp) | [After](screenshots/after-desktop-entry-front-0.5.webp) | 958 → 892 | 0 |
| desktop-entry-back-0.5 | [Before](screenshots/before-desktop-entry-back-0.5.webp) | [After](screenshots/after-desktop-entry-back-0.5.webp) | 912 → 824 | 157 |
| desktop-entry-front-1 | [Before](screenshots/before-desktop-entry-front-1.webp) | [After](screenshots/after-desktop-entry-front-1.webp) | 958 → 892 | 23 |
| desktop-entry-back-1 | [Before](screenshots/before-desktop-entry-back-1.webp) | [After](screenshots/after-desktop-entry-back-1.webp) | 912 → 824 | 105 |
| desktop-desk-on | [Before](screenshots/before-desktop-desk-on.webp) | [After](screenshots/after-desktop-desk-on.webp) | 879 → 818 | 0 |
| desktop-desk-off | [Before](screenshots/before-desktop-desk-off.webp) | [After](screenshots/after-desktop-desk-off.webp) | 879 → 818 | 10 |
| desktop-room-on | [Before](screenshots/before-desktop-room-on.webp) | [After](screenshots/after-desktop-room-on.webp) | 934 → 868 | 0 |
| desktop-room-off | [Before](screenshots/before-desktop-room-off.webp) | [After](screenshots/after-desktop-room-off.webp) | 934 → 868 | 23 |
| desktop-window | [Before](screenshots/before-desktop-window.webp) | [After](screenshots/after-desktop-window.webp) | 859 → 793 | 10 |
| desktop-cabinet-0 | [Before](screenshots/before-desktop-cabinet-0.webp) | [After](screenshots/after-desktop-cabinet-0.webp) | 821 → 755 | 0 |
| desktop-cabinet-0.25 | [Before](screenshots/before-desktop-cabinet-0.25.webp) | [After](screenshots/after-desktop-cabinet-0.25.webp) | 821 → 755 | 0 |
| desktop-cabinet-0.5 | [Before](screenshots/before-desktop-cabinet-0.5.webp) | [After](screenshots/after-desktop-cabinet-0.5.webp) | 821 → 755 | 0 |
| desktop-cabinet-1 | [Before](screenshots/before-desktop-cabinet-1.webp) | [After](screenshots/after-desktop-cabinet-1.webp) | 821 → 755 | 0 |
| desktop-drawer-0 | [Before](screenshots/before-desktop-drawer-0.webp) | [After](screenshots/after-desktop-drawer-0.webp) | 879 → 818 | 10 |
| desktop-drawer-0.5 | [Before](screenshots/before-desktop-drawer-0.5.webp) | [After](screenshots/after-desktop-drawer-0.5.webp) | 879 → 818 | 0 |
| desktop-drawer-1 | [Before](screenshots/before-desktop-drawer-1.webp) | [After](screenshots/after-desktop-drawer-1.webp) | 879 → 818 | 21 |
| desktop-floor-shadow | [Before](screenshots/before-desktop-floor-shadow.webp) | [After](screenshots/after-desktop-floor-shadow.webp) | 863 → 806 | 0 |
| desktop-documents | [Before](screenshots/before-desktop-documents.webp) | [After](screenshots/after-desktop-documents.webp) | 880 → 814 | 2 |
| desktop-plant | [Before](screenshots/before-desktop-plant.webp) | [After](screenshots/after-desktop-plant.webp) | 818 → 774 | 7 |
| mobile-corridor | [Before](screenshots/before-mobile-corridor.webp) | [After](screenshots/after-mobile-corridor.webp) | 1031 → 943 | 37 |
| mobile-side-door-01 | [Before](screenshots/before-mobile-side-door-01.webp) | [After](screenshots/after-mobile-side-door-01.webp) | 858 → 785 | 0 |
| mobile-side-door-02 | [Before](screenshots/before-mobile-side-door-02.webp) | [After](screenshots/after-mobile-side-door-02.webp) | 801 → 735 | 0 |
| mobile-side-door-03 | [Before](screenshots/before-mobile-side-door-03.webp) | [After](screenshots/after-mobile-side-door-03.webp) | 800 → 734 | 0 |
| mobile-overhead | [Before](screenshots/before-mobile-overhead.webp) | [After](screenshots/after-mobile-overhead.webp) | 711 → 645 | 0 |
| mobile-entry-front-0.25 | [Before](screenshots/before-mobile-entry-front-0.25.webp) | [After](screenshots/after-mobile-entry-front-0.25.webp) | 881 → 819 | 0 |
| mobile-entry-back-0.25 | [Before](screenshots/before-mobile-entry-back-0.25.webp) | [After](screenshots/after-mobile-entry-back-0.25.webp) | 871 → 783 | 34 |
| mobile-entry-front-0.5 | [Before](screenshots/before-mobile-entry-front-0.5.webp) | [After](screenshots/after-mobile-entry-front-0.5.webp) | 882 → 820 | 3 |
| mobile-entry-back-0.5 | [Before](screenshots/before-mobile-entry-back-0.5.webp) | [After](screenshots/after-mobile-entry-back-0.5.webp) | 871 → 783 | 47 |
| mobile-entry-front-1 | [Before](screenshots/before-mobile-entry-front-1.webp) | [After](screenshots/after-mobile-entry-front-1.webp) | 882 → 820 | 0 |
| mobile-entry-back-1 | [Before](screenshots/before-mobile-entry-back-1.webp) | [After](screenshots/after-mobile-entry-back-1.webp) | 871 → 783 | 32 |
| mobile-desk-on | [Before](screenshots/before-mobile-desk-on.webp) | [After](screenshots/after-mobile-desk-on.webp) | 801 → 757 | 0 |
| mobile-desk-off | [Before](screenshots/before-mobile-desk-off.webp) | [After](screenshots/after-mobile-desk-off.webp) | 801 → 757 | 0 |
| mobile-room-on | [Before](screenshots/before-mobile-room-on.webp) | [After](screenshots/after-mobile-room-on.webp) | 825 → 759 | 0 |
| mobile-room-off | [Before](screenshots/before-mobile-room-off.webp) | [After](screenshots/after-mobile-room-off.webp) | 825 → 759 | 0 |
| mobile-window | [Before](screenshots/before-mobile-window.webp) | [After](screenshots/after-mobile-window.webp) | 855 → 789 | 0 |
| mobile-cabinet-0 | [Before](screenshots/before-mobile-cabinet-0.webp) | [After](screenshots/after-mobile-cabinet-0.webp) | 829 → 763 | 0 |
| mobile-cabinet-0.25 | [Before](screenshots/before-mobile-cabinet-0.25.webp) | [After](screenshots/after-mobile-cabinet-0.25.webp) | 829 → 763 | 0 |
| mobile-cabinet-0.5 | [Before](screenshots/before-mobile-cabinet-0.5.webp) | [After](screenshots/after-mobile-cabinet-0.5.webp) | 829 → 763 | 0 |
| mobile-cabinet-1 | [Before](screenshots/before-mobile-cabinet-1.webp) | [After](screenshots/after-mobile-cabinet-1.webp) | 829 → 763 | 0 |
| mobile-drawer-0 | [Before](screenshots/before-mobile-drawer-0.webp) | [After](screenshots/after-mobile-drawer-0.webp) | 801 → 757 | 0 |
| mobile-drawer-0.5 | [Before](screenshots/before-mobile-drawer-0.5.webp) | [After](screenshots/after-mobile-drawer-0.5.webp) | 801 → 757 | 0 |
| mobile-drawer-1 | [Before](screenshots/before-mobile-drawer-1.webp) | [After](screenshots/after-mobile-drawer-1.webp) | 801 → 757 | 0 |
| mobile-floor-shadow | [Before](screenshots/before-mobile-floor-shadow.webp) | [After](screenshots/after-mobile-floor-shadow.webp) | 801 → 757 | 0 |
| mobile-documents | [Before](screenshots/before-mobile-documents.webp) | [After](screenshots/after-mobile-documents.webp) | 858 → 792 | 0 |
| mobile-plant | [Before](screenshots/before-mobile-plant.webp) | [After](screenshots/after-mobile-plant.webp) | 765 → 721 | 0 |
