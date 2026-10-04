# Audit 2 — design, accessibility, loading (version 10)

Auditor: independent Codex subagent `v10_design_audit`. Preview: `http://127.0.0.1:5202/`, built `docs/`, 4 October 2026. Source, Git and external applications were read-only. Test scripts and evidence were written only under `qa-private/v10/audit-2/`.

## Outcome before corrections

The concise composition meets the supplied visual brief: floating compact navigation, huge outlined name, pale hero in the light theme, dark asymmetric three-project gallery and short contact CTA. Real project images replace decorative stand-ins. Long project explanations are behind native disclosures. No portrait or Atyrau photograph is present. Poslesvet is an explicitly approved featured game project; the former Krasnaya Nit hobby section is absent.

Four issues were found before corrections. They are fixed and independently rechecked, including the subsequently discovered covered Helio plus control on tablet widths. The small identity touch target was also enlarged. **No blocking findings remain within this audit's tested scope.** Image compression remains optional.

| Priority | Finding | Actual evidence | Suggested correction |
|---|---|---|---|
| P2 | Keyform CSS crop shows the truncated original page heading, “ю клавиатуру”, at the top left, on desktop and mobile. This is visible clutter in the principal gallery image. | `audit-2/1366-ru-light-gallery.png`, `audit-2/390-kk-dark-gallery.png`; source image inspected, 1440×1026. | Move the crop down past the heading or use a correctly composed real scene capture. Keep the keyboard layers fully visible. |
| P2 | At 1024 and 820 pixels, Poslesvet's art overlaps the left edge of Keyform's Details summary and hides the beginning of its label. Center-point hit tests passed, which does not remove the visual failure. | `audit-2/1024-kk-dark-gallery.png`, both `820-*-gallery-sheet.png` contact sheets. | Narrow/reposition Poslesvet or widen the separation of its art and the preceding summary. Check summary edges, not only midpoint. |
| P2 | The informational hero name automatically moves for 9 seconds ×3 iterations (27 seconds); no on-page pause/stop mechanism is available. Reduced motion correctly disables it, but the default animation still exceeds five seconds. | CSS and native computed `name-drift` checked. [W3C SC 2.2.2](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html) requires a user control for nonessential automatically moving content continuing beyond five seconds alongside other content. | Limit total automatic animation to ≤5 seconds to retain the effect without adding visible controls, or provide a real pause mechanism. |
| P2 | Keyboard opening the mobile navigation, followed by keyboard opening Appearance, leaves both panels open. Appearance covers the Projects/Experience links. Pointer interactions already close the other panel. | `audit-2/mobile-keyboard-two-popovers.png`, `audit-2/extra-results.json`: both details `open:true`. | Make opening either popover close the other for both pointer and keyboard activation. |
| P3 | Mobile identity link is 32.16×20 CSS pixels. There is generous spacing, so this is not asserted as a WCAG spacing failure. Its hit area can comfortably be enlarged. | All six390px cases in `results.json`, `closed.small`. | Set a 44px minimum identity hit height, centering the mark. |
| P3 | All three lazy PNGs are fetched during the initial load in native Chromium due to proximity prefetch. Their total source size is 1,155,887 bytes; mobile downloads the same files. | `audit-2/results.json`, actual resource timing/request records. | Optional responsive/lossless WebP derivatives or appropriately smaller scene captures. Keep attribution legible and retain the original source evidence. |

## Executed checks

- 24 ordinary cases: widths 1366/1024/820/390 ×RU/KK/EN ×light/dark; actual Windows Chromium and mobile touch emulation. Viewport height 768 for laptop/intermediate cases and 844 for mobile.
- Six 320px cases with root font size 200%, all three languages and two themes. No document or interactive-target overflow while disclosures are closed or additional projects are open.
- Correct actual document language/theme, reduced-motion `animationName:none`, featured details open/explicit close and focus restoration. All three featured cards' interactive center points were uncovered, including after disclosure expansion.
- Selected axe WCAG2A/2AA/2.1AA rules: zero violations in all 24 ordinary cases. Zero uncaught page errors.
- Additional expanded Education, Additional Projects and real WebGL diagram selected axe: zero violations. Optional diagram at 320px, Kazakh and 200% root text remained within the 320px viewport, selected axe zero violations.
- Hero motion pauses when it is fully outside the viewport. Scrolling only to Work leaves the bottom of Hero visible because of scroll padding; an unpaused hero in that position is expected.
- Native screenshots for every ordinary hero/gallery/contact state and all six 320px cases. The auditor viewed direct1366RUlight hero/gallery,1024KKdark gallery,390RUlight hero,390KKdark gallery,320KKlight whole route, the keyboard-popover defect, and the three-language light/dark hero/gallery/contact contact sheets for laptop/mobile plus intermediate hero/gallery sheets. Contact sheets are browser-rendered reductions of these own native PNGs, not reference images.

