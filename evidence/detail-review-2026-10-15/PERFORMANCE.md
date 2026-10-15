# Equal-condition performance — final detail review

Two serial cold rounds per version/profile/route, ABBA order; installed Edge 155.0.4283.45. Baseline8c vs candidate. [Raw before](performance-before.json), [raw after](performance-after.json), [summary](performance-summary.json). Full-refresh capture totals are separate in [frames.json](frames.json).

| Settled view | Calls before → after | Triangles before → after | CPU median / p95 ms per round before → after |
|---|---|---|---|
| Desktop desk | 135/135 → 133/133 | 199191/199191 → 198859/198859 | 2.80 / 3.80; 1.60 / 2.10 → 3.40 / 3.90; 2.80 / 3.40 |
| Desktop window | 80/80 → 74/74 | 166448/166448 → 165840/165840 | 2.40 / 3.10; 1.30 / 1.70 → 2.40 / 3.00; 2.20 / 2.70 |
| Touch desk | 808/808 → 779/779 | 1085549/1085549 → 1100447/1100447 | 0.00 / 0.00; 0.00 / 0.00 → 0.00 / 0.00; 0.00 / 0.00 |
| Touch window | 77/77 → 70/71 | 150890/150890 → 149130/150282 | 2.10 / 2.70; 2.80 / 3.00 → 2.00 / 2.80; 1.20 / 1.50 |

CPU values are synchronous RAF callback wall time, not GPU execution. Idle samples have zero render callbacks and retain the last full-refresh counters; rain intentionally caps rendering. Two rounds do not establish a general speedup. All drawing buffers match exactly; actual settled cameras are recorded and accepted only within2mm between paired runs. Capture-camera matrices match exactly in the separate visual evidence.

| Cold route | Transfer bytes before → after | LCP ms before → after | Room ready ms before → after |
|---|---|---|---|
| Desktop ordinary | 421418/421418 → 421400/421400 | 276/480 → 464/324 | —/— → —/— |
| Desktop room | 7929209/7929209 → 7939412/7939412 | 248/200 → 224/252 | 11656/10025 → 11563/11793 |
| Touch ordinary | 410578/410578 → 410560/410560 | 464/464 → 476/492 | —/— → —/— |
| Touch room | 7929209/7929209 → 7939412/7939412 | 200/200 → 196/216 | 8968/8923 → 8946/8941 |

Identical gzip server, disabled HTTP cache, 40ms/10Mbps down/2Mbps up, CPU1x. Desktop1440×900 DPR1; touch390×844 DPR1.75. No resolution, shadow-map or light reduction. Shader/driver cache not flushed. Full PDF/scans stay deferred. 93 request-failure notifications were retained; these CDP-throttled notifications must not be described as a clean unthrottled asset-load test. Phase readiness and JavaScript errors are recorded separately. The independent live/local cold/warm diagnosis uses native network and normal caching.

The 18-byte ordinary-route transfer difference comes from archive/checkout line endings in gzip inputs. Ordinary portfolio source/build files are unchanged by this room revision; it is not an optimization claim. Desktop desk CPU medians increased from 1.6–2.8ms to 2.8–3.4ms in these two rounds; the spread and ABBA ordering prevent a general CPU speedup claim. Mobile desk rendered zero frames in both versions: 808→779 calls there describe the last full-refresh frame, whose triangle count increased from 1,085,549 to 1,100,447. Fresh-shadow drawer closeup calls fell809→776 while triangles rose1,127,389→1,141,699. Added details have a measured geometry cost.
