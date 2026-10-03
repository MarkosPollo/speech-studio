# Third-party notices

PDF.js 5.4.624 is bundled under `web/vendor/pdfjs/` from the official `pdfjs-dist` package. Project: https://github.com/mozilla/pdf.js. PDF.js is distributed under Apache License 2.0; its complete license is retained at `web/vendor/pdfjs/LICENSE`.

Additional bundled components keep their upstream notices:

- Character maps: `web/vendor/pdfjs/cmaps/LICENSE`.
- Foxit standard fonts: `web/vendor/pdfjs/standard_fonts/LICENSE_FOXIT`.
- Liberation fonts: `web/vendor/pdfjs/standard_fonts/LICENSE_LIBERATION`.
- JPEG 2000 decoder: `web/vendor/pdfjs/wasm/LICENSE_OPENJPEG` and `LICENSE_PDFJS_OPENJPEG`.
- JBIG2 decoder: `web/vendor/pdfjs/wasm/LICENSE_JBIG2` and `LICENSE_PDFJS_JBIG2`.
- Color management: `web/vendor/pdfjs/wasm/LICENSE_QCMS` and `LICENSE_PDFJS_QCMS`.

These upstream files are preserved unchanged. An asset hash manifest checks the bundled vendor files. ReportLab is an optional development tool for generating the committed PDF and is not shipped to browsers. GitHub Actions uses official GitHub-maintained deployment actions. No third-party photographs, company logos or slide templates are shipped.

The original application and demo are MIT licensed separately. Third-party components retain the licenses above.

## Learn and optional local transcription

`web/vendor/text-match/match.js` adapts `buildNorm` from [zhang-brook/web-teleprompter](https://github.com/zhang-brook/web-teleprompter/blob/42982afd04fd297b6075e0c8539cb93ed4e143ef/src/utils/match.ts), revision `42982afd04fd297b6075e0c8539cb93ed4e143ef`, MIT. The original license is retained alongside it. The adaptation handles Unicode offsets and is used only to quote literal transcript wording. No browser SpeechRecognition, cursor scoring, or framework code is included.

Optional transcription assets are **not committed**. `scripts/setup-local-stt.mjs` installs the files listed, sized and SHA-256 pinned in `web/stt-assets.json`. The browser fetches these only from its own host after an explicit download action:

- [Transformers.js 3.8.1](https://github.com/huggingface/transformers.js/tree/3.8.1): Apache-2.0; full `runtime/LICENSE` retained. Its bundle includes Hugging Face Jinja (MIT; `runtime/JINJA-LICENSE`). Node-only packages, including sharp, are not shipped.
- ONNX Runtime Web `1.22.0-dev.20250409-89f8206ba4`, embedded by that runtime: MIT; `runtime/ONNX-LICENSE` and `ONNX-NOTICES` retained. Single-threaded WASM baseline; WebGPU is not enabled.
- [Xenova/whisper-tiny.en](https://huggingface.co/Xenova/whisper-tiny.en/tree/79fb389fc764e7c395bd330e9531d9d32ada7049), immutable revision `79fb389fc764e7c395bd330e9531d9d32ada7049`: model card declares Apache-2.0. The original model card and full Apache license are retained. The [upstream Whisper model](https://github.com/openai/whisper/tree/v20250625) is MIT; its full license is separately retained as `UPSTREAM-LICENSE`. These licenses are separate from the application MIT license.

There is no automatic asset provisioning during tests or deployment. Hosts must explicitly run the setup command and retain the accompanying license files. Changing any pinned version requires a new asset/license and browser compatibility review.
