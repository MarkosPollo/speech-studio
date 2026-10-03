# Privacy and data flow

Speech Studio runs entirely in your browser. It does not have an application server or user accounts.

| Data | Location | Lifetime |
| --- | --- | --- |
| App and demo | Downloaded from the static host | Browser cache may retain them |
| Script, cue edits, text size, scroll speed | Browser local storage under `speech-studio-public-spacex-v1` | Until you restore the demo or clear this site's browser data |
| Selected PDF or slide images | Tab memory and local blob URLs | Until removed, replaced or the tab closes |
| Live camera and microphone | Browser MediaStream | Until switched off, recording finishes, or page exits |
| Recording | Tab memory and local blob URL | Until replaced or tab closes |
| Downloaded text, slides or take | Your downloads folder | Until you remove the file |

The public application has a separate storage key and origin from other rehearsal instances. It does not migrate or read their stored text. Instances under the same host origin can still share storage at the browser security level; the namespace prevents accidental loading, not hostile access by another script on that origin.

Camera and microphone permission is requested after you press **Enable**. Nothing records until **Record take** and its countdown complete. The app records only the chosen camera/microphone sources. It does not capture the screen, slides or script. The timer excludes paused time.

PDF.js, its worker, fonts, character maps and WebAssembly resources are bundled locally. PDF bytes are passed to this local renderer. Script and cue content is inserted as text, never executed as HTML. PDFs are rendered without enabling PDF.js evaluation.

There are no app analytics, tracking cookies, hosted speech services or external CDNs. GitHub Pages and your network provider may receive IP addresses and normal request metadata when delivering the site. Visiting a source link goes to that external site. Downloaded recordings may reveal whatever you spoke or showed; choose where to share them yourself.

Recordings are not automatically saved. A refresh, device interruption or browser crash can lose a take. Download and check your file before leaving. Keep browser data and downloads private on shared computers. To erase saved text and settings, clear site data in your browser for the app origin. This may remove data for other apps on that origin too.

Learn plans/results remain in this tab unless explicitly saved under `speech-studio-learn-v1` or exported. Saved/exported progress contains plan snapshots and self-checks, not recordings or transcripts. Clear Learn progress removes that key and tab history.

Optional transcription downloads only pinned public files from the same app origin after an explicit action. Cache Storage may retain these public files under `speech-studio-stt-3.8.1-tiny-en-v1`. Transcripts and decoded audio remain in memory; cancel terminates the worker, and Clear transcript & model cache deletes the dedicated cache. HTTP cache may separately retain public assets. No private content is added to URLs or request bodies. The browser CSP still permits only same-origin connections. Developer asset setup downloads from upstream public sources, separately from browser rehearsal. See [Learn](LEARN.md) for limits.
