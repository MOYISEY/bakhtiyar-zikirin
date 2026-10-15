# Cold/warm loading diagnosis - 15 October 2026

Measured release:8c82487141a0dd13436b5e6bcc257cf7e4c09900. [Resource waterfall](waterfall.html), [summary](loading-summary.json), [raw16runs](raw/runs.json).

Sixteen serial navigations: two rounds for each live/local,desktop/mobile,cold/warm combination. Installed Edge155.0.4283.45 on RTX3050/D3D11;1440x900 DPR1 and390x844 DPR1.75 touch emulation. Cold=fresh context and cleared HTTP cache,cache enabled. Warm=second normal navigation in the same context;78of79requests were cached in every warm run. No routing or response patch: Playwright routing disables HTTP caching. Local server uses immutable Git8c bytes,gzip,ETag and max-age600 matching observed Pages policy. Native network/CPU1x; earlier local10.18/8.68s figures used10Mbps/40ms throttling,so are not directly comparable. OS/driver shader caches were not flushed.

| Origin/profile/mode | Ready seconds,2rounds | Preparation seconds | Cached requests |
|---|---:|---:|---:|
| live desktop cold | 9.87–28.69 | 1.62–4.16 | 0/0 |
| live desktop warm | 2.36–2.38 | 1.50–1.52 | 78/78 |
| live mobile cold | 21.00–29.46 | 1.57–1.60 | 0/0 |
| live mobile warm | 2.39–2.44 | 1.49–1.55 | 78/78 |
| local desktop cold | 2.16–2.63 | 1.26–1.31 | 0/0 |
| local desktop warm | 2.30–2.36 | 1.47–1.48 | 78/78 |
| local mobile cold | 2.11–2.13 | 1.30–1.33 | 0/0 |
| local mobile warm | 2.30–2.33 | 1.52–1.56 | 78/78 |

## Critical path

All16became interactive with three parsed phases ready and no failed requests/HTTP errors. Historical48.7/23.8s did not repeat exactly; new live cold9.87-29.46s,warm2.36-2.44s. This is a variable delivery tail,not a stable48.7s code timer.

In3of4live cold cases the last required resource was existing1,211,256byte exterior/tree-atlas.webp. ResourceTiming body intervals14.79s/24.39s/25.03s. Responses say x-cache:HIT,age22/57/97,max-age600; CDP headers arrive roughly0.32-0.52s after dispatch. Corridor indirect and sky images also have long body intervals. The atlas predates UX and is unchanged; the new54,876byte resume preview was not critical. A CDN miss is not indicated,but data cannot distinguish bandwidth/flow control in client transport,an intermediary or CDN delivery.

The loader deliberately waits for room,decor and expo parsing before preparation. Thus interactivity depends on the slowest atlas: existing startup policy,not an unexplained delay. In slow cases parsing finishes within a few milliseconds of the last response,then preparation takes1.57-1.62s. First desktop cold preparation4.16s,largest parallel shader-completion wall1.49s; later live preparation1.49-1.62s,largest completion interval0.31-0.42s. Texture upload CPU calls generally0.39-0.56s. Usable=true follows final scene readiness within0.2ms.

GL compileShader/linkProgram CPU calls and KHR_parallel_shader_compile polls are recorded. They bound shader readiness,not exclusive GPU execution time. Preparation also includes assembly,environment baking,uploads and real shadow renders. Overlapping intervals must not be summed.

## Decision

No production loader,quality,model or caching policy is changed based on this diagnosis. Deferring the exterior gate would alter the accepted startup/first-view contract and needs a deliberate separate change. No startup speedup promised. Historical slow observation and new ranges are retained. Cold delivery variability remains a limitation; reproducible warm/local floor is about2-2.6s on this laptop. Physical Android/Safari not tested.

## Reproduce

Archive the chosen commit docs into an isolated directory. Set LOADING_LOCAL_DIR to that docs directory; node scripts/serve-loading.cjs serves4332. Set LOADING_COMMIT to measured SHA,LOADING_OUTPUT to a fresh directory; run node scripts/qa-room-loading.cjs from repository root. LOADING_ROUNDS defaults2; LOADING_LIVE/LOADING_LOCAL override origins. Run serially with no other Edge tests. Source SHA label is declared metadata; independently verify live deployment.
