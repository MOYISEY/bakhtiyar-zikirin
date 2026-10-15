# Performance comparison with ef768d5

Baseline: `ef768d519efee829bd283e6196ece82a446c202a`. Candidate: the runtime fingerprints in [verification.json](verification.json), released with this report.

Installed Edge, serial A–B–B–A: two runs per version/profile/route (16 cold navigations). Desktop 1440×900 DPR1; touch emulation 390×844 DPR1.75. Fresh context and disabled HTTP cache per navigation; CDP 40 ms, 10 Mbps download, 2 Mbps upload, CPU1x. Same local gzip/no-store server and full published assets. Driver/shader caches were not flushed. CPU means synchronous render-callback duration, not GPU execution time or physical display FPS.

## Cold navigation

Bytes include navigation plus resource transferSize at the same post-ready observation point. LCP is not room-ready time. Values are ranges across the two runs.

| Profile / route | Before bytes / requests | After bytes / requests | Before ready ms | After ready ms | Before LCP ms | After LCP ms |
|---|---|---|---|---|---|---|
| Desktop / ordinary | 421418 / 15 | 256053 / 11 | — | — | 392–508 | 392–412 |
| Desktop / room | 7939412 / 82 | 8005480 / 84 | 12054.1–12150.3 | 12017.7–12159.6 | 224–264 | 248–256 |
| Touch / ordinary | 410578 / 14 | 245213 / 10 | — | — | 468–496 | 300–308 |
| Touch / room | 7939412 / 82 | 8005480 / 84 | 9004.0–9217.2 | 9122.7–9205.6 | 192–200 | 208 |

The ordinary portfolio removes the duplicate static hero project and the nine-card rail (three eager cards) in favour of one selected preview and five visible names. Measured transfer drops by 165,365 bytes (39.2% desktop, 40.3% touch); four requests disappear. Actual source screenshots keep their responsive high-resolution variants.

The room adds 66,068 transfer bytes (0.83%) and two requests for the real participation preview and shared data. Full scans/PDF remain deferred until explicit use. Room-ready intervals overlap; this release does not demonstrate a general room load-time speedup. The earlier 48.7-second loading report was investigated separately in [the preserved loading review](../loading-review-2026-10-15/QA-LOADING.md).

## Settled room

Four seconds of continuous rain at each settled view. Drawing buffers remain exactly 1440×900 and 682×1477. Texture count remains 85. Ranges include both rounds.

| Profile / view | Before calls / triangles | After calls / triangles | Before CPU median / p95 ms | After CPU median / p95 ms | Before / after rendered frames |
|---|---|---|---|---|---|
| Desktop / desk | 133 / 198859 | 131 / 198845 | 2.50–2.90 / 3.20–3.30 | 2.70–2.80 / 3.50–3.70 | 88 / 88–90 |
| Desktop / window | 74 / 165840 | 74 / 165840 | 2.00–2.20 / 2.70 | 2.20 / 2.70–2.90 | 88–89 / 88–89 |
| Touch / desk | 779 / 1100447 | 773 / 1100385 | no rendered samples | no rendered samples | 0 / 0 |
| Touch / window | 70 / 149130 | 71 / 150282 | 2.00–2.10 / 2.40–2.60 | 2.20–2.30 / 2.70 | 88 / 89 |

The desktop desk removes two draw calls and 14 triangles. Touch desk is idle with zero rendered frames; its calls/triangles are the last full refresh, not a repeated per-frame cost. It drops from 779 / 1,100,447 to 773 / 1,100,385. The natural settled window cameras differ by about a millimetre; mobile frustum visibility can add one call / 1,152 triangles. Do not interpret that as a general geometry regression or a speed gain. The separate capture pairs enforce exactly identical camera and projection matrices. In those 20 fresh-shadow pairs, every candidate frame removes 3–6 calls and 46–62 triangles.

CPU ranges overlap. No general CPU or FPS improvement is established. The earlier shadow-map reuse and static batching remain intact; this stage prioritises correct access and clearer document/project actions. All resolution, lights, cord, authored furniture, image assets and reduced-motion policies are retained.

## Measurement limits and evidence

The throttled CDP runs record 83 ERR_ABORTED request notifications while the scenes reach ready. These raw events are retained; the throttled runs are not labelled network-clean. The independent unthrottled cold asset check covers both versions × desktop/touch × ordinary/room. All eight reach ready and all HTTP responses succeed. The four candidate runs have no failed requests. One baseline desktop run records four ERR_ABORTED notifications despite all asset phases parsed successfully; the other baseline runs are clean. Its raw overall passed=false is retained and is not counted as a network-clean baseline.

- [Raw before](performance-before.json), [raw after](performance-after.json), [structured comparison](performance-summary.json).
- [Cold assets](reports/assets.json), including actual room GPU identification and buffers.
- [Strict cached/fresh shadow test](reports/shadow.json): 158 checks, 76 samples; max RMSE 0.0390464/255, below the unchanged 0.05 threshold; max channel difference 13.
- [20 room pairs plus ordinary screenshots](VISUAL-REVIEW.md). Real Edge frames, not generated concepts.
- Physical Android, Safari, battery consumption and GPU execution timing were not tested. They remain outside this acceptance.
