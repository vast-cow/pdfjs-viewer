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

import { createPromiseCapability } from "../../web/promise_utils.js";

class FakeMLManager {
  eventBus = null;

  hasProgress = false;

  constructor({ enableGuessAltText, enableAltTextModelDownload }) {
    this.enableGuessAltText = enableGuessAltText;
    this.enableAltTextModelDownload = enableAltTextModelDownload;
  }

  setEventBus(eventBus, abortSignal) {
    this.eventBus = eventBus;
  }

  async isEnabledFor(_name) {
    return this.enableGuessAltText;
  }

  async deleteModel(_name) {
    this.enableAltTextModelDownload = false;
    return null;
  }

  async loadModel(_name) {}

  async downloadModel(_name) {
    // Simulate downloading the model but with progress.
    // The progress can be seen in the new alt-text dialog.
    this.hasProgress = true;

    const { promise, resolve } = createPromiseCapability();
    const total = 1e8;
    const end = 1.5 * total;
    const increment = 5e6;
    let loaded = 0;
    const id = setInterval(() => {
      loaded += increment;
      if (loaded <= end) {
        this.eventBus.dispatch("loadaiengineprogress", {
          source: this,
          detail: {
            total,
            totalLoaded: loaded,
            finished: loaded + increment >= end,
          },
        });
        return;
      }
      clearInterval(id);
      this.hasProgress = false;
      this.enableAltTextModelDownload = true;
      resolve(true);
    }, 900);
    return promise;
  }

  isReady(_name) {
    return this.enableAltTextModelDownload;
  }

  guess({ request: { data } }) {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(data ? { output: "Fake alt text." } : { error: true });
      }, 3000);
    });
  }

  toggleService(_name, enabled) {
    this.enableGuessAltText = enabled;
  }
}

class FakeSignatureVerifier {
  async verify(signature) {
    if (signature.signatureType === null) {
      return {
        status: "unknown",
        errorCode: "SUBFILTER_NOT_SUPPORTED",
        message: signature.subFilter,
        certificate: null,
        documentModifiedAfterSigning: !signature.coversWholeDocument,
        modificationsAfterSignature: signature.modificationsAfterSignature,
      };
    }

    return {
      status: "unknown",
      errorCode: "EMPTY_RESPONSE",
      message: null,
      certificate: null,
      documentModifiedAfterSigning: !signature.coversWholeDocument,
      modificationsAfterSignature: signature.modificationsAfterSignature,
    };
  }

  async viewCertificate(certificate) {
    return false;
  }
}

export { FakeMLManager, FakeSignatureVerifier };