## Loading observations

Two fresh Chromium contexts, 1366px and 390px, inspected actual requests and PerformanceObserver records on localhost. The main bundle decoded size is 86,216 bytes, CSS 63,704 bytes. No scene bundle request occurs before the optional diagram is explicitly opened. Opening it fetches 603,151 decoded bytes and successfully initializes the canvas.

Local initial observations: LCP 112ms/116ms; accumulated CLS 0.00770/0.00101; zero initial long tasks. Initial subresource transfer totals were 1,266,741/1,292,521 bytes (these exclude the document itself). These are observations from a fast local preview, **not** public-network Core Web Vitals or a Lighthouse score. Full observations are in `audit-2/results.json`.

A second actual Chromium run applied CDP network simulation of 1.6Mbit/s download, 0.5Mbit/s upload and 150ms latency, with 4× CPU slowdown and disabled cache. First-fold LCP was 1136ms/900ms, CLS 0/~0.000003. The longest initial main-thread task was 283ms/85ms. All three mobile images completed by approximately 6.74s, while the hero had already rendered and the optional scene had not been requested. Both resulting native hero PNGs were viewed. This is a simulated local observation, not a physical-phone measurement or public-network score; details are in `audit-2/throttle-results.json`.

## Limits and recheck

No physical phone, Safari or screen reader was tested. Axe covers selected automated rules, not complete accessibility conformance. The parent and researcher viewed the TikTok reference; this Windows auditor used the approved brief and does not claim independent reference viewing. External demo functionality and publication are handled by the separate final regression/live audit.

The first independent correction recheck repeated 24 language/theme/width cases and selected axe checks. It verified 44×44px identity targets, mutually exclusive keyboard-opened panels in 12 directions/language/theme cases, 4.5s×1 hero animation, no remaining animation after five seconds, and removal of the large cropped Keyform heading. Poslesvet no longer obscures Keyform's summary. See `audit-2/recheck-results.json` and `fixed-*-gallery.png`.

The expanded test deliberately checked the left edge, ten-percent point, midpoint and right edge of every featured summary. At 820/1024, Helio's right edge returned Keyform's image instead of Helio's summary; the actual visible plus control was covered. This is confirmed by `audit-2/helio-edge-hit.json` and the native viewport PNG `audit-2/helio-edge-hit.png`. The final correction narrows Helio's metadata/disclosure at tablet widths. Keyform now has a clean keyboard-scene crop, without the residual body caption. The original matrix results and defect screenshots remain retained unchanged.

## Final independent recheck — passed

The coordinated final build was checked on 4 October 2026, with `docs/index.html` SHA256 `f7157271145dacd112fb41f5ffb3810f2a20c8bf94fc6ddb23166178119b3c99` unchanged throughout the run. Its served asset names are `index-ztZL-Kql.css`, `index-DytlbY27.js` and optional `scene-BFmPUJMD.js`.

- **24/24 targeted cases passed:**1366/1024/820/390 ×three languages ×two themes. All four points on all three featured summaries were uncovered, including Helio's right-side plus and Keyform's left-side label on the tablet widths.
- No document overflow, zero selected axe violations and zero uncaught page errors in these 24 cases. The identity hit area is at least 44×44 CSS pixels in every case; reduced-motion still disables the hero animation.
- All 12 keyboard directions/language/theme popover cases passed: opening one closes the other. Normal-motion hero animation is 4.5 seconds ×one iteration; no animation remains active after five seconds.
- **Six final 320px/200% root-text cases passed:**all languages/themes, document width 320 and no interactive target outside the viewport. The native Kazakh-light hero and English-dark contact viewport PNGs were viewed. At this enlarged text setting actions continue vertically by scrolling; the test does not claim both actions fit in the first viewport under enlarged text.
- Actual final Keyform desktop/mobile crop pixels, 1024KKdark gallery and 820ENlight gallery pixels were viewed. The keyboard's full stacked construction fits and no truncated source heading/body caption remains. The two tablet summary separations are visible. Full-gallery element screenshots can include the fixed header or offscreen skip-link in their expanded screenshot viewport; individual crop screenshots and ordinary viewport defect evidence distinguish that capture artifact from live interactive coverage.

Final machine results: `audit-2/final/recheck-results.json` (`passed:true`, `stable:true`) and `audit-2/final/text200-results.json`. Final native PNGs are in the same directory, including `fixed-1366-ru-light-keyform-crop.png`, `fixed-390-kk-dark-keyform-crop.png`, `fixed-1024-kk-dark-gallery.png` and `fixed-820-en-light-gallery.png`.

Publication may proceed within this audited scope. Physical devices, Safari, screen readers and public-network Core Web Vitals remain untested; the separate final regression/live audit covers deployment and outbound demo links.
