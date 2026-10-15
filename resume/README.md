# Public resume source

Edit resume.html, then run npm run build:resume. The offline Playwright export uses installed Edge by default; RESUME_BROWSER can specify another installed Chromium executable. No external fonts, services or new package dependency. Run npm run build afterwards to copy the PDF into docs.

The layout follows the existing one-page black-and-white public resume. Contacts and existing responsibility descriptions are preserved. The two iQADAM practices remain separate: March–April 2026 and 10 November–5 December 2025. The latter dates come from the supplied report and its completion certificate. College qualification follows the supplied diploma; college 2023–2026, AIU 2026–present. No additional duties are inferred from the 2025 certificate.

After editing, rasterize and visually inspect every PDF page and check extracted text, links and page bounds before publishing. The generator does not automatically replace the PDF on every site build.

The current selected-project section links to Helio, Keyform and Rowline using the established portfolio titles, purposes and stacks. It adds no unverified personal-contribution claim. build.json ties the editable source hash to the exported PDF hash and guards against accidental pagination before replacing the public file.
