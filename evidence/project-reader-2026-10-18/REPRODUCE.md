# Reproduce the measurements

Use a separate checkout of the candidate, Node with the locked dependencies installed, and Microsoft Edge installed. Run from the repository root. Keep other browser/GPU workloads stopped and use a new output directory:

```powershell
node evidence/project-reader-2026-10-18/qa-source/reproduce-measurements.cjs qa-private/independent-cold-run
```

The script archives baseline d352 without changing the checkout, verifies all289 archived files against Git, owns a local server on127.0.0.1:4331, and runs the retained observer before/after serially. It refuses to overwrite existing evidence. Windows tar is required for the ZIP extraction. The actual candidate is the current docs tree. Reports identify Edge version, profiles, network emulation, events, asset bodies, frame gaps, callback times and draw statistics. Driver/shader/OS caches are outside this method. Repeat into separate new directories for distributions; a single matched sample is not a performance improvement claim.

The final full regression commands, script SHA, exit codes and runtime hashes are in regressions/verification.json. Exact executed script snapshots, including failed/interrupted attempts, are mapped by qa-script-provenance.json. Six ordinary/source-independent receipts transfer from the prior runtime; all native tests reran. reader-acceptance.json states precisely which completed groups transfer from the retained failed full run. Original failures and controls remain under diagnostics and legacy-artifacts.

To repeat individual scenarios, use their recorded script and args from the repository root while the same comparison server serves before/after. Choose new output labels so receipts do not overwrite old results. No physical Android, Safari or screen-reader test is implied by Edge touch emulation. View original PNGs, rather than relying only on successful assertions; VISUAL-REVIEW.md links matched cases and motion observations.
