# Focused startup-language correction

Parent independent review approved prior HEAD `4c163a6a474d84bc46c6698eab15d351d9705811` on the blocking checks and independently confirmed native hidden-tab audio suspension/resume. This follow-up addresses its remaining mixed-language fallback finding only.

Only `bootstrap.js` changed in the public runtime, mirrored byte-for-byte into `docs/room/bootstrap.js`. Before importing the 3D module, bootstrap now translates document title, brand, menu, skip link, welcome caption, gesture hint, hidden entry/menu controls and accessible labels; language-button state also reflects the resolved language. URL/storage resolution, timeout, import failure, Retry and ready callbacks retain their previous behavior. No other runtime file changed.

Validation: `npm run build` PASS; `node evidence/room-v7/bootstrap-language.cjs` PASS, nine cases. For RU/KK/EN: block the Three.js import, then recover using Retry; deny WebGL context, then recover using Retry. Every case verifies startup strings, opposite saved language overridden by URL, healthy menu reopening, language switching and URL sync after recovery. Additional cases cover denied localStorage, invalid URL language, and invalid saved language. No healthy-page errors or unsolicited external requests. English and Kazakh fallback screenshots are adjacent. English screenshot manually inspected.

Hash checks: all 64 files match between public and built output; exactly 63 retain their prior runtime SHA-256. HTTP bootstrap bytes match the source. Updated manifest records the single changed file. Previous general QA and performance measurements remain historical evidence for their recorded candidate, not a claimed rerun on this commit.

No push or deployment. Preview remains http://127.0.0.1:4200/bakhtiyar-zikirin/room/ . Human listening and physical-device testing remain unperformed.
