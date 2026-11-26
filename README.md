# PDF.js Viewer for Chromium

This repository maintains the full [PDF.js](https://mozilla.github.io/pdf.js/)
viewer in `web/` and the Chromium extension in `extensions/chromium/`.
The extension bundles Mozilla's official
[`pdfjs-dist@6.5.438`](https://registry.npmjs.org/pdfjs-dist/6.5.438)
for parsing, rendering, and PDF form scripting.

## Getting the Code

Clone this repository and install its locked dependencies with a supported
[Node.js](https://nodejs.org/) release. See the `engines` field in
[`package.json`](package.json) for the minimum versions.

```sh
npm ci --ignore-scripts
```

## Getting Started

Run `npx gulp build`. Open `chrome://extensions`, enable **Developer mode**,
choose **Load unpacked**, and select `build/chromium/`. Open an HTTP or HTTPS
PDF in Chrome to use the viewer. For local PDFs, open the extension's details
and enable **Allow access to file URLs**.

## Building

```sh
npx gulp build
```

`npx gulp chromium` runs the same build. The product is `build/chromium/`,
with the viewer at `content/web/viewer.html` inside the extension. The extension
bundles the legacy PDF.js modules, worker and renderer, scripting sandbox,
CMaps, fonts, ICC profiles, and Wasm for offline use.

When upgrading the dependency, update its exact pin and lockfile along with the
viewer compatibility version. Verify the PDF.js API/worker version checks, the
display layer's internal listener token, and the bundled extension file layout.

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
npx gulp integrationtest --filter '^(find bar|Checkbox annotation|Text widget|Scripting commands (in doc_actions|requires viewer controls))'
```

`gulp test` builds the extension and runs the Chromium preferences check,
viewer unit tests, extension telemetry tests, and browser smoke tests. Smoke
tests check rendering, Japanese CMap and font loading, search, annotation
saving, and print preparation on an HTTP PDF routed to the extension. They
also check PDFs embedded with `<embed>` and `<object>`, the extension's settings
page, and offline local PDF access and scripting.

Integration tests load a test-only extension from `build/chromium-test/`.
The test HTTP server provides PDF fixtures and test pages. Fetch the linked
fixtures with `node test/viewer-tests.mjs fixtures` before running
`npx gulp integrationtest` without a filter. For suites that need a visible
browser, set `CHROME_HEADFUL=1` and run with a desktop display.

## Contributing

Change the viewer or extension in the corresponding source directory. Viewer
localization lives in `l10n/`. Edit English strings in
`l10n/en-US/viewer.ftl` and use `npx gulp importl10n` to import upstream
translations.

Use the fork's issue tracker for problems specific to this Web Viewer or
Chromium extension. Report problems that reproduce in upstream PDF.js in
Mozilla's issue tracker. Follow the security policy for vulnerabilities.
[Fork issues](https://github.com/vast-cow/pdfjs-viewer/issues) ·
[Upstream issues](https://github.com/mozilla/pdf.js/issues) ·
[Security policy](.github/SECURITY.md)

For the upstream project, see the [PDF.js contribution guide](https://github.com/mozilla/pdf.js/blob/master/.github/CONTRIBUTING.md)
and [API documentation](https://mozilla.github.io/pdf.js/api/).
