# PDF.js Web Viewer and Chromium Extension

This repository maintains the [PDF.js](https://mozilla.github.io/pdf.js/) web
viewer in `web/` and the Chromium extension in `extensions/chromium/`.
Both use Mozilla's official [`pdfjs-dist@6.5.438`](https://registry.npmjs.org/pdfjs-dist/6.5.438)
for parsing, rendering, and PDF form scripting.

## Getting the Code

Clone this repository and install its locked dependencies with a supported
[Node.js](https://nodejs.org/) release. See the `engines` field in
[`package.json`](package.json) for the minimum versions.

```sh
npm ci --ignore-scripts
```

## Getting Started

### Development server

```sh
npx gulp server
```

Open [the viewer](http://localhost:8888/web/viewer.html) or
[browse the test PDFs](http://localhost:8888/test/pdfs/?frame). The server
serves the viewer source and the installed distribution and watches the
localization files. Use `--port` to select a different port.

### Browser extension

Run `npx gulp chromium`. In `chrome://extensions`, enable **Developer mode**,
choose **Load unpacked**, and select `build/chromium`. To open local PDFs,
open the extension's details and enable **Allow access to file URLs**. The
extension bundles its workers, scripting sandbox, CMaps, fonts, ICC profiles,
and Wasm for offline use.

## Building

```sh
npx gulp generic
npx gulp chromium
```

Run `npx gulp build` to build both targets. To deploy the web viewer, serve
the entire `build/generic/` directory over HTTP and open `web/viewer.html`
under that directory. The `build/` and `web/` subdirectories hold the core
modules and their companion assets. Keep their relative layout intact.
The web build uses the modern distribution modules and the extension uses the
legacy modules from the same release.

When upgrading the dependency, update its exact pin and lockfile along with the
viewer compatibility version. Verify the PDF.js API/worker version checks, the
display layer's internal listener token, and the file layout of both builds.

The 6.5.438 core uses the stable text-layer metrics and editor geometry.
Ink strokes near a page edge can shift when zooming out, and re-editing a
saved stamp on a rotated page can change its size or orientation. Annotation
flattening and the experimental text-layer font mode need newer core APIs.
Sandbox-initiated print and save commands require the newer activation-token
protocol. When PDF JavaScript is active, use the viewer controls for print and
download instead of named print and save actions in the document.

## Testing and linting

The browser tests use an installed Chrome. Set `CHROME_PATH` to its executable
path if it differs from `/usr/bin/google-chrome`.

```sh
npx gulp lint
npx gulp test
node test/viewer-tests.mjs fixtures
npx gulp integrationtest --filter '^(find bar|Checkbox annotation|Text widget|Simple viewer|Scripting commands (in doc_actions|requires viewer controls))'
```

`gulp test` builds both targets and runs the Chromium preferences check,
viewer unit tests, extension telemetry tests, and browser smoke tests. The smoke suite covers rendering,
Japanese CMap and font loading, search, saving annotations, the viewer's print
preparation, and extension HTTP and offline file access.

The extended integration suite includes linked PDF fixtures. Fetch those with
`node test/viewer-tests.mjs fixtures` before running `npx gulp integrationtest`
without a filter. For suites that need a visible browser, set
`CHROME_HEADFUL=1` and run with a desktop display.

## Contributing

Change the viewer or extension in the corresponding source directory. Viewer
localization lives in `l10n/`. Edit English strings in
`l10n/en-US/viewer.ftl` and use `npx gulp importl10n` to import upstream
translations.

For the upstream project, see the [PDF.js contribution guide](https://github.com/mozilla/pdf.js/blob/master/.github/CONTRIBUTING.md)
and [API documentation](https://mozilla.github.io/pdf.js/api/).
