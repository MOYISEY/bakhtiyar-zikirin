# Reproduced edge refusal and directed audit frames

Original Edge PNGs. [Actually viewed ledger](visual-reviewed.json); other published captures are supporting evidence. Positive edge scenes use only native controls and the original geometry. Diagnostic occlusion/projection injections are explicitly identified in QA.md and are not used for these positive frames.

| Same native pose | Published baseline: action refused | Candidate: reader opens |
|---|---|---|
| Desktop diploma; centre above marker inset | [Before](before/desktop-edge-before.png) | [After](same-pose-after/desktop-edge-after.png) |
| Touch certificate; centre beyond right viewport edge | [Refused action](before/touch-edge-after.png) | [After](same-pose-after/touch-edge-after.png) |

[Exact ray/centre coordinates before](before/checks.json) and [candidate](same-pose-after/checks.json). These two direct confirmations precede only a comment annotation in the final runtime; the final suite below runs the complete frozen candidate.

| Final three-document edge coverage | Desktop reduced | Touch normal |
|---|---|---|
| diploma | [Visible edge](edges/desktop-reduce-diploma-before.png) / [reader](edges/desktop-reduce-diploma-reader.png) | [Visible edge](edges/touch-no-preference-diploma-before.png) / [reader](edges/touch-no-preference-diploma-reader.png) |
| hackalem | [Visible edge](edges/desktop-reduce-hackalem-before.png) / [reader](edges/desktop-reduce-hackalem-reader.png) | [Visible edge](edges/touch-no-preference-hackalem-before.png) / [reader](edges/touch-no-preference-hackalem-reader.png) |
| certificate | [Visible edge](edges/desktop-reduce-certificate-before.png) / [reader](edges/desktop-reduce-certificate-reader.png) | [Visible edge](edges/touch-no-preference-certificate-before.png) / [reader](edges/touch-no-preference-certificate-reader.png) |

[Projection fallback](edges/touch-no-preference-projection-fallback.png) is a labeled diagnostic failure injection, not a naturally observed projection failure. [All156 edge assertions and states](edges/checks.json).

Audit samples: [RU practices](audit/keyboard-desktop-ru-light-experience.png), [EN dark compact certificates](audit/keyboard-desktop-en-dark-education.png), [KK touch education](audit/touch-kk-dark-education.png), [EN touch contacts](audit/touch-en-light-contacts.png), [native profile](audit/keyboard-desktop-ru-light-room-profile.png), [native education](demo-ready/touch-education-ready.png), [ordinary Keyform case](audit/keyboard-desktop-en-light-case.png), [touch Rowline case](audit/touch-en-dark-case.png).

Actual demo landings: [Helio](audit/keyboard-desktop-ru-light-demo.png), [initial Keyform landing](audit/touch-ru-dark-demo.png), [ready Keyform](demo-ready/touch-keyform-ready.png), [Rowline](audit/touch-kk-light-demo.png); [GitHub landing](audit/keyboard-desktop-ru-light-repository.png). These are navigation checks, not a functional audit of those projects. Their repositories were not edited.

The directed workflow is not a study with live HR/recruiters/developers. Complete profile receipts, native input steps and external destinations are in [audit/checks.json](audit/checks.json). Unsuccessful driver attempts are kept under diagnostics and are not release screenshots.
