# Room V7 final integration: frozen candidate for independent recheck

This is a separate optional route, not a replacement homepage. No push or deployment is authorized before the parent's independent recheck. Base portfolio commit: `2fb2a302325eb2ece3837dc0d70f18798e073a68` (V13). Preview: http://127.0.0.1:4200/bakhtiyar-zikirin/room/ .

## Implementation

- True navigable Three.js room; six professional projects, skills, experience, process, CV and contacts. Earlier tabletop content is absent under the revised professional scope.
- One localized homepage link. URL language RU/KK/EN takes priority over storage; switching language updates the URL. Boot-error fallback also preserves language.
- No audio before explicit entry. Click/tap/Enter starts the original calm score and weather-dependent rain with a fade. Saved mute and channel levels take priority. Scroll-only entry offers an explicit enable control. Resume attempts are bounded; source nodes are reused. No microphone or third-party music.
- Brighter night labels/project textures; bounded texture brightness. Plant geometry unchanged, floor gap zero, stronger contact shadow.
- Locally minified Three.js vendor files retain the MIT license and 444 exports. No property mangling. Public runtime is exactly 64 files (the previous 63 plus `audio-score.js`), 6,666,119 bytes. Public directories contain no tests, server, evidence or private documentation.

## Evidence

| Check | Result |
| --- | --- |
| TypeScript + Vite build | PASS |
| Main portfolio regression | PASS: 66 routes, 6 flows, 0 edge failures (`smoke-pages.json`) |
| Functional room suite | PASS: 97 checks, repeated dialogs, focus/Escape, languages, routes, reduced motion, small viewports, WebGL recovery |
| Audio | PASS: 23 checks, nonzero live signal, channel controls, weather, saved mute/volume, entry methods, source reuse, bounded blocked resume |
| Integration | PASS: 24 checks, main-to-room language, denied storage, actual CDP touch drag/joystick/cancel, two opaque-wall occlusion fixtures, no unsolicited external requests |
| Physical object selection | PASS: 13 real canvas clicks after camera movement |
| Boot-error retry | PASS: RU/KK/EN, including localized ordinary-view fallback |
| Native browser zoom | PASS: `chrome.tabs.setZoom(2)`, API reports 2; viewport 1418x744/DPR1.25 becomes 709x372/DPR2.5; panel fits |
| Cold loading | 10 Mbps/80 ms local CDP throttle: base 2.653 s, details 7.604 s; 6,630,157 transferred bytes. Not a CDN or physical-device guarantee |
| Native inactive-tab audio pause | NOT VERIFIED: Playwright kept reporting visible for the inactive tab. Separate raw CDP attempt timed out at Page.enable. Handler simulation passed; failed harness reports retained, no product pass claimed |

`actual-browser-mix.webm` is 12 seconds of the actual live master output captured using MediaRecorder, without microphone access. It is supporting evidence for human listening, not a human listening verdict. Audio Library file: `libfile_d919b45c9d608191bfd9f61ebe23febc`, version 0.

## Limits and reproduction

No physical phone, Safari/Firefox, screen-reader or human speaker/headphone assessment was performed. Mobile checks use actual CDP touch events in emulation. Wall checks use controlled camera fixtures and are not an exhaustive collision walk. The automated hidden-tab limitation remains for independent review. Local preview binds only to 127.0.0.1 and stays available for the parent; it is not a public deployment.

Main checks: `npm run build`, then `QA_EVIDENCE_VERSION=room-v7 node scripts/qa-pages.mjs http://127.0.0.1:4200/bakhtiyar-zikirin/ smoke` with an available Playwright browser. Room test sources are included in the handoff archive and the adjacent `bakhtiyar-room-v7-final/tests` folder. They run from that standalone folder against port 4200, using `ROOM_BROWSER` and `NODE_PATH` for the installed Edge/Playwright. The native zoom test additionally uses the private QA extension included in the handoff archive; it is never shipped in `/room/`.

`runtime-manifest.json` hashes the exact runtime bytes in both public/room and docs/room. The scoped `.gitattributes` disables text conversion for these two trees so tested bytes survive Git checkout. A local commit and binary integration patch identify the final candidate; no remote write has been made.
