# Directed usability audit and wall-edge reader fix

Baseline: b87fbb63a6a289ecc530369f714b8730d32a10ce. Started18 October2026 UTC. Installed Edge 155.0.4283.62. This is the implementing agent's directed task walkthrough, not a study with live HR/recruiters/developers, a screen-reader evaluation, or evidence of hiring/conversion outcomes. Known task labels/locators guide automation; no human time-to-find score is claimed.

## Audit result and change scope

All12 live baseline profiles completed the HR and developer tasks in both versions: RU/KK/EN x light/dark x desktop keyboard/touch emulation. No additional confirmed navigation barrier was found in these tasks. There are no new sections, decoration, copy changes or project changes. The only functional fix is the independently suggested and then physically reproduced P2 wall-document edge refusal.

| Task | Evidence/result |
|---|---|
| Find specialization and stack | Role, React and TypeScript present in the first hero view in12 profiles. |
| Find practices | About navigation reaches experience; separate iQADAM2025, iQADAM2026 and ADO periods remain in both versions. |
| Find education | Two institutions and their full approved descriptions accessible; compact three-document row retained. |
| Obtain resume |24 actual ordinary/native PDF downloads match the approved public file SHA. |
| Find contacts | Email and LinkedIn links present in both versions; no mail client or message send activated. |
| Project -> case -> demo -> repository |12 profiles, rotating Helio/Keyform/Rowline, ordinary and native routes;48 real landing-page opens, allHTTP200 with correct destinations and no opener. |
| Completeness | Nine ordinary catalog entries, six native cases, original limits/details, all three languages and theme preferences retained. |

[Audit receipt](audit/checks.json) contains the native Tab/ShiftTab/Enter steps, actual touch taps/controlled scrolls and external destinations.559 recorded successful assertions include7 preserved partial observations from an earlier driver attempt; acceptance is the12 fully completed profile records. Completed desktop profiles were reused after QA-only driver corrections, with each executed source SHA retained. External apps were opened only to verify the landing/navigation; CSV behavior, implementation and README work remain outside this package. No other repository was changed.

| Profile | Selected case | ordinary demo / code / native demo / code HTTP |
|---|---|---|
| keyboard-desktop-ru-light | helio | 200 / 200 / 200 / 200 |
| keyboard-desktop-ru-dark | keyform | 200 / 200 / 200 / 200 |
| keyboard-desktop-kk-light | rowline | 200 / 200 / 200 / 200 |
| keyboard-desktop-kk-dark | helio | 200 / 200 / 200 / 200 |
| keyboard-desktop-en-light | keyform | 200 / 200 / 200 / 200 |
| keyboard-desktop-en-dark | rowline | 200 / 200 / 200 / 200 |
| touch-ru-light | helio | 200 / 200 / 200 / 200 |
| touch-ru-dark | keyform | 200 / 200 / 200 / 200 |
| touch-kk-light | rowline | 200 / 200 / 200 / 200 |
| touch-kk-dark | helio | 200 / 200 / 200 / 200 |
| touch-en-light | keyform | 200 / 200 / 200 / 200 |
| touch-en-dark | rowline | 200 / 200 / 200 / 200 |

## Confirmed P2 and fix

On the actual live baseline, an eligible canvas ray hit a visible part of the wall print, but reader opening then called documentBounds. That method required projectedAction at the document's centre, with its marker/frustum inset. The second centre test could reject a legitimate pressed surface. The following poses used only the native cabinet menu and look keys; there was no camera teleport, capture pose, or eligibility override. A read-only observer measured the actual ray and projection.

| Profile | Document | Centre x,y px | Actual hit x,y px | Ray distance | Reader before -> candidate |
|---|---|---:|---:|---:|---|
| desktop1440x900 | diploma | 204.47, 26.56 | 54.68, 120.92 | 2.581m | false -> true |
| touch390x844 | certificate | 417.10, 302.50 | 367.31, 333.17 | 3.593m | false -> true |

Desktop centreY26.56 was above the36px marker inset; touch centreX417.10 was outside the390px viewport. Both actual print hits were inside the original4m limit. [Baseline evidence](before/checks.json); [same-pose candidate](same-pose-after/checks.json); [raw comparisons](VISUAL-REVIEW.md).

