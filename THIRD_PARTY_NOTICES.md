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
