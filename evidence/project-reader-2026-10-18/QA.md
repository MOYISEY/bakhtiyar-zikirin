# Project briefs and wall document reader - 18 October2026

Baseline: d3527d9818d849027f9607643d9115994ce48e46, published main at start. [289 archived docs files match Git](baseline-proof.json). [Final runtime SHA/job receipts](regressions/verification.json); [artifact hashes](artifacts.json).

## Changes

The home showcase presents Helio, Keyform and Rowline. Purpose replaces repeated stack text below each name at the existing14px scale. Each has a short task / implementation / result brief and a caption describing the real application frame. These describe existing implementation; no new ownership, commercial impact or efficiency claims are made. [Source mapping](source-proof.json) refers to pre-existing locale keys. All old locale values, project facts, CV, original document files, redactions and separate iQADAM2025/2026 practice records are preserved.

Three case pages put the brief before the first image, with prior facts and limitations retained in native details. The room uses the same brief; all six native projects and nine ordinary catalog cases remain. Role, skills, works, CV and contacts are verified across12 desktop/touch language/theme combinations. This is directed functional/readability QA, not an HR user study or conversion measurement. Existing calm type and compact certificate row remain.

An explicit physically eligible wall-print action opens a native HTML dialog. The original sheet moves from the existing print projection for240ms and returns for180ms; reduced motion disables it. The camera stays held while reading. Fit shows the full sheet;100% uses original pixels and native two-axis scrolling. Close/Escape returns focus to the actual initiator; original-file link and language controls remain. Touch starts over readable text. WebGL loss focuses the ordinary-view fallback. Resize cancels sheet motion and adapts the reader; closing preserves native responsive scene framing. Full originals load on demand; startup adds no package, model, texture map or separate module request.

## Verification

[Acceptance](reader-acceptance.json):12 ordinary combinations (desktop/touch x RU/KK/EN x light/dark),8 final native cases,24 document opens and4 negatives. Six native cases use localized reduced motion; two use normal motion with lamp off. Checks include source-image hashes, four fit boundaries,100% reading, language, focus, pose and zero held render/shadow increments. [Touch/motion](touch/checks.json): 20 checks, actual CDP touch pans at320/390px and landscape, plus observed240/180ms animations.

All 37 jobs in the final sequential regression checkpoint exited0. Source-independent receipts transferred with identical script and ordinary-build hashes: pages, pages-edges, pages-nojs, showcase-current, cube, asset-history. Every native-room job was rerun on final main.js. Coverage includes932 assertions in the native action suite, cube invariants, geometry/sweep/furniture/handles/cabinet constraints, strict shadows, physical access gates, menus, previews/documents, fallback/context loss, CV/content matrix, modal/entry/touch context and prior certificate/strip checks. [Executed-script provenance](qa-script-provenance.json).

Unsuccessful attempts remain. Early fit cropping was corrected before release. Initial QA selected an ambiguous CV link. Normal-motion damping required an explicit1e-6m camera-only numerical tolerance. The old full report after/checks.json remains FAIL for an incorrect portrait/landscape pose assumption; only its completed ordinary groups transfer. All native groups are superseded by [native/checks.json](native/checks.json). Access QA changed wall expectation from generic panel to reader and strengthened negative corridor/stale checks. No physical gate or shadow thresholds were relaxed. Interrupted UX output was preserved; it resumed after reconnect and process/hash checks. A final CV run passed all six profiles but timed out during the early-dialog entry check. Directed before/after probes both entered successfully; the test now explicitly awaits native dialog close and held=false before sending Enter. All72 assertions remain and the full synchronized rerun passed. The extra320px touch test initially tapped close during native kinetic scrolling. An event probe observed pointer/touch on the button without a generated click. After waiting for200ms of actual coordinate quiescence, all20 assertions passed. Product handlers are unchanged; in Edge a tap during an ongoing fling can first stop scrolling. The archived failure and executed pre-wait source remain under diagnostics/qa-source.

The unchanged modal regression exposed2.5mm residual against its2mm threshold. A baseline control passed, but also parked short of its target: the fixed90-RAF-frame stop depended on refresh rate. Final code retains90frames, then permits bounded completion toward the same position target (0.1mm /1.5 simulation seconds), frozen during modal hold. All14 final modal checks pass with the original2mm threshold. Old candidate failure/control remain in legacy-artifacts. This changes only completion: movement equations, paths, world geometry, lights, constraints and shadows remain. [Source proof](source-proof.json) reverses only the read-only document projection and exact settle addition, then asserts baseline main.js equality.18 original inputs/files are checked, with JSON CRLF/LF differences explicit;16 new brief keys per language are accounted for.

