## Project scope

This fork maintains the extension Viewer at `web/viewer.html` and the Chromium
extension in `extensions/chromium/`. The pinned `pdfjs-dist` dependency supplies
the core library, worker, scripting sandbox, and runtime assets.

Use the [README](README.md) for setup, build, test, and lint commands.
Build with `gulp build`, load `build/chromium/` in Chrome, and open a PDF.
Verify runtime asset paths relative to the packaged `content/web/viewer.html`.

Viewer tests live in `test/unit/` and `test/integration/`. Integration tests
load the test-only Chromium extension and fetch PDFs from the local test
server. The smoke suite in `test/smoke.mjs` loads the production extension.

Edit localization strings in `l10n/en-US/viewer.ftl`. Other locales are imported
from Mozilla Firefox Nightly.
