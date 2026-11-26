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

import {
  downloadManifestFiles,
  verifyManifestFiles,
} from "./downloadutils.mjs";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import puppeteer from "puppeteer";
import { runSmokeTests } from "./smoke.mjs";
import { WebServer } from "./webserver.mjs";

async function runUnitTests(browser, origin) {
  const page = await browser.newPage();
  page.on("pageerror", error => console.error(error));
  await page.goto(origin + "/test/unit/unit_test.html");
  await page.waitForFunction(() => window.viewerUnitResults);
  const { runs, failures, status } = await page.evaluate(
    () => window.viewerUnitResults
  );
  await page.close();
  for (const { test, reasons } of failures) {
    console.error(test, reasons.join("\n"));
  }
  assert.equal(status, "passed");
  console.log(`Passed ${runs} viewer unit tests.`);
}

async function runIntegrationTests(browser, origin, filter) {
  const { runTests } = await import("./integration/jasmine-boot.js");
  const extensionId = await browser.installExtension(
    path.resolve("build/chromium-test")
  );
  globalThis.integrationBaseUrl = `chrome-extension://${extensionId}/content/web/viewer.html`;
  globalThis.integrationPdfBaseUrl = origin + "/test/pdfs/";
  globalThis.integrationSessions = [
    { name: "chrome", browserType: "chrome", browser },
  ];
  const results = { runs: 0, failures: 0 };
  const { overallStatus } = await runTests(results, filter);
  assert.equal(overallStatus, "passed");
  assert(results.runs > 0, "No integration tests matched.");
}

async function prepareFixtures({ unitOnly = false } = {}) {
  let manifest = JSON.parse(
    await fs.readFile("test/test_manifest.json", "utf8")
  );
  if (unitOnly) {
    manifest = manifest.filter(({ unit }) => unit);
  }
  await downloadManifestFiles(manifest);
  await verifyManifestFiles(manifest);
}

const [, , mode, filter] = process.argv;
if (mode === "fixtures") {
  await prepareFixtures();
} else {
  if (mode === "unit") {
    await prepareFixtures({ unitOnly: true });
  }
  const server = new WebServer({ host: "127.0.0.1" });
  await new Promise(resolve => {
    server.start(resolve);
  });
  const origin = `http://${server.host}:${server.port}`;
  const integration = mode === "integration";
  const args = ["--no-sandbox", "--disable-dev-shm-usage"];
  if (integration) {
    args.push("--disable-gpu", "--kiosk-printing", "--window-size=1920,1080");
  }
  try {
    const browser = await puppeteer.launch({
      executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome",
      headless: process.env.CHROME_HEADFUL !== "1",
      protocol: integration ? "webDriverBiDi" : "cdp",
      // The document properties specs compare dates formatted in UTC.
      env: integration ? { ...process.env, TZ: "UTC" } : process.env,
      defaultViewport: integration ? null : undefined,
      pipe: true,
      enableExtensions: integration || mode === "smoke",
      args,
    });
    try {
      if (mode === "unit") {
        await runUnitTests(browser, origin);
      } else if (mode === "smoke") {
        await runSmokeTests(browser, origin);
      } else if (mode === "integration") {
        await runIntegrationTests(browser, origin, filter);
      } else {
        throw new Error(`Unknown viewer test mode: ${mode}`);
      }
    } finally {
      await browser.close();
    }
  } finally {
    await new Promise(resolve => {
      server.stop(resolve);
    });
  }
}
