# Audit 3 — independent regression and live QA, version 10

Auditor: Codex subagent `v10_final_audit`. Source, Git and external services were read-only. Own scripts and evidence are under `qa-private/v10/audit-3/`.

## Pre-release regression

Actual Windows Chromium, laptop viewport 1366×768 and touch-emulated mobile 390×844, all RU/KK/EN × light/dark: **12/12 passed** on stable production-preview assets `index-CJ585xak.js` and `index-CkG3FulQ.css`. The built index SHA remained identical before and after the run. Each case executed seven directed groups:

- Actual document language/theme and complete translated text bindings; exactly two first-screen actions and three featured projects. Reduced motion disables the name animation. No scene bundle loads before opening the optional diagram.
- Pointer and keyboard popovers are mutually exclusive; Escape restores summary focus; clicking outside closes Appearance.
- All three section navigation links set the proper hash and focus their destination. The mobile menu closes when navigating, including a repeat click to the current hash.
- Helio, Keyform and Poslesvet demo links use their real public destinations, a new tab and `noopener`. Demo and Details targets were hit-tested at 12%, 50% and 88% of their width. Keyboard activation and explicit close restore focus.
- All six additional projects open and close with focus restoration. NeuralBrief has no fabricated link. The actual CSV example trims the SKU, survives a language change in its corrected state and downloads both exact corrected/original CSV bytes after undo.
- Education details open and close; the authorized email and GitHub contact are exact. The public resume actually downloads and starts with `%PDF-`.
- Back to top, both theme states and stored language/theme after reload work. No document overflow, uncaught page errors or console errors occurred in these ordinary cases.

Five separate edge scenarios passed: keyboard skip and six nested project hashes; real optional 3D; system-theme media changes and motion preferences; blocked WebGL; disabled JavaScript; Kazakh at 320px with root text size 200% and expanded sample. GPU observation: ANGLE / NVIDIA GeForce RTX 3050 Laptop GPU / Direct3D11. The blocked-WebGL case emitted the expected THREE diagnostic, showed the honest interactive 2D fallback and had no uncaught page error.

The first system-theme assertion ran before the browser's asynchronous media-query event. It failed in the test harness, with no source correction needed. A focused edge rerun waits for the actual resulting state; all five cases passed. Original and focused results are retained separately in `audit-3/local/results.json` and `audit-3/local-edges-recheck/results.json`.

Real native hero/gallery/contact screenshots exist for all 12 ordinary cases. The auditor viewed direct 1366 RU/light hero/gallery and 390 RU/light hero/gallery, plus the six own browser-rendered contact sheets covering all languages/themes for laptop/mobile hero, full gallery and contact. These are our own page frames; no TikTok/reference image is included.

The old Keyform crop retained a small source-page caption. Audit 2 had already flagged this. After the final crop/tablet correction, an independent **24/24-case delta passed**: widths 1366/1024/820/390 × RU/KK/EN × light/dark. Final assets are `index-DytlbY27.js`, `index-ztZL-Kql.css`, optional `scene-BFmPUJMD.js`. The built index SHA stayed identical throughout this delta. Each featured demo and Details summary was independently hit-tested at ten points spanning 6% through 94% of its width and two vertical positions: no obstruction. Smartphone cases repeated keyboard mutual-popover activation, Escape/focus, contact navigation and actual PDF download. No page errors or horizontal overflow occurred.

Keyform's source crop, measured without its CSS rotation, begins at approximately x400/y222 and spans 800×494 source pixels. It excludes the caption ending at x384 and retains the complete layered model. The auditor viewed actual final 1366 RU/light and 390 KK/dark crop PNGs, the 1024 KK/dark and 820 EN/light Helio target-edge viewport PNGs, and the 390 RU/light complete Keyform viewport. The corrected label and model are clean, and the tablet summary remains fully visible. Final evidence: `audit-3/final-delta/results.json` and its native PNGs.

Two invalid harness/transport attempts are retained separately: the initial crop calculation mistakenly used rotated bounding rectangles; then a disconnected execution environment had stopped the local preview. Neither represents a site failure. The calculation was corrected to layout coordinates and the local preview restarted before the successful delta. **Pre-release regression is approved.**

## Live verification

Pending exact public deploy notification. No public regression, external demo visit or runtime/commit comparison is claimed yet.

## Limits

Directed native browser automation and human visual inspection of screenshots were used. This is not a claim of physical manual mouse/touch input, a physical phone, Safari, a screen reader or an external email client test. Selected automated accessibility rules from other rounds do not constitute complete accessibility conformance. The parent/researcher reviewed the reference video; this auditor used the approved brief and did not independently view that source.
