# Security

Do not post credentials or private rehearsal material in public issues. For a sensitive vulnerability, use a private reporting option provided by the repository host if enabled. Public bug reports should use synthetic examples only.

The app has no authentication, server, API key or cloud upload endpoint. The main boundaries are browser media permission, local storage, file rendering and downloads. Treat user-selected documents as untrusted. Keep PDF.js updated and retain its worker and license assets. Audit source and history before publishing changes. A clean current tree does not remove a secret from earlier commits.
