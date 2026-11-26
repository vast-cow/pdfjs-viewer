/* Copyright 2014 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// PLEASE NOTE: This code is intended for development purposes only and
//              should NOT be used in production environments.

import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import assert from "node:assert/strict";
import path from "node:path";
import { pathToFileURL } from "node:url";

const fixture = "90ms_rksj_h_sample.pdf";
const input = "/test/pdfs/" + fixture;
function forceStandardFonts() {
  Object.defineProperty(window, "PDFViewerApplicationOptions", {
    configurable: true,
    get: () => undefined,
    set(options) {
      options.set("useSystemFonts", false);
      Object.defineProperty(window, "PDFViewerApplicationOptions", {
        configurable: true,
        value: options,
      });
    },
  });
}
async function runSmokeTests(browser, base) {
  const root = process.cwd();
  const downloads = await mkdtemp(path.join(root, "build/downloads-"));
  try {
    for (const viewerPath of [
      "/web/viewer.html",
      "/build/generic/web/viewer.html",
    ]) {
      const page = await browser.newPage();
      await page.evaluateOnNewDocument(forceStandardFonts);
      const requests = [];
      const errors = [];
      page.on("response", response => {
        if (
          response.status() >= 400 &&
          !response.url().endsWith("favicon.ico")
        ) {
          errors.push(response.status() + " " + response.url());
        }
      });
      page.on("pageerror", error => errors.push(error.message));
      page.on("console", msg => {
        if (msg.type() === "error" && !msg.text().includes("favicon")) {
          console.log("browser console", msg.text());
        }
      });
      page.on("request", req => requests.push(req.url()));
      await page.evaluateOnNewDocument(() => {
        window.print = () => {
          window.printedPages = [
            ...document.querySelectorAll("#printContainer img"),
          ].filter(img => img.naturalWidth > 0).length;
        };
      });
      await page.goto(base + viewerPath + "?file=" + input);
      try {
        await page.waitForFunction(
          () =>
            window.PDFViewerApplication?.pdfDocument &&
            document.querySelector(".textLayer .endOfContent"),
          { timeout: 12000 }
        );
      } catch (e) {
        console.log(
          await page.evaluate(() => ({
            app: !!window.PDFViewerApplication,
            body: document.body.innerText.slice(-400),
          })),
          errors
        );
        throw e;
      }
      const text = await page.evaluate(async () => {
        const app = window.PDFViewerApplication;
        const pdfPage = await app.pdfDocument.getPage(1);
        return (await pdfPage.getTextContent()).items
          .map(item => item.str)
          .join(" ");
      });
      console.log(
        viewerPath,
        text,
        requests.filter(url => /bcmap|standard_fonts/.test(url))
      );
      assert.equal(
        await page.evaluate(() => window.pdfjsLib.version),
        "6.5.438"
      );
      assert.match(text, /日本語テスト/);
      assert(
        requests.some(url => url.endsWith("/90ms-RKSJ-H.bcmap")),
        "The Japanese CMap was not requested."
      );
      assert(
        requests.some(url => url.includes("/standard_fonts/")),
        "No standard fonts were requested."
      );
      await page.click("#viewFindButton");
      await page.type("#findInput", "日本語テスト");
      await page.waitForSelector(".textLayer .highlight");
      await page.click("#editorFreeText");
      await page.mouse.click(420, 370);
      await page.waitForSelector(".freeTextEditor [contenteditable=true]");
      await page.keyboard.type("Viewer smoke test");
      await page.keyboard.press("Escape");
      const edited = await page.evaluate(async () => {
        const app = window.PDFViewerApplication;
        const { promise, resolve } = Promise.withResolvers();
        app.downloadManager.download = resolve;
        await app.downloadOrSave();
        const data = await promise;
        const task = window.pdfjsLib.getDocument({ data });
        try {
          const pdfPage = await (await task.promise).getPage(1);
          return (await pdfPage.getAnnotations()).some(
            item =>
              item.annotationType === window.pdfjsLib.AnnotationType.FREETEXT
          );
        } finally {
          await task.destroy();
        }
      });
      assert(edited, "The downloaded PDF was missing the saved annotation.");
      await page.waitForFunction(
        () => window.PDFViewerApplication.pdfViewer.pageViewsReady
      );
      await page.evaluate(() => window.PDFViewerApplication.triggerPrinting());
      await page.waitForFunction(() => window.printedPages === 1, {
        timeout: 15000,
      });
      assert.deepEqual(errors, []);
      console.log("PASS render, search, annotation save and print", viewerPath);

      await page.goto(base + "/test/");
      await page.setContent('<iframe width="760" height="500"></iframe>');
      const iframe = await page.waitForSelector("iframe");
      const viewerFrame = await iframe.contentFrame();
      await viewerFrame.goto(base + viewerPath + "?file=" + input);
      await viewerFrame.waitForFunction(
        () =>
          window.PDFViewerApplication?.isViewerEmbedded &&
          document.querySelector(".textLayer .endOfContent")
      );
      await viewerFrame.waitForSelector(".page .canvasWrapper canvas", {
        visible: true,
      });
      assert.deepEqual(errors, []);
      console.log("PASS embedded full viewer", viewerPath);
      await page.close();
    }

    const extensionId = await browser.installExtension(
      path.join(root, "build/chromium")
    );
    const prefix = "chrome-extension://" + extensionId;
    console.log("installed", prefix);
    const extensionSettings = await browser.newPage();
    await extensionSettings.goto(prefix + "/options/options.html");
    const options = await extensionSettings.evaluate(async () => {
      await globalThis.chrome.storage.sync.set({
        defaultZoomValue: "page-width",
        disableWorkerRendering: false,
        enableScripting: true,
      });
      return globalThis.chrome.storage.sync.get("defaultZoomValue");
    });
    assert.equal(options.defaultZoomValue, "page-width");
    const management = await browser.newPage();
    await management.goto("chrome://extensions");
    await management.evaluate(async id => {
      await globalThis.chrome.developerPrivate.updateExtensionConfiguration({
        extensionId: id,
        fileAccess: true,
      });
    }, extensionId);
    await management.close();
    await extensionSettings.close();
    const cdp = await browser.target().createCDPSession();
    await cdp.send("Browser.setDownloadBehavior", {
      behavior: "allow",
      downloadPath: downloads,
    });
    const file = pathToFileURL(path.resolve("." + input)).href;
    for (const [kind, url] of [
      ["HTTP", base + input],
      ["local", file],
    ]) {
      const page = await browser.newPage();
      await page.evaluateOnNewDocument(forceStandardFonts);
      if (kind === "local") {
        await page.setOfflineMode(true);
      }
      const errors = [];
      const assets = new Set();
      const workers = new Set();
      await page.evaluateOnNewDocument(() => {
        window.cspViolations = [];
        document.addEventListener("securitypolicyviolation", event => {
          window.cspViolations.push(
            event.violatedDirective + " " + event.blockedURI
          );
        });
      });
      page.on("workercreated", worker => workers.add(worker.url()));
      page.on("request", request => assets.add(request.url()));
      page.on("requestfailed", request => {
        if (request.url().startsWith(prefix)) {
          errors.push(`${request.failure()?.errorText} ${request.url()}`);
        }
      });
      page.on("response", response => {
        if (response.status() >= 400 && response.url().startsWith(prefix)) {
          errors.push(response.status() + " " + response.url());
        }
      });
      page.on("pageerror", error => errors.push(error.message));
      page.on("console", msg => {
        if (msg.type() === "error") {
          console.log("extension console", msg.text());
        }
      });
      try {
        await page.goto(url);
      } catch (error) {
        if (!error.message.includes("ERR_ABORTED")) {
          throw error;
        }
      }
      try {
        await page.waitForFunction(
          () =>
            window.PDFViewerApplication?.pdfDocument &&
            document.querySelector(".textLayer .endOfContent"),
          { timeout: 15000 }
        );
      } catch (error) {
        console.log(page.url(), errors, [...assets]);
        throw error;
      }
      assert(
        page.url().startsWith(prefix),
        "Chrome did not route the PDF to the extension."
      );
      assert.equal(
        await page.evaluate(
          () => window.PDFViewerApplication.pdfViewer.currentScaleValue
        ),
        "page-width"
      );
      assert.equal(
        await page.evaluate(() => window.pdfjsLib.version),
        "6.5.438"
      );
      assert(
        workers.has(prefix + "/content/build/pdf.worker.mjs"),
        JSON.stringify([...workers])
      );
      assert(
        workers.has(prefix + "/content/build/pdf.renderer.mjs"),
        `Renderer worker failed to start: ${JSON.stringify([...workers])}`
      );
      assert(
        [...assets].some(item => item.endsWith("/90ms-RKSJ-H.bcmap")),
        "The bundled Japanese CMap was not requested."
      );
      assert(
        [...assets].some(item => item.includes("/standard_fonts/")),
        "No bundled standard fonts were requested."
      );
      assert.deepEqual(await page.evaluate(() => window.cspViolations), []);
      if (kind === "local") {
        assert(
          ![...assets].some(item => /^https?:/.test(item)),
          "The offline viewer attempted an HTTP request."
        );
      }
      assert.deepEqual(errors, []);
      await page.click("#downloadButton");
      let downloaded;
      for (let i = 0; i < 50; i++) {
        downloaded = (await readdir(downloads)).find(name =>
          name.endsWith(".pdf")
        );
        if (downloaded) {
          break;
        }
        await new Promise(resolve => {
          setTimeout(resolve, 100);
        });
      }
      assert(downloaded, "Chrome did not download the PDF.");
      const downloadedPath = path.join(downloads, downloaded);
      assert.deepEqual(
        await readFile(downloadedPath),
        await readFile("." + input)
      );
      await rm(downloadedPath);
      await page.close();
      console.log(
        "PASS extension",
        kind,
        "worker, preferences, assets, CSP and download"
      );
    }
    const scripts = await browser.newPage();
    await scripts.setOfflineMode(true);
    const wasm = new Set();
    const errors = [];
    scripts.on("response", response => {
      if (response.url().includes("quickjs")) {
        if (response.ok()) {
          wasm.add(new URL(response.url()).pathname.split("/").pop());
        } else {
          errors.push(response.status() + " " + response.url());
        }
      }
    });
    scripts.on("pageerror", error => errors.push(error.message));
    scripts.on("console", message => {
      if (
        message.type() === "error" &&
        /policy|quickjs/i.test(message.text())
      ) {
        errors.push(message.text());
      }
    });
    const scripted = pathToFileURL(
      path.join(root, "test/pdfs/evaljs.pdf")
    ).href;
    await scripts.goto(scripted).catch(error => {
      if (!error.message.includes("ERR_ABORTED")) {
        throw error;
      }
    });
    await scripts.waitForFunction(
      () => window.PDFViewerApplication?.scriptingReady === true
    );
    const inputSelector = '[data-element-id="55R"]';
    const outputSelector = '[data-element-id="56R"]';
    await scripts.type(inputSelector, "1 + 1");
    await scripts.click('[data-annotation-id="57R"]');
    await scripts.waitForFunction(
      selector => document.querySelector(selector)?.value === "2",
      {},
      outputSelector
    );
    assert.deepEqual([...wasm].sort(), [
      "quickjs-eval.js",
      "quickjs-eval.wasm",
    ]);
    assert.deepEqual(errors, []);
    console.log("PASS extension local QuickJS sandbox and Wasm");
  } finally {
    await rm(downloads, { recursive: true, force: true });
  }
}

export { runSmokeTests };
