#!/usr/bin/env node
/* Copyright 2016 Mozilla Foundation
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
/* eslint-disable no-var */

import assert from "assert";
import fs from "fs";
import vm from "vm";

var telemetryJsPath = "extensions/chromium/telemetry.js";
var telemetryJsSource = fs.readFileSync(
  new URL("../../" + telemetryJsPath, import.meta.url),
  "utf8"
);
var telemetryScript = new vm.Script(telemetryJsSource, {
  filename: telemetryJsPath,
  displayErrors: true,
});
var LOG_URL = /LOG_URL = "([^"]+)"/.exec(telemetryJsSource)[1];

// Create a minimal extension global that mocks the extension environment that
// is used by telemetry.js
function createExtensionGlobal() {
  var window = {};

  // Whenever a "request" was made, the extra headers are appended to this list.
  var test_requests = (window.test_requests = []);

  // Extension API mocks.
  window.window = window;
  window.chrome = {};
  window.chrome.extension = {};
  window.chrome.extension.inIncognitoContext = false;
  window.chrome.runtime = {};
  window.chrome.runtime.id = "oemmndcbldboiebfnladdacbdfmadadm";
  window.chrome.runtime.getManifest = function () {
    return { version: "1.0.0" };
  };

  function createStorageAPI() {
    return {
      get(key, callback) {
        if (typeof key === "string") {
          assert.equal(key, "disableTelemetry");
          callback(this.mock_data);
        } else {
          callback({ ...key, ...this.mock_data });
        }
      },
      set(items) {
        this.mock_data = { ...this.mock_data, ...items };
      },
    };
  }
  window.chrome.storage = {};
  window.chrome.storage.managed = createStorageAPI();
  window.chrome.storage.local = createStorageAPI();
  window.chrome.storage.sync = createStorageAPI();
  window.chrome.storage.session = createStorageAPI();

  // Other DOM.
  window.navigator = {};
  window.navigator.onLine = true;
  window.navigator.userAgent =
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) " +
    "Chrome/50.0.2661.94 Safari/537.36";

  var getRandomValues_state = 0;
  window.crypto = {};
  window.crypto.getRandomValues = function (buf) {
    var state = getRandomValues_state++;
    for (var i = 0; i < buf.length; ++i) {
      // Totally random byte ;)
      buf[i] = 0x42 + state;
    }
    return buf;
  };

  // Network-related mocks.
  window.fetch = function (url, options) {
    assert.equal(url, LOG_URL);
    assert.equal(options.method, "POST");
    assert.equal(options.mode, "cors");
    assert.ok(!options.body);
    test_requests.push(options.headers);
  };
  window.Headers = function (headers) {
    headers = JSON.parse(JSON.stringify(headers)); // Clone.
    Object.keys(headers).forEach(k => {
      headers[k] = String(headers[k]);
    });
    return headers;
  };
  // Time-related logic.
  let alarmListener;
  window.chrome.alarms = {
    onAlarm: {
      addListener(listener) {
        alarmListener = listener;
      },
    },
    clear() {},
    create() {},
  };
  window.Date = {
    test_now_value: Date.now(),
    now: () => window.Date.test_now_value,
  };
  window.test_fireTimers = function () {
    alarmListener({ name: "maybeSendPing" });
  };

  return window;
}

function restartBackground(window) {
  window.chrome.storage.session.mock_data = {};
  telemetryScript.runInNewContext(window);
}

// Simulate an update of the browser.
function updateBrowser(window) {
  window.navigator.userAgent = window.navigator.userAgent.replace(
    /Chrome\/(\d+)/,
    (_, v) => "Chrome/" + (parseInt(v, 10) + 1)
  );
}

