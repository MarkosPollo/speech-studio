# Learn mode

Learn is a local practice tool, not an assessment of confidence, emotion or mastery. No microphone is needed for **Start without mic**. For recording, enable media in the existing panel, then choose **Record with plan**; countdown, pause, playback and downloads remain the original recording flow.

1. Set the whole-talk target in minutes or the plan editor. Closing reminders follow the selected duration and never stop a take. A section drill uses its section budget. Whole-talk target and the sum of section budgets are displayed separately; edit both to fit your talk.
2. Review the plan. Demo sections are extracted from the current demo script. A custom script becomes one section until you split it. Section text and ideas are editable independently from reader text. Protected facts and optional passages must occur verbatim in their section. Keep at least one ending section.
3. Select whole talk, one section, or a weak spot from the latest self-check for this exact plan. Choose full script, idea cues, slide/title, or no prompts. Slides remain available by choice; No prompts hides the Learn text, not the separate slide viewer.
4. During practice, **Reveal Help** shows the full current section and counts every reveal. **Mark section complete** records your own timestamp and advances the text prompt; it does not claim the section was spoken. Pauses do not count toward duration.
5. Finish, check each section yourself, and choose one next drill. “Not checked / unsure” is the default. Protected facts and the ending are explicit review prompts. Transcript evidence does not change your self-check.

A shorter-route preview lists every optional passage to be dropped. Checking the box approves that route for a practice take only. The tool removes only the listed verbatim passages, never changes wording, keeps protected facts, and keeps ending sections in full. This is not an automatic rewrite or a promise that the route fits the time. A plan edit resets route approval.

Each take snapshots the plan and route used. Plan edits create new versions. Reader-script changes block new Learn takes until you rebuild or explicitly review/apply the plan. History labels prior plans and never uses their self-checks to select the current plan's weak spot. A recording started outside Learn has no inferred plan association.

Practice results stay in tab memory by default. **Save progress locally** is an explicit snapshot, not autosave. **Export progress** downloads JSON containing plan snapshots, Help counts, marks and self-checks; no audio or transcript. Import replaces tab progress only after confirmation and does not autosave. **Clear Learn progress** removes tab results and the saved Learn key, leaving the original reader and recording tools available. Reader text still follows the original automatic local save behavior.

## Optional local English transcription

Run `node scripts/setup-local-stt.mjs` to provision pinned public assets, then serve `web/` normally. This opt-in development command uses the public network to download model/runtime files; it never takes speech inputs. The assets are ignored by Git. Manual Learn mode and the public app need neither installation nor package dependencies.

The installed set is about **65.9 MB (62.8 MiB)**. The two q8 model files are exactly **40,852,295 bytes**; the tokenizer is **2,128,494 bytes**. `web/stt-assets.json` records exact bytes, hashes, source URLs and immutable model revision, including all licenses. No remote CDN/model endpoint is allowed by the browser. Same-origin CSP is unchanged. A host that has not installed the optional assets shows a clear failure and retains manual mode.

**Download local model** verifies every asset and reports actual download progress. Verified public model files can use Cache Storage, allowing later use offline after the app itself loads; no service worker or offline app installation is implied. Cancel aborts download/decoding, terminates the inference worker, and requires reloading the local model. Partially downloaded public assets can remain cached; **Clear transcript & model cache** deletes this dedicated cache. The host/browser HTTP cache may retain public files separately.

Only after a recorded take and a separate **Transcribe** action does the main thread decode the browser-supported audio container and resample to 16 kHz mono. The worker receives audio only. It runs quantized tiny.en in single-threaded WASM, without WebGPU, cloud Web Speech or provider fallback. Word timestamps use recording time with pause intervals omitted, not wall-clock time. Camera-only recordings disable transcription.

Analysis is limited to 20 minutes / 100 MB. Decoding still needs the whole recording buffer in memory; inference runs sequential nonoverlapping 25-second windows. These bounds prevent unlimited analysis, but do not guarantee mobile memory or speed. Chunk boundary words can be truncated; silence is skipped to reduce hallucinations. Tiny.en is English-only, may mishear names/numbers/negation, and does not establish semantic coverage. “Found wording” tolerates case/punctuation; “Not found in transcript” is explicitly not proof of an omission. Only a Learn-linked recording compares protected wording against the snapshot used for that recording. No transcript is saved/exported as progress.

## Verification limits

See the added verification record. Desktop headless Chrome uses an isolated profile and generated nonpersonal speech. Responsive viewport checks are not physical mobile tests. Real microphones/cameras, Safari/Firefox, accents, noisy rooms, natural long speeches and actual mobile memory/performance remain untested. A repeated synthetic 20-minute speech was exercised on desktop. WebGPU and native whisper.cpp are deferred. Nothing has been deployed by this change.