Build-pages, TypeScript --noEmit and the asset-history build completed. Prior six hashed assets are retained. Previously accepted [geometry review](../object-roles-2026-10-16/VISUAL-REVIEW.md) applies to unchanged world/model code; this is not52 newly reviewed geometry frames.

## Matched cold observations

Installed headless Edge 155.0.4283.62; desktop1440x900 DPR1; touch emulation390x844 DPR1.75. Fresh context/disabled HTTP cache, CDP40ms latency,10Mbps down/2Mbps up, CPU1x, muted audio. Serial before/after, one sample per profile/route; OS/driver/shader caches not purged. Encoded bytes sum ResourceTiming plus navigation; counts use actual request events by the initial sample. Ordinary observation is LCP; room is fullSceneAt. Single samples do not establish speed improvement.

| Profile / route | Encoded bytes before -> after | Delta bytes | Initial requests | Observation ms |
|---|---:|---:|---:|---:|
| desktop / ordinary | 254406 -> 255601 | 1195 | 11 -> 11 | 364.00 -> 376.00 |
| desktop / room | 7905796 -> 7910528 | 4732 | 97 -> 97 | 10104.60 -> 10302.70 |
| touch / ordinary | 243866 -> 245061 | 1195 | 10 -> 10 | 312.00 -> 268.00 |
| touch / room | 7905796 -> 7910528 | 4732 | 97 -> 97 | 8273.10 -> 8258.90 |

| Profile / view | Calls before -> after | Triangles before -> after | Rendered RAF callback median/p95 ms | RAF gap median/p95 ms |
|---|---:|---:|---|---|
| desktop / desk | 129 -> 129 | 198831 -> 198831 | 1.60/2.10 -> 1.50/2.10 | 6.90/7.10 -> 6.90/7.10 |
| desktop / window | 74 -> 74 | 165840 -> 165840 | 1.30/1.60 -> 1.10/1.50 | 6.90/7.10 -> 6.90/7.10 |
| touch / desk | 770 -> 770 | 1100263 -> 1100263 | no rendered samples -> no rendered samples | 6.90/7.10 -> 6.90/7.10 |
| touch / window | 71 -> 71 | 150282 -> 150282 | 1.20/1.60 -> 1.40/2.40 | 6.90/7.10 -> 6.90/7.10 |

Each settled desk/window sample spans4seconds. RAF callback duration is not GPU time. With zero rendered samples renderer.info retains the last startup count; these values are not measured FPS. Canvas buffers match, with no resolution reduction. Cancellation events preserved: before/desktop: 11; before/touch: 12; after/desktop: 15; after/touch: 12. [Decoded-model audit](model-audit.json) verifies14 actual decompressed GLB hashes and all startup phases in both versions/profiles. This change targets reading and document interaction, not geometry batching. Remaining calls/triangles are a workload risk, not proof of lag.

## Evidence and limits

[Comparable frames](VISUAL-REVIEW.md); [actually viewed original PNG hashes](visual-reviewed.json). Case-top starts at scrollY=0; older captures after details toggles may show lower page sections. Preview frames are existing real app images. No independent external review claimed. Installed Edge/touch emulation only; physical Android, Safari and screen-reader checks remain deferred. Demo QA verifies genuine actions and safe URL opening, not a full regression of external applications.

## Live publication

Functional commit [024acc9831db61c7ddfdb21e8496a5b82314ca6f](https://github.com/MOYISEY/bakhtiyar-zikirin/commit/024acc9831db61c7ddfdb21e8496a5b82314ca6f) deployed with [Pages success](https://github.com/MOYISEY/bakhtiyar-zikirin/actions/runs/39172531953). Exact head and96 bare/cache-busted responses match Git, including current/previous assets. [Receipt](live/deployment-functional.json).

[Live verification](live/verification/verification.json) passed:4 directed ordinary profiles,3 native profiles (391 assertions),20 touch/motion checks,2 audits of14 decoded models and4 cold navigations. This is a live subset; the full12+8 matrix ran locally. Cold live has zero JS errors, HTTP errors and requestfailed, with all phases ready; [receipt](live/cold/smoke.json). [Actually viewed live PNGs](live/visual-reviewed.json).

The following QA-only commit preserves docs tree f3c562e68c3a35f4919cda828684d4f8ae0ad37c. Its exact Pages head/live-file receipt is checked after publication and stored outside the self-referential commit.
