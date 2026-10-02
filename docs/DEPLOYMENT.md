# Deployment

Speech Studio is a static site. Serve `web/` at the root of a site or any URL subdirectory; all application asset paths are relative. Use HTTPS for camera/microphone access.

## GitHub Pages

1. Create a separate repository containing only the public project files.
2. In **Settings → Pages**, choose **GitHub Actions** as the build source.
3. Push to `main`. The included workflow runs the tests and audit, uploads only `web/`, then deploys through the official Pages actions.
4. Check the workflow result and Pages deployment URL. Open it in a logged-out browser and confirm the demo renders.

The workflow needs `contents: read`, `pages: write` and `id-token: write` for deployment. Pull requests run checks with read-only contents permission and do not deploy. No personal access token or paid service is required for this public Pages project.

GitHub Pages does not apply the `_headers` file. The app includes a Content Security Policy and referrer policy as HTML metadata. For hosts supporting `_headers`, the supplied file additionally sets media Permissions-Policy and content-type protection. A meta CSP cannot provide every HTTP-header protection; for example, frame restrictions require a response header.

## Other static hosts

Publish only `web/` with no build command. Retain `.mjs`, `.wasm`, fonts and character maps with their original paths and MIME types. Keep the PDF.js worker on the same origin. Do not add keys, private source archives, local uploads or recordings to the deployed directory.

## PDF updates

The committed demo PDF is ready to serve. To regenerate it, use Python 3 and ReportLab in a temporary virtual environment, then run `python scripts/build-demo.py`. The generator sets neutral metadata and draws original conceptual diagrams. Review the resulting pages before committing. Any factual changes must be checked against primary sources and updated in `docs/DEMO-SOURCES.md` and the browser-readable descriptions.
