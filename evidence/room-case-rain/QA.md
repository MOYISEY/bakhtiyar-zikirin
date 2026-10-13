# Room case links and rainy ambience

Baseline: public `main` and the clean local `portfolio-room-integration` checkout both pointed to `41af9788297b9880ce4ab3b297649f95e70dcd8a` on 2026-10-13. The earlier `bakhtiyar-portfolio` checkout was behind. Work was isolated in a fresh local clone; the original checkouts were left untouched. No `.env` or secrets were read. No project `AGENTS.md`, `.agents/skills` or local memory was present in the selected checkout. The review skill in neighbouring scene-study checkouts was inspected; this change does not replace scene assets or rendering.

## Confirmed changes

- Each of the six room project panels now links directly to its existing case page, with RU/KK/EN preserved. Demo/source links and the nine ordinary portfolio cases remain available.
- Rain audio follows the assembled exterior weather, using the existing audio channel. It still requires an explicit gesture and respects saved mute/volume settings. Animation pause and reduced motion freeze the rain visuals without changing the rainy weather or sound preferences.
- README now describes the already published room, large homepage preview and existing `main` / `docs` Pages process.

## Local verification

`npm run build` passed static-page generation, TypeScript and production Vite build. Its generated changes are limited to `docs/room/main.js` and `docs/room/ui.js`; accepted homepage, experience, education, window and loading design were not changed.

`node scripts/qa-room-case-rain.cjs http://127.0.0.1:4331/ local` passed 94 assertions at desktop 1440 × 900 and touch/mobile viewport 390 × 844. It checks all six case destinations in all three languages, real navigation by Enter/tap, language retention, opening the existing gallery, rain signal after explicit sound enable, no autoplay, rain-animation pause, reduced motion, saved mute/pause after reload and runtime errors. Browser output was muted; Web Audio analyser data verified the actual rain channel.

Local Edge rendered the scene with ANGLE / NVIDIA GeForce RTX 3050 Laptop GPU / Direct3D11. WebGL was available; this was not a fallback-only test. Screenshots are in `qa-private/room-case-rain/` and were visually inspected.

`node scripts/qa-room-context-loss.cjs http://127.0.0.1:4331/ local` passed all nine existing assertions: native context loss silences/suspends audio, preserves preferences, exposes projects in the fallback, and permits a gesture-based re-entry after retry.

`npm run qa:asset-history` passed its six compatibility/retention checks. The first sandbox attempt could not create its temporary Git fixture; rerunning with a temporary directory inside the workspace passed. The first browser attempt could not reach a preview in a separate sandbox network; running preview and Edge in the same Windows environment resolved it.

Viewport/touch emulation does not establish physical-phone or native Safari behaviour. The CUA connection was unavailable, so browser verification used the project's Playwright workflow and installed Edge.

## Reproduction

```sh
npm run build
npm run preview -- --port 4331
# Windows: ROOM_BROWSER may point to the installed Edge executable.
node scripts/qa-room-case-rain.cjs http://127.0.0.1:4331/ local
node scripts/qa-room-context-loss.cjs http://127.0.0.1:4331/ local
npm run qa:asset-history
```

Publication is verified separately after pushing, by checking the remote commit and the live room runtime.
