# Speech Studio

A calm rehearsal workspace for your next presentation. Keep your slides, words and camera together, then record a take and review your delivery.

**[Open Speech Studio](https://markospollo.github.io/speech-studio/)** · [Quickstart](#quickstart) · [Privacy](docs/PRIVACY.md) · [Browser support](docs/ACCESSIBILITY.md)

No account, installation or API key is required. The included SpaceX case study is an independent educational demo, with original diagrams and [verified sources](docs/DEMO-SOURCES.md). Speech Studio is not affiliated with or endorsed by SpaceX or NASA.

## What you can do

- Load a PDF or PNG, JPG and WebP slides; navigate with buttons or the keyboard.
- Read a full script with adjustable text size and autoscroll, or practice with six editable cue cards.
- Switch between a balanced workspace, slides focus, and camera plus script.
- Rehearse with a camera and microphone, camera only, or microphone only.
- Record after a three-second countdown, pause and resume, review, and download your take.
- Set your own target duration, with closing reminders and overtime; it never cuts you off.
- Use [Learn mode](docs/LEARN.md) for whole-talk, section and weak-spot practice without a microphone, editable plans, fewer prompts and self-checks.
- Optionally install a pinned same-origin English transcription model for local post-take analysis.

Slides are a reference. Downloads contain the camera and/or microphone recording, not a screen recording of slides or script.

## Quickstart

1. Open the app in a current browser. The demo script and six-page demo PDF load automatically.
2. Choose **Load slides** for your own deck. Export PowerPoint or Keynote to PDF first.
3. Edit the script or cue cards. They save in this browser; use **Download text** to keep a copy.
4. Choose a recording mode and enable the camera or microphone. Permission is requested only when you choose to enable it.
5. Press **Record take**, rehearse, then **Stop**. Review and **Download take** before closing or refreshing the tab.

You can rehearse the text and slides without granting media permission.

## Run locally

The app is plain HTML, CSS and JavaScript. There is no build or package install.

```sh
python3 -m http.server 8080 --directory web
```

Open `http://localhost:8080`. ES modules and the demo PDF require an HTTP server; opening the HTML as a local file is not supported. Camera access requires HTTPS or localhost.

```sh
node --test tests/*.test.mjs
node scripts/audit.mjs
```

## Privacy and data flow

The browser downloads the app, the bundled PDF renderer and the demo. Your selected slides and recordings stay in the tab. Script edits and reader settings use local storage. There is no app backend, analytics, scoring, cloud upload or remote font service. Optional post-take transcription runs locally after an explicit model download; Learn progress is saved only when you choose Save. Hosting providers receive ordinary web requests; see [the full privacy notes](docs/PRIVACY.md).

## Project notes

- [Accessibility and browser limits](docs/ACCESSIBILITY.md)
- [Deploy your own instance](docs/DEPLOYMENT.md)
- [Contribute](CONTRIBUTING.md)
- [Security](SECURITY.md)
- [Third-party notices](THIRD_PARTY_NOTICES.md)
- [Prepared launch copy](docs/LAUNCH.md)
- [Verification record](docs/VERIFICATION.md)

## Rights

The original application code and demo content are available under the [MIT License](LICENSE). Third-party components retain their own licenses, as listed in [Third-party notices](THIRD_PARTY_NOTICES.md). SpaceX and NASA names remain their respective owners’ trademarks.

Optional transcription setup: `node scripts/setup-local-stt.mjs`. This downloads pinned public assets into ignored `web/local-stt/` and preserves all licenses. No build is needed. See [Learn and local STT](docs/LEARN.md), [AI research only](docs/AI-DESIGN.md) and [verification](docs/VERIFICATION.md).
