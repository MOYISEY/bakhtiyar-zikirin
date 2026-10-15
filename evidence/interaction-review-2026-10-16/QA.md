# QA — room access, documents and selected projects

Acceptance date: 15 October 2026 UTC. Baseline: `ef768d519efee829bd283e6196ece82a446c202a`. These reports describe the tested local build; exact GitHub Pages deployment and live-file verification are supplied in the release result.

## Implemented scope

- One physical access decision covers rays, hover, HTML pointer actions, keyboard/click and release. Camera must be inside the room, within reach and have an unobstructed physical target. Scroll progress is not the access rule. Door control and intentional menu navigation remain available. Normal reach is 4 m; the accepted workspace cord is about 4.29 m away and retains a 4.5 m limit.
- The drawer has one CV sheet and one diploma sheet. The former CV/contact frame now displays the genuine HackAlem AI participation certificate and existing iQADAM certificate. The brief developer book links to canonical experience instead of repeating a full CV. All three document records are shared by the ordinary and 3D versions; full scans load only on explicit opening.
- HackAlem copy says participation, Astana, 14 October 2026. The user authorised the public derivative with their name; QR verification information is removed. The original PDF is not published. Logos are not treated as issuer/endorsement proof; no win, course completion or professional certification is claimed. [Provenance](../../public/files/education/hackalem-2026-provenance.json).
- Compact persistent 44 px captions identify cube/robot/orbit and certificates, with no duplicate hover caption. Cabinet handles follow the real bifold mechanism under drag, reversal and cancellation. The cube's optional face mode uses actual coloured stickers and the existing legal quarter-turn model; orbit, tap, keyboard and buttons remain available.
- The ordinary homepage uses a large selected preview and five visible project names. It replaces the rail, arrows, counter, hint, drag/snap code and static duplicate Helio hero. Desktop has preview/list columns; mobile has a vertical title list, native vertical scrolling and supplementary horizontal preview swipe. Crossfade is 180 ms, instant under reduced motion; no autoplay. All nine real catalog cases remain.
- The exact user-provided LinkedIn URL appears once in ordinary contacts and once in the room contact UI. The LinkedIn profile was not edited.

## Checks and preserved quality

All 17 previous regression suites and five additional suites passed (22 jobs): [sequence](reports/regressions.json). Highlights:

| Check | Result |
|---|---|
| Pure cube legality | 3,025 checks / 2,076 turns |
| Shared object access | 144 checks / 16 samples |
| Final documents, captions, face gestures, LinkedIn | 158 checks / four profiles |
| 320 px touch and document transitions | 41 checks |
| Cabinet native drag/cancel/reverse | 112 checks / four profiles |
| Existing furniture/cord/keyboard | 121 checks / four profiles |
| Actual document geometry / rays | 917 checks / 101 positions |
| Existing directed room UX | 557 checks / 101 positions |
| Partial drawer on 320/390 px | 156 checks / 42 samples |
| WebGL document fallback | 36 checks / six cases |
| Ordinary pages / flows | 132 route cases / 12 flows |
| Selected-project keyboard/touch/themes/languages | 292 checks / 12 variants |
| Cached/fresh shadows | 158 checks / 76 samples, strict RMSE pass |

After the 22-suite run, one UI line clarified that a new diploma opening resets a previously selected certificate. Final 158- and 41-check runs explicitly cover both the semantic label and the actual native paper after a certificate; tab/language preservation remains tested. The shaders and geometry did not change after that run.

[28 preserved sources/documents](reports/preserved.json) include Blender, every furniture/accent GLB, the approved resume PDF/source and both existing public education documents. Binary hashes are exact; one JSON metadata checkout has Windows line endings, transparently recorded and compared with LF normalisation. No other repository, resume facts, lighting, image resolution or authored furniture geometry was changed.

At 320 px the handles of a fully open cabinet can be physically outside the viewport. The access rule hides those proxies and the tested explicit cabinet menu remains available. Native handle dragging is verified at 390 px and desktop. No wider camera or miniature redesign was introduced to hide this limitation.

One executor transport interruption stopped the running furniture job; completed checkpoints were retained and only pending jobs resumed. Initial test assumptions about node-side viewport access, smooth-scroll settling and an offscreen handle were corrected with their failure reports retained privately. Product acceptance does not count those attempts as passes.

## Evidence and reproduction

- [Performance and limitations](PERFORMANCE.md), [raw runtime/build fingerprints](verification.json).
- [Comparable real frames](VISUAL-REVIEW.md), [exact room matrices](frames.json).
- Final native interaction frames: [desktop cabinet](interaction-frames/desktop-no-preference-cabinet.png), [touch cabinet](interaction-frames/mobile-no-preference-cabinet.png), [HackAlem public copy](interaction-frames/desktop-no-preference-hackalem.png), [touch cube](interaction-frames/mobile-no-preference-cube.png).
- Existing [joinery review](../detail-review-2026-10-15/QA-2026-10-15.md) and [loading diagnosis](../loading-review-2026-10-15/QA-LOADING.md) remain available.

Build with `npm run build`. Archive the baseline `docs` from the exact commit above into a separate directory. Set `QA_BASELINE_DOCS` to that archived `docs` directory, then run `node scripts/qa-room-review-server.cjs` in one terminal. This binds localhost:4331; `/before/` and `/after/` share identical gzip/no-store delivery.

In another PowerShell terminal, point both `ROOM_BROWSER` and `PLAYWRIGHT_BROWSER_EXECUTABLE_PATH` at installed Edge. Run the existing regression commands against `http://127.0.0.1:4331/after/`; the precise 22 job arguments are in reports/regressions.json. Set a fresh `QA_EVIDENCE_VERSION` to keep previous results. New checks are `qa-room-interaction-access.cjs`, `qa-room-content-interactions.cjs` (also `--small`), `qa-room-handles.cjs` and `qa-project-showcase.mjs`.

For serial A–B–B–A, set a different `PERF_OUTPUT` directory before each command: `node scripts/qa-room-performance.cjs before 1`, `after 1`, `after 1`, `before 1`. The script fixes CDP conditions, fresh contexts, viewport/DPR and observation windows. Capture both versions with `node scripts/qa-room-interaction-capture.cjs before` and `after`. Use `ASSET_QA_OUTPUT` for a fresh file when running `node scripts/qa-room-cold-assets.cjs`. Expected complete results: eight runs per version in aggregated performance, eight unthrottled asset cases, twenty exact-matrix room pairs and four ordinary pairs.

Physical Android and Safari were deferred by the user and are not claimed. Headless touch emulation, callback CPU timings and real WebGL screenshots have the limits described in PERFORMANCE.md.
