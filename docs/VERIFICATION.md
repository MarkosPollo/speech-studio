# Verification

## Initial public release checks

All checks below were performed on October 2, 2026 before the first public push.

- Six automated Node tests passed: independent demo defaults/storage isolation; cue navigation/edit persistence and literal HTML text; synthetic recording countdown/pause/resume/stop/download with paused time excluded; countdown cancellation and permission-denial handling; audio-only mode and overtime; six-page PDF and local renderer/deployment resources.
- JavaScript syntax checks passed for the app, slide loader and demo content.
- The original demo PDF has six extractable-text pages and neutral metadata. Every page was rendered and visually reviewed for readable text, alignment and clipping.
- Chrome locally rendered the bundled PDF, navigated slides and cue cards, loaded two local PNG slides in numeric filename order, and changed to Slides focus. At a 390-pixel viewport the document width was 390 pixels, with no horizontal overflow.
- All 199 bundled vendor files match SHA-256 hashes from the unchanged supplied PDF.js distribution. Third-party license files remain present.
- A separate private review checks every project file against the former default names, text, paths and source identifiers, including encoded forms. The public audit utility contains generic patterns only: private paths, URLs/IDs, credential patterns and disallowed archives/media. Vendor hashes constrain shipped binaries. The fresh Git history is audited separately before publication.

Recording checks use mocked MediaRecorder and synthetic bytes. They verify application control flow, not physical camera quality, browser codec behavior or hardware permission prompts. Hardware camera/microphone capture, Safari/Firefox, mobile recording interruptions and assistive-technology interoperability remain untested. The PDF's text alternatives are provided separately; the canvas is not a full accessible PDF text layer.

Publication verification, the actual Pages URL, commit and CI results are recorded in the release handoff after deployment. Privacy scanning uses patterns and known-input comparison; it is a focused audit, not a guarantee of detecting every possible secret.
