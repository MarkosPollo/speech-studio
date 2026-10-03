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

## Local Learn draft — October 3, 2026

Performed in a fresh isolated public-repository checkout. No hosted app was changed or deployed. All scripts, media and screenshots in this verification are the public educational demo or explicitly generated synthetic speech.

- **15 Node tests passed.** New checks cover custom script isolation, plan validation, protected facts and ending preservation, user-approved optional drops, weak-spot/next-drill selection from self-checks, uncertain transcript evidence, literal excerpt index mapping, immutable prior plans, section-drill save/reload validation, and configurable recording targets with pauses excluded. Existing recording, editing, slide and storage tests still pass.
- **Browser integration passed** with Playwright 1.56.1 and installed desktop Chrome 154.0.8037.97 in a fresh profile: no-mic timer; pause/resume; Help counts; manual marks; self-check/one drill; explicit local save; stale-script block/rebuild; old-plan labels; shorter route retaining exact facts; recording countdown/cancel/pause/resume/playback/download; local-model download cancellation/retry; actual WASM recognition; a subsequent recording outside Learn with no inherited plan; camera-only take with no audio/transcription; saved progress reload; manual practice with the browser offline after the page loaded.
- **Real local model suite passed.** Generated English speech decoded/resampled from WAV, WebM/Opus, MP4/AAC video, and OGG/Opus to identical 16 kHz sample counts. Two repeated 9.79-second takes each returned 20 timestamped words, including “Keep 42 units.” A 39.17-second repeated take crossed the 25-second chunk boundary and returned 80 words. A full 1,200-second repeated synthetic speech returned 2,540 words; a 1,200-second silence buffer returned no text. The full worker suite, including these cases, limit rejection, cancellation during processing and model reload/recovery, completed in approximately 110 seconds on this Mac. This is a synthetic desktop observation, not a mobile performance guarantee or recognition-quality score.
- Browser suites observed **zero external app requests and zero page errors**. Browser models/runtime/WASM requests remained same-origin. CSP and public deployment workflow are unchanged; draft PR events run checks, not deployment.
- Optional asset setup verified **17 files, 65,870,431 bytes**, all SHA-256 pinned. Model revision, runtime versions, exact sizes, licenses and sources are in `web/stt-assets.json`. Assets and synthetic audio are outside tracked source. The app still has no build/package-install requirement.
- Source/vendor/history audit passes. PDF.js's 199 vendor files remain unchanged; two MIT text-index component files bring the verified vendor count to 201. Public audit logic contains generic patterns only and rejects tracked optional model/generated folders. No private-app URL, personal script, local path, source-specific private comparison string, encoded private identifier, recording or screenshot was added to public source or history. Screenshots remain local synthetic evidence.
- npm's advisory scan of the isolated development install reported high-severity **Node-only sharp/libvips/libheif** advisories. sharp and the Node runtime are **not part of the selected browser asset set**. The shipped optional assets are the pinned browser bundle and WASM, not the full npm dependency tree. Recheck advisories when upgrading; this does not establish that all upstream native/WASM code is vulnerability-free.

Verification found and fixed two regressions: a later non-Learn recording could inherit an old Learn plan; and the saved-progress validator rejected a section drill without an ending section. Both now have regression coverage. An initial browser install was incomplete and was not used. A test harness initially toggled an already-open details panel closed and tried reading hidden text with `innerText`; the harness was corrected and the complete suite rerun successfully.

Actual desktop overview, self-check, transcript and 390-pixel mobile viewport screenshots were visually inspected. 320-, 390- and 720-pixel viewport checks showed no horizontal overflow. The mobile screenshot is a viewport capture because full-page capture in this desktop Chrome produced compositor repetition. These are desktop viewport checks, not physical mobile testing or a screen-reader certification.

Still untested: physical microphone/camera quality and interruptions, Safari/Firefox, physical phones/tablets, low-memory mobile devices, noisy rooms/accents, natural long speeches, screen readers, and WebGPU. WebGPU is deliberately not exposed. Native whisper.cpp remains a later desktop option. The optional model is provisioned locally and does not become available on a host until that host explicitly installs the assets.

### Reproduce locally

```sh
node --test tests/*.test.mjs
node scripts/audit.mjs
node scripts/setup-local-stt.mjs
python3 -m http.server 8765 --bind 127.0.0.1 --directory web
# In a separate terminal, optionally install test tooling (no app build):
npm install --no-save --package-lock=false --ignore-scripts playwright@1.56.1
node tests/browser-check.mjs
```

For real speech checks, generate only the exact nonpersonal sentence below using a locally installed TTS voice, then encode it locally to WAV/WebM/MP4/OGG. Point `SYNTHETIC_MEDIA_DIR` at that temporary fixture folder and run `node tests/stt-check.mjs`; set `TEST_FULL_LENGTH=1` for the 20-minute repeated synthetic take. Never substitute private recordings for these fixtures. The browser suite optionally accepts `SYNTHETIC_WAV` for generated fake microphone audio; `CHROMIUM_EXECUTABLE` selects an installed browser and `EVIDENCE_DIR` selects a temporary screenshot folder. No fixture media or screenshots should be committed.

Synthetic sentence: “This is a synthetic rehearsal. The launch uses two stages. Keep forty two units. Optional examples may be removed. Thank you.”
