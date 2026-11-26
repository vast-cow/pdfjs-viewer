# Developing the extension

Install dependencies with `npm ci --ignore-scripts` and run `npx gulp build`.
In Chrome, open `chrome://extensions`, enable **Developer mode**, and use
**Load unpacked** to select `build/chromium/`. Open a PDF over HTTP or HTTPS
to check your changes. For local PDFs, enable **Allow access to file URLs**
in the extension details. Rebuild and reload the extension after changes.

Edit the viewer in `web/` and the extension files in `extensions/chromium/`.
The [README](../README.md#testing-and-linting) lists the lint and test commands.

# Reporting issues

- Report issues specific to this Web Viewer or Chromium extension in the
  [fork's issue tracker](https://github.com/vast-cow/pdfjs-viewer/issues).
- Report problems that also reproduce in upstream PDF.js, including in the
  `pdfjs-dist` core, in the [upstream issue tracker](https://github.com/mozilla/pdf.js/issues).
- Follow the [security policy](SECURITY.md) for vulnerabilities.

File one issue per problem. Include reproduction steps, expected and actual
behavior, the browser and OS versions, the fork revision, and relevant console
messages or screenshots. If the problem depends on a particular PDF, attach a
small reproducible example with any sensitive information removed. Include the
page or section where the problem occurs.