The main module now forwards the original pressed surface record. canReadDocument revalidates that same record using the unchanged surfaceProjection -> hitAt path, preserving zone, distance, frustum and nearest-surface occlusion checks. Keyboard/semantic actions keep the existing centre-marker eligibility. Animation bounds are separate and optional: a valid action still opens the full reader if its projection is unavailable, with animation omitted. Existing normal240/180ms transitions and reduced motion remain.

No camera path, damping, physics, render loop, model, texture, light/shadow rule or resolution setting changed. [Exact source reversal](source-proof.json) removes only the reader-specific changes and asserts equality with baseline main/UI.20 protected files/inputs and all526 locale keys per language are unchanged. Original resume, diploma, certificates and redactions remain byte-identical. Public/docs copies agree. [289 archived baseline files match Git](baseline-proof.json).

## Regression evidence

[Wall-edge suite](edges/checks.json): 156 assertions over four desktop/touch and normal/reduced profiles, all three documents, actual visible-edge actions, deliberately unavailable centre markers, keyboard entry, focus return and projection fallback. Native camera movement also verifies an in-room, in-frustum print beyond4m is refused (observed 4.438-4.626m), followed by corridor/stale-marker refusal.

The occlusion negative introduces a temporary opaque test plane between the camera and the already pressed point. The same surface is rejected and physical release cannot open it; removing the plane restores authorization. The plane is disposed before positive captures. A separate explicit failure injection replaces only optional projection to test fallback. These diagnostic injections are never used for positive repros, never change authorization, and are not shipped as assets or application code.

[All 39 regression jobs](regressions/verification.json) ended with latest exit0: the prior37 suites plus the new edge suite and reader touch suite. Six source-independent receipts transfer from the previous published QA after exact ordinary-runtime and script SHA comparison; all native-room suites reran on this candidate. Coverage includes932 native assertions, physical gates, cabinet/handles/cube, strict shadows, CV, previews, context loss/fallback, modal/entry, language/theme/content and certificate/strip checks. [Reader](reader/checks.json) covers eight profiles,24 document opens and four negatives. [Touch reading](touch/checks.json) includes20 native pan/motion assertions. [Build receipt](build.json): build-pages, TypeScript and asset-history build all passed without altering the verified runtime bytes.

[Executed sources and SHA provenance](qa-script-provenance.json) includes transferred receipts, failed attempts and mixed-source resumed audit profiles. Diagnostics retain the initial wrong native-demo selector, a QA-only project-rotation error, a fast synthetic fling that overshot headings, a lazy-dialog first-touch query that waited incorrectly, and a boundary test sampled during normal camera damping. Corrections affected drivers only: controlled scrolling, a settled orientation and an actual visible hit at least16px inside the viewport. The original marker,4m, occlusion, corridor and shadow thresholds were not relaxed. Failed raw receipts remain; they were not relabeled as passes.

## Supplementary readiness

Initial navigation captures can precede asynchronous content: one Keyform landing showed its3D loading label and one education capture showed an image placeholder. These were not treated as website faults or proof of ready content. Separate read-only desktop/touch observations wait for the Keyform canvas/loader and native diploma decode, then capture the ready originals in [demo-ready/checks.json](demo-ready/checks.json). No project configuration, model or portfolio styling was changed for these observations.

## Visual evidence and limits

[Original-frame links](VISUAL-REVIEW.md) and [actually viewed hashes](visual-reviewed.json) distinguish viewed originals from supporting captures. PNGs are unedited; selected audit frames and all final edge frames are published. The full remaining capture set is retained locally. This audit does not claim a new independent52-frame geometry review; the unchanged accepted geometry and earlier [review](../object-roles-2026-10-16/VISUAL-REVIEW.md) remain relevant.

Edge touch emulation is not physical Android or Safari. Those and screen-reader testing remain deferred. No performance speedup is claimed for this input fix; render/camera/resolution code is unchanged. The existing native Edge kinetic-scroll behavior can consume a tap to stop a fling; toolbar closure is checked after actual scroll quiescence. The controlled task driver is not evidence of human search time or comprehension.

LIVE_VERIFICATION_PENDING
