/* Copyright 2017 Mozilla Foundation
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
/*
 Copyright (c) 2008-2016 Pivotal Labs

 Permission is hereby granted, free of charge, to any person obtaining
 a copy of this software and associated documentation files (the
 "Software"), to deal in the Software without restriction, including
 without limitation the rights to use, copy, modify, merge, publish,
 distribute, sublicense, and/or sell copies of the Software, and to
 permit persons to whom the Software is furnished to do so, subject to
 the following conditions:

 The above copyright notice and this permission notice shall be
 included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import { GlobalWorkerOptions } from "pdfjs-dist";

const env = jasmine.getEnv();

GlobalWorkerOptions.workerSrc =
  "../../node_modules/pdfjs-dist/build/pdf.worker.mjs";

const failures = [];
let runs = 0;
env.addReporter({
  specDone(result) {
    if (result.status !== "excluded") {
      runs++;
    }
    if (result.status === "failed") {
      failures.push({
        test: result.fullName,
        reasons: result.failedExpectations.map(({ message }) => message),
      });
    }
  },
  jasmineDone(result) {
    window.viewerUnitResults = { runs, failures, status: result.overallStatus };
  },
});

await Promise.all(
  [
    "./app_options_spec.js",
    "./autolinker_spec.js",
    "./event_utils_spec.js",
    "./pdf_find_controller_spec.js",
    "./pdf_find_utils_spec.js",
    "./pdf_history_spec.js",
    "./pdf_link_service_spec.js",
    "./pdf_viewer.component_spec.js",
    "./pdf_viewer_spec.js",
    "./struct_tree_layer_builder_spec.js",
    "./ui_utils_spec.js",
  ].map(filename => import(filename)) // eslint-disable-line no-unsanitized/method
);
await env.execute();
