# Case-gallery recovery: 21 October 2026

Base commit: `7e8d15a9d75c7a162cc4530ca91ebe8915dad841`. The worktree was clean and no other QA process was running before this change. Only the portfolio checkout was edited. This package changes image recovery in the portfolio case viewer and preview cards; it does not alter any project demo or 3D scene.

## Confirmed failure and change

In installed Edge, aborting the first Helio case image made the gallery show its error text as intended. After requests were restored, pressing **Details** downloaded a valid 3200-pixel image, but the image stayed hidden and the error text stayed visible. This happened in both desktop and touch emulation. The gallery now clears the error state when its image actually loads. Preview images also clear their failed styling after a later successful load. Pending loads still keep the fallback visible until success. No retry control or new visual treatment was added.

## Checks

- `npm run build`: passed, including static page generation, TypeScript and Vite. Generated `docs/` entries point to the new hashed main bundle.
- `node scripts/qa-asset-history.mjs`: passed the published-baseline, repeated-build and bounded-retention fixture checks for hashed assets.
- New [targeted Edge report](report.json): 4/4 profiles passed (desktop/touch emulation, default/reduced motion). Each profile forced a real request failure, recovered the gallery through **Details**, failed and recovered the preview image again, switched gallery frames rapidly with the keyboard, closed with Escape, reopened, and checked focus return and page errors.
- Existing `scripts/qa-gallery-access.mjs`: 8/8 language/theme/viewport cases passed; axe WCAG A/AA reported zero violations in the open normal gallery. It ran with installed Edge in an isolated scratch working directory so old evidence was preserved.
- Existing `scripts/qa-pages.mjs` smoke: 66/66 static route cases and 6/6 flows passed across RU/KK/EN and desktop/touch emulation, also in that scratch directory. `--edges-only` was not run.
- Real rendered frames were inspected: [desktop failure](desktop-reduce-failed.png) / [desktop recovery](desktop-reduce-recovered.png), [touch failure](touch-reduce-failed.png) / [touch recovery](touch-reduce-recovered.png). Recovery shows the case image and no stale error banner.

Reproduce locally after `npm run build` and `npm run preview -- --port 5202` with `node scripts/qa-gallery-recovery.cjs http://127.0.0.1:5202/ qa-private/gallery-recovery`. The script uses installed Edge and saves its report and eight screenshots in the output directory. The recorded failures were induced by Playwright request interception; this is not evidence of a production CDN failure. Touch was emulated, not tested on a physical phone. No screen-reader or installed Safari test was performed. This commit is local and was not pushed or deployed.
