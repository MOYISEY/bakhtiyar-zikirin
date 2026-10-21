# ScanProof and QuoteLens portfolio cases — 21 October 2026

The portfolio adds two real, public tools as ordinary project cases in RU/KK/EN. The room's six curated projects and the three home showcase selections are unchanged. The cases make no user, revenue, demand or AI-performance claim.

| Case | Public demo | Source at capture | CI |
| --- | --- | --- | --- |
| ScanProof | https://moyisey.github.io/scanproof/ | [9a68dbc](https://github.com/MOYISEY/scanproof/commit/9a68dbc723b3e19fe28d152cf46f9c0e468a9067) | [successful run](https://github.com/MOYISEY/scanproof/actions/runs/39616658528) |
| QuoteLens | https://moyisey.github.io/quotelens/ | [333fe2d](https://github.com/MOYISEY/quotelens/commit/333fe2d78c10ff018fecc0b34b93ca56170be2e5) | [successful run](https://github.com/MOYISEY/quotelens/actions/runs/39618187185) |

Both source SHAs were compared with public `main` by `git ls-remote`, and both public GitHub Actions runs returned `completed/success` with the same `head_sha` on 21 October 2026. The child-app test results are independent work reported by their owners; this portfolio pass checked the public demos, links, images and case copy.

## Real frames and provenance

Installed Microsoft Edge 155 captured the actual public apps using each app's built-in fictional example; no personal data. The four desktop source frames are [ScanProof before mapping](screenshots/scanproof-detail-1-source.png), [ScanProof after manual mapping](screenshots/scanproof-detail-2-source.png), [QuoteLens comparison](screenshots/quotelens-detail-1-source.png) and [QuoteLens expanded explanations](screenshots/quotelens-detail-2-source.png). Mobile source captures are [ScanProof](screenshots/scanproof-mobile-source.png) and [QuoteLens](screenshots/quotelens-mobile-source.png). The [ScanProof](scanproof-capture.json) and [QuoteLens](quotelens-capture.json) manifests record capture states, SHA-256, dimensions and the 12 WebP variants per app. WebP variants were resized and encoded from those screenshots by the browser canvas at quality 0.94.

The resulting portfolio was also viewed in Edge: [desktop ScanProof](screenshots/local-desktop-scanproof.png), [desktop QuoteLens](screenshots/local-desktop-quotelens.png), [desktop catalog](screenshots/local-desktop-ru-catalog.png), [mobile ScanProof](screenshots/local-mobile-scanproof.png), [mobile QuoteLens](screenshots/local-mobile-quotelens.png), [mobile catalog](screenshots/local-mobile-ru-catalog.png). The [full catalog frame](screenshots/local-quality-catalog.png) shows both new cards together. These files allow a reviewer to compare the original demo frames to their portfolio cards and case pages.

## Reproducible portfolio checks

Run `npm run build`, serve `docs/` with `npm run preview -- --port 5202 --strictPort`, and set `PLAYWRIGHT_BROWSER_EXECUTABLE_PATH` to the installed Edge executable for scripts using `browser-config.mjs`.

- [Full static-page matrix](local-pages.json): 156 routes, 12 interactions and four edge cases passed across RU/KK/EN, desktop and mobile emulation, light/dark, keyboard gallery, image decode, selected WCAG checks and no-JS fallback.
- [Targeted new-case matrix](local-new-cases.json): 222 checks passed across six language/device combinations, including links, cards, filter counts, localized content, gallery keyboard/focus, mobile width and selected axe WCAG checks. Run `node scripts/qa-new-cases.mjs http://127.0.0.1:5202/ local`.
- [Responsive-media matrix](local-quality.json): 52 routes and 284 rendered images passed at DPR 2/3; all manifest variants matched SHA-256, gallery zoom/open-file and failed-image/no-JS edges passed. Run `node scripts/qa-quality-media.mjs http://127.0.0.1:5202/ local`.
- `node scripts/qa-portfolio-content-matrix.cjs http://127.0.0.1:5202/ new-cases` passed 240 room/ordinary-content checks in six cases. `npm run qa:showcase -- http://127.0.0.1:5202/ final-new-cases` passed 220 checks in 12 cases. `node scripts/qa-pages-navigation.mjs http://127.0.0.1:5202/ local` (with `QA_EVIDENCE_VERSION=new-cases-2026-10-21`) passed native image/title/demo navigation in both device setups. `npm run qa:asset-history` passed.

The media test was updated to allow the current home showcase's intentional Helio detail frame; the catalog still must avoid downloading detail imagery. Tests used Edge browser emulation, not physical Android or Safari. Text and screenshots describe observed app behavior and its limits; they do not establish market demand or production usage.
