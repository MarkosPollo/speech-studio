# Accessibility and browser limits

Controls have visible focus rings, text labels or accessible names. Script/cue tabs support arrow keys, Home and End. Dialogs use native focus management. Status messages announce slide navigation and recording state. Font controls enlarge script text, and layouts stack on narrow screens.

| Shortcut | Effect |
| --- | --- |
| Space | Start or pause autoscroll in full script view |
| Left / right | Previous / next slide when slides are visible; otherwise cue card in cue view |
| Shift + left / right | Change cue cards in cue view even with slides visible |
| Page Up / Page Down | Navigate slides |
| Home / End in the slide viewer | First / last slide |

Shortcuts are suppressed in editors, controls and open dialogs. Reduced-motion preferences disable decorative transitions; autoscroll starts only when requested. PDF pages are drawn as images, so the app does not expose a PDF's full text layer to screen readers. The demo has [text descriptions](../web/demo/sources.html), a [script](../web/demo/script.txt) and [cue cards](../web/demo/cue-cards.txt). Use an accessible PDF reader for your own deck when needed. Recording does not add captions or transcripts. This is not a claim of formal WCAG conformance.

Use current Chrome, Edge, Firefox or Safari in a full HTTPS browser tab. Camera and microphone need available devices and browser permission. Embedded browsers may block them. MediaRecorder support and output formats vary: the app tries WebM, MP4 and (for audio) Ogg where supported, then the browser default. Some players cannot open every format. Playback and downloads must be checked on your device.

Mobile browsers can stop capture when backgrounded, locked or interrupted. Long recordings consume memory. There is no guaranteed recording duration. Camera access can fail if another app is using the device. Browser privacy settings can prevent local storage; text still works in the tab and can be downloaded.

Deck uploads support one unlocked PDF or multiple PNG, JPG or WebP images, up to 100 MB combined. Images sort by filename in numeric order. Export PPT, PPTX or Keynote to PDF first. Slides are reloaded after refresh. Unsupported, damaged or protected files receive an error without replacing the previous successful deck.