var tests = [
  function test_first_run() {
    // Default settings, run extension for the first time.
    var window = createExtensionGlobal();
    restartBackground(window);
    assert.deepEqual(window.test_requests, [
      {
        "Deduplication-Id": "4242424242",
        "Extension-Version": "1.0.0",
      },
    ]);
  },

  function test_first_run_incognito() {
    // The extension should not send any requests when in incognito mode.
    var window = createExtensionGlobal();
    window.chrome.extension.inIncognitoContext = true;
    restartBackground(window);
    assert.deepEqual(window.test_requests, []);
  },

  function test_storage_managed_unavailable() {
    var window = createExtensionGlobal();
    delete window.chrome.storage.managed;
    restartBackground(window);
    assert.deepEqual(window.test_requests, [
      {
        "Deduplication-Id": "4242424242",
        "Extension-Version": "1.0.0",
      },
    ]);
  },

  function test_managed_pref() {
    var window = createExtensionGlobal();
    window.chrome.storage.managed.mock_data = {
      disableTelemetry: true,
    };
    restartBackground(window);
    assert.deepEqual(window.test_requests, []);
  },

  function test_local_pref() {
    var window = createExtensionGlobal();
    window.chrome.storage.local.mock_data = {
      disableTelemetry: true,
    };
    restartBackground(window);
    assert.deepEqual(window.test_requests, []);
  },

  function test_managed_pref_is_overridden() {
    var window = createExtensionGlobal();
    window.chrome.storage.managed.mock_data = {
      disableTelemetry: true,
    };
    window.chrome.storage.sync.mock_data = {
      disableTelemetry: false,
    };
    restartBackground(window);
    assert.deepEqual(window.test_requests, [
      {
        "Deduplication-Id": "4242424242",
        "Extension-Version": "1.0.0",
      },
    ]);
  },

  function test_run_extension_again() {
    var window = createExtensionGlobal();
    restartBackground(window);
    restartBackground(window);
    // Only one request should be sent because of rate-limiting.
    assert.deepEqual(window.test_requests, [
      {
        "Deduplication-Id": "4242424242",
        "Extension-Version": "1.0.0",
      },
    ]);

    // Simulate that quite some hours passed, but it's still rate-limited.
    window.Date.test_now_value += 11 * 36e5;
    restartBackground(window);
    // Only one request should be sent because of rate-limiting.
    assert.deepEqual(window.test_requests, [
      {
        "Deduplication-Id": "4242424242",
        "Extension-Version": "1.0.0",
      },
    ]);

    // Another hour passes and the request should not be rate-limited any more.
    window.Date.test_now_value += 1 * 36e5;
    restartBackground(window);
    assert.deepEqual(window.test_requests, [
      {
        "Deduplication-Id": "4242424242",
        "Extension-Version": "1.0.0",
      },
      {
        "Deduplication-Id": "4242424242",
        "Extension-Version": "1.0.0",
      },
    ]);
  },

  function test_running_for_a_while() {
    var window = createExtensionGlobal();
    restartBackground(window);
    assert.deepEqual(window.test_requests, [
      {
        "Deduplication-Id": "4242424242",
        "Extension-Version": "1.0.0",
      },
    ]);

    // Simulate that the timer fired 11 hours since the last ping. The request
    // should still be rate-limited.
    window.Date.test_now_value += 11 * 36e5;
    window.test_fireTimers();
    assert.deepEqual(window.test_requests, [
      {
        "Deduplication-Id": "4242424242",
        "Extension-Version": "1.0.0",
      },
    ]);

    // Another hour passes and the request should not be rate-limited any more.
    window.Date.test_now_value += 1 * 36e5;
    window.test_fireTimers();
    assert.deepEqual(window.test_requests, [
      {
        "Deduplication-Id": "4242424242",
        "Extension-Version": "1.0.0",
      },
      {
        "Deduplication-Id": "4242424242",
        "Extension-Version": "1.0.0",
      },
    ]);
  },

  function test_browser_update() {
    var window = createExtensionGlobal();
    restartBackground(window);
    updateBrowser(window);
    restartBackground(window);
    assert.deepEqual(window.test_requests, [
      {
        "Deduplication-Id": "4242424242",
        "Extension-Version": "1.0.0",
      },
      {
        // Generate a new ID for better privacy.
        "Deduplication-Id": "4343434343",
        "Extension-Version": "1.0.0",
      },
    ]);
  },

  function test_browser_update_between_pref_toggle() {
    var window = createExtensionGlobal();
    restartBackground(window);
    window.chrome.storage.local.mock_data = {
      disableTelemetry: true,
    };
    updateBrowser(window);
    restartBackground(window);
    window.chrome.storage.local.mock_data = {
      disableTelemetry: false,
    };
    restartBackground(window);
    assert.deepEqual(window.test_requests, [
      {
        "Deduplication-Id": "4242424242",
        "Extension-Version": "1.0.0",
      },
      {
        // Generate a new ID for better privacy, even if the update happened
        // while telemetry was disabled.
        "Deduplication-Id": "4343434343",
        "Extension-Version": "1.0.0",
      },
    ]);
  },

  function test_extension_update() {
    var window = createExtensionGlobal();
    restartBackground(window);
    window.chrome.runtime.getManifest = function () {
      return { version: "1.0.1" };
    };
    window.Date.test_now_value += 12 * 36e5;
    restartBackground(window);
    assert.deepEqual(window.test_requests, [
      {
        "Deduplication-Id": "4242424242",
        "Extension-Version": "1.0.0",
      },
      {
        // The ID did not change because the browser version did not change.
        "Deduplication-Id": "4242424242",
        "Extension-Version": "1.0.1",
      },
    ]);
  },

  function test_unofficial_build() {
    var window = createExtensionGlobal();
    var didWarn = false;
    window.console = {};
    window.console.warn = function () {
      didWarn = true;
    };
    window.chrome.runtime.id = "abcdefghijklmnopabcdefghijklmnop";
    restartBackground(window);
    assert.deepEqual(window.test_requests, []);
    assert.ok(didWarn);
  },

  function test_network_offline() {
    var window = createExtensionGlobal();
    // Simulate that the network is down for sure.
    window.navigator.onLine = false;
    restartBackground(window);
    assert.deepEqual(window.test_requests, []);

    // Simulate that the network might be up.
    window.navigator.onLine = true;
    restartBackground(window);
    assert.deepEqual(window.test_requests, [
      {
        "Deduplication-Id": "4242424242",
        "Extension-Version": "1.0.0",
      },
    ]);
  },
];
var test_i = 0;

(function next() {
  var test = tests[test_i++];
  if (!test) {
    console.log("All tests completed.");
    return;
  }
  console.log("Running test " + test_i + "/" + tests.length + ": " + test.name);
  test();
  process.nextTick(next);
})();
