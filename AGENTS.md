## Project scope

This fork maintains the full Web Viewer at `web/viewer.html` and the Chromium
extension in `extensions/chromium/`. The pinned `pdfjs-dist` dependency supplies
the core library, worker, scripting sandbox, and runtime assets.

Use the [README](README.md) for setup, build, test, and lint commands. The
development server serves viewer source modules directly, where `PDFJSDev` is
undefined. When changing build conditionals or runtime asset paths, consider
source loading alongside the Web and Chromium builds.

Viewer tests live in `test/unit/` and `test/integration/`. The browser smoke suite
in `test/smoke.mjs` covers the development server, the Web distribution, and the
Chromium extension.

Edit localization strings in `l10n/en-US/viewer.ftl`. Other locales are imported
from Mozilla Firefox Nightly.
