/* Copyright 2018 Mozilla Foundation
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

const TESTING = typeof PDFJSDev !== "undefined" && PDFJSDev.test("TESTING");

const OptionKind = {
  BROWSER: 0x01,
  VIEWER: 0x02,
  API: 0x04,
  WORKER: 0x08,
  EVENT_DISPATCH: 0x10,
  PREFERENCE: 0x80,
};

// Should only be used with options that allow multiple types.
const Type = {
  BOOLEAN: 0x01,
  NUMBER: 0x02,
  OBJECT: 0x04,
  STRING: 0x08,
  UNDEFINED: 0x10,
};

/**
 * NOTE: These options are used to generate the `default_preferences.json` file,
 *       see `OptionKind.PREFERENCE`, hence the values below must use only
 *       primitive types and cannot rely on any imported types.
 */
const defaultOptions = new Map([
  // Begin OptionKind.BROWSER
  [
    "canvasMaxAreaInBytes",
    {
      /** @type {number} */
      value: -1,
      kind: OptionKind.BROWSER + OptionKind.API,
    },
  ],
  [
    "localeProperties",
    {
      /** @type {object} */
      value: null,
      kind: OptionKind.BROWSER,
    },
  ],
  [
    "maxCanvasDim",
    {
      /** @type {number} */
      value: 32767,
      kind: OptionKind.BROWSER + OptionKind.VIEWER,
    },
  ],
  [
    "supportsCaretBrowsingMode",
    {
      /** @type {boolean} */
      value: false,
      kind: OptionKind.BROWSER,
    },
  ],
  [
    "supportsDocumentFonts",
    {
      /** @type {boolean} */
      value: true,
      kind: OptionKind.BROWSER,
    },
  ],
  [
    "supportsDownloading",
    {
      /** @type {boolean} */
      value: true,
      kind: OptionKind.BROWSER,
    },
  ],
  [
    "supportsIntegratedFind",
    {
      /** @type {boolean} */
      value: false,
      kind: OptionKind.BROWSER,
    },
  ],
  [
    "supportsMouseWheelZoomCtrlKey",
    {
      /** @type {boolean} */
      value: true,
      kind: OptionKind.BROWSER,
    },
  ],
  [
    "supportsMouseWheelZoomMetaKey",
    {
      /** @type {boolean} */
      value: true,
      kind: OptionKind.BROWSER,
    },
  ],
  [
    "supportsPinchToZoom",
    {
      /** @type {boolean} */
      value: true,
      kind: OptionKind.BROWSER,
    },
  ],
  [
    "supportsPrinting",
    {
      /** @type {boolean} */
      value: true,
      kind: OptionKind.BROWSER,
    },
  ],
  [
    "toolbarDensity",
    {
      /** @type {number} */
      value: 0, // 0 = "normal", 1 = "compact", 2 = "touch"
      kind: OptionKind.BROWSER + OptionKind.EVENT_DISPATCH,
    },
  ],
  // End OptionKind.BROWSER

  // Begin OptionKind.VIEWER
  [
    "annotationEditorMode",
    {
      /** @type {number} */
      value: 0,
      kind: OptionKind.VIEWER + OptionKind.PREFERENCE,
    },
  ],
  [
    "annotationMode",
    {
      /** @type {number} */
      value: 2,
      kind: OptionKind.VIEWER + OptionKind.PREFERENCE,
    },
  ],
  [
    "capCanvasAreaFactor",
    {
      /** @type {number} */
      value: 200,
      kind: OptionKind.VIEWER + OptionKind.PREFERENCE,
    },
  ],
  [
    "commentLearnMoreUrl",
    {
      /** @type {string} */
      value: "",
      kind: OptionKind.VIEWER + OptionKind.PREFERENCE,
    },
  ],
  [
    "cursorToolOnLoad",
    {
      /** @type {number} */
      value: 0,
      kind: OptionKind.VIEWER + OptionKind.PREFERENCE,
    },
  ],
  [
    "debuggerSrc",
    {
      /** @type {string} */
      value: "./debugger.mjs",
      kind: OptionKind.VIEWER,
    },
  ],
  [
    "defaultUrl",
    {
      /** @type {string} */
      value: "",
      kind: OptionKind.VIEWER,
    },
  ],
  [
    "defaultZoomDelay",
    {
      /** @type {number} */
      value: 400,
      kind: OptionKind.VIEWER + OptionKind.PREFERENCE,
    },
  ],
  [
    "defaultZoomValue",
    {
      /** @type {string} */
      value: "",
      kind: OptionKind.VIEWER + OptionKind.PREFERENCE,
    },
  ],
  [
    "disableHistory",
    {
      /** @type {boolean} */
      value: false,
      kind: OptionKind.VIEWER,
    },
  ],
  [
    "disablePageLabels",
    {
      /** @type {boolean} */
      value: false,
      kind: OptionKind.VIEWER + OptionKind.PREFERENCE,
    },
  ],
  [
    "disableTelemetry",
    {
      /** @type {boolean} */
      value: false,
      kind: OptionKind.VIEWER + OptionKind.PREFERENCE,
    },
  ],
  [
    "enableAltText",
    {
      /** @type {boolean} */
      value: false,
      kind: OptionKind.VIEWER + OptionKind.PREFERENCE,
    },
  ],
  [
    "enableAltTextModelDownload",
    {
      /** @type {boolean} */
      value: true,
      kind:
        OptionKind.VIEWER + OptionKind.PREFERENCE + OptionKind.EVENT_DISPATCH,
    },
  ],
  [
    "enableAutoLinking",
    {
      /** @type {boolean} */
      value: true,
      kind: OptionKind.VIEWER + OptionKind.PREFERENCE,
    },
  ],
  [
    "enableComment",
    {
      /** @type {boolean} */
      value: false,
      kind: OptionKind.VIEWER + OptionKind.PREFERENCE,
    },
  ],
  [
    "enableDetailCanvas",
    {
      /** @type {boolean} */
      value: true,
      kind: OptionKind.VIEWER,
    },
  ],
  ...(TESTING
    ? [
        [
          "enableFakeMLManager",
          {
            /** @type {boolean} */
            value: true,
            kind: OptionKind.VIEWER,
          },
        ],
      ]
    : []),
  [
    "enableGuessAltText",
    {
      /** @type {boolean} */
      value: true,
      kind:
        OptionKind.VIEWER + OptionKind.PREFERENCE + OptionKind.EVENT_DISPATCH,
    },
  ],
  [
    "enableHighlightFloatingButton",
    {
      // We'll probably want to make some experiments before enabling this
      // in Firefox release, but it has to be temporary.
      // TODO: remove it when unnecessary.
      /** @type {boolean} */
      value: TESTING,
      kind: OptionKind.VIEWER + OptionKind.PREFERENCE,
    },
  ],
  [
    "enableNewAltTextWhenAddingImage",
    {
      /** @type {boolean} */
      value: true,
      kind: OptionKind.VIEWER + OptionKind.PREFERENCE,
    },
  ],
  [
    "enableNewBadge",
    {
      /** @type {boolean} */
      value: false,
      kind: OptionKind.VIEWER + OptionKind.PREFERENCE,
    },
  ],
  [
    "enableOptimizedPartialRendering",
    {
      /** @type {boolean} */
      value: false,
      kind: OptionKind.VIEWER + OptionKind.PREFERENCE,
    },
  ],
  [
    "enablePermissions",
    {
      /** @type {boolean} */
      value: false,
      kind: OptionKind.VIEWER + OptionKind.PREFERENCE,
    },
  ],
  [
    "enablePrintAutoRotate",
    {
      /** @type {boolean} */
      value: true,
      kind: OptionKind.VIEWER + OptionKind.PREFERENCE,
    },
  ],
  [
    "enableScripting",
    {
      /** @type {boolean} */
      value: TESTING,
      kind: OptionKind.VIEWER + OptionKind.PREFERENCE,
    },
  ],
  [
    "enableSelectionRendering",
    {
      /** @type {boolean} */
      value: true,
      kind: OptionKind.VIEWER + OptionKind.PREFERENCE,
    },
  ],
  [
    "enableSignatureEditor",
    {
      /** @type {boolean} */
      value: TESTING,
      kind: OptionKind.VIEWER + OptionKind.PREFERENCE,
    },
  ],
  [
    "enableSignatureVerification",
    {
      // Enable the verification UI in test builds.
      /** @type {boolean} */
      value: TESTING,
      kind: OptionKind.VIEWER + OptionKind.PREFERENCE,
    },
  ],
  [
    "enableSplitMerge",
    {
      /** @type {boolean} */
      value: true,
      kind: OptionKind.VIEWER + OptionKind.PREFERENCE,
    },
  ],
  [
    "enableUpdatedAddImage",
    {
      // We'll probably want to make some experiments before enabling this
      // in Firefox release, but it has to be temporary.
      // TODO: remove it when unnecessary.
      /** @type {boolean} */
      value: false,
      kind: OptionKind.VIEWER + OptionKind.PREFERENCE,
    },
  ],
  [
    "externalLinkRel",
    {
      /** @type {string} */
      value: "noopener noreferrer nofollow",
      kind: OptionKind.VIEWER,
    },
  ],
  [
    "externalLinkTarget",
    {
      /** @type {number} */
      value: 0,
      kind: OptionKind.VIEWER + OptionKind.PREFERENCE,
    },
  ],
  [
    "highlightEditorColors",
    {
      /** @type {string} */
      value:
        "yellow=#FFFF98,green=#53FFBC,blue=#80EBFF,pink=#FFCBE6,red=#FF4F5F," +
        "yellow_HCM=#FFFFCC,green_HCM=#53FFBC,blue_HCM=#80EBFF,pink_HCM=#F6B8FF,red_HCM=#C50043",
      kind: OptionKind.VIEWER + OptionKind.PREFERENCE,
    },
  ],
  [
    "historyUpdateUrl",
    {
      /** @type {boolean} */
      value: false,
      kind: OptionKind.VIEWER + OptionKind.PREFERENCE,
    },
  ],
  [
    "ignoreDestinationZoom",
    {
      /** @type {boolean} */
      value: false,
      kind: OptionKind.VIEWER + OptionKind.PREFERENCE,
    },
  ],
  [
    "imageResourcesPath",
    {
      /** @type {string} */
      value: "./images/",
      kind: OptionKind.VIEWER,
    },
  ],
  [
    "imagesRightClickMinSize",
    {
      /** @type {number} */
      // Keep image context menus off in distribution builds to avoid
      // interfering with text selection in Chrome and Safari.
      value: -1,
      kind: OptionKind.VIEWER + OptionKind.PREFERENCE,
    },
  ],
  [
    "maxCanvasPixels",
    {
      /** @type {number} */
      value: 2 ** 25,
      kind: OptionKind.VIEWER,
    },
  ],
  [
    "minDurationToUpdateCanvas",
    {
      /** @type {number} */
      value: 500, // ms
      kind: OptionKind.VIEWER,
    },
  ],
  [
    "forcePageColors",
    {
      /** @type {boolean} */
      value: false,
      kind: OptionKind.VIEWER + OptionKind.PREFERENCE,
    },
  ],
  [
    "pageColorsBackground",
    {
      /** @type {string} */
      value: "Canvas",
      kind: OptionKind.VIEWER + OptionKind.PREFERENCE,
    },
  ],
  [
    "pageColorsForeground",
    {
      /** @type {string} */
      value: "CanvasText",
      kind: OptionKind.VIEWER + OptionKind.PREFERENCE,
    },
  ],
  [
    "pdfBugEnabled",
    {
      /** @type {boolean} */
      value: TESTING,
      kind: OptionKind.VIEWER + OptionKind.PREFERENCE,
    },
  ],
  [
    "postMessageAfterPrintCallback",
    {
      /** @type {boolean} */
      value: false,
      kind: OptionKind.VIEWER + OptionKind.PREFERENCE,
    },
  ],
  [
    "printResolution",
    {
      /** @type {number} */
      value: 150,
      kind: OptionKind.VIEWER,
    },
  ],
  [
    "sandboxBundleSrc",
    {
      /** @type {string} */
      value: "../build/pdf.sandbox.mjs",
      kind: OptionKind.VIEWER,
    },
  ],
  [
    "sidebarViewOnLoad",
    {
      /** @type {number} */
      value: -1,
      kind: OptionKind.VIEWER + OptionKind.PREFERENCE,
    },
  ],
  [
    "scrollModeOnLoad",
    {
      /** @type {number} */
      value: -1,
      kind: OptionKind.VIEWER + OptionKind.PREFERENCE,
    },
  ],
  [
    "spreadModeOnLoad",
    {
      /** @type {number} */
      value: -1,
      kind: OptionKind.VIEWER + OptionKind.PREFERENCE,
    },
  ],
  [
    "textLayerMode",
    {
      /** @type {number} */
      value: 1,
      kind: OptionKind.VIEWER + OptionKind.PREFERENCE,
    },
  ],
  [
    "viewerCssTheme",
    {
      /** @type {number} */
      value: 2,
      kind: OptionKind.VIEWER + OptionKind.PREFERENCE,
    },
  ],
  [
    "viewOnLoad",
    {
      /** @type {boolean} */
      value: 0,
      kind: OptionKind.VIEWER + OptionKind.PREFERENCE,
    },
  ],
  // End OptionKind.VIEWER

  // Begin OptionKind.API
  [
    "cMapPacked",
    {
      /** @type {boolean} */
      value: true,
      kind: OptionKind.API,
    },
  ],
  [
    "cMapUrl",
    {
      /** @type {string} */
      value: "../web/cmaps/",
      kind: OptionKind.API,
    },
  ],
  [
    "disableAutoFetch",
    {
      /** @type {boolean} */
      value: false,
      kind: OptionKind.API + OptionKind.PREFERENCE,
    },
  ],
  [
    "disableFontFace",
    {
      /** @type {boolean} */
      value: false,
      kind: OptionKind.API + OptionKind.PREFERENCE,
    },
  ],
  [
    "disableRange",
    {
      /** @type {boolean} */
      value: false,
      kind: OptionKind.API + OptionKind.PREFERENCE,
    },
  ],
  [
    "disableStream",
    {
      /** @type {boolean} */
      value: false,
      kind: OptionKind.API + OptionKind.PREFERENCE,
    },
  ],
  [
    "disableWorkerRendering",
    {
      /** @type {boolean} */
      value: !TESTING,
      kind: OptionKind.API + OptionKind.PREFERENCE,
    },
  ],
  [
    "docBaseUrl",
    {
      /** @type {string} */
      value: "",
      kind: OptionKind.API,
    },
  ],
  [
    "enableHWA",
    {
      /** @type {boolean} */
      value: true,
      kind: OptionKind.API + OptionKind.PREFERENCE,
    },
  ],
  [
    "enableWebGPU",
    {
      /** @type {boolean} */
      value: true,
      kind: OptionKind.API + OptionKind.PREFERENCE,
    },
  ],
  [
    "enableXfa",
    {
      /** @type {boolean} */
      value: true,
      kind: OptionKind.API + OptionKind.PREFERENCE,
    },
  ],
  [
    "fontExtraProperties",
    {
      /** @type {boolean} */
      value: false,
      kind: OptionKind.API,
    },
  ],
  [
    "iccUrl",
    {
      /** @type {string} */
      value: "../web/iccs/",
      kind: OptionKind.API,
    },
  ],
  [
    "pdfBug",
    {
      /** @type {boolean} */
      value: false,
      kind: OptionKind.API,
    },
  ],
  [
    "standardFontDataUrl",
    {
      /** @type {string} */
      value: "../web/standard_fonts/",
      kind: OptionKind.API,
    },
  ],
  [
    "useSystemFonts",
    {
      /** @type {boolean|undefined} */
      value: undefined,
      kind: OptionKind.API,
      type: Type.BOOLEAN + Type.UNDEFINED,
    },
  ],
  [
    "verbosity",
    {
      /** @type {number} */
      value: 1,
      kind: OptionKind.API,
    },
  ],
  [
    "wasmUrl",
    {
      /** @type {string} */
      value: "../web/wasm/",
      kind: OptionKind.API,
    },
  ],
  // End OptionKind.API

  // Begin OptionKind.WORKER
  [
    "rendererSrc",
    {
      /** @type {string} */
      value: "../build/pdf.renderer.mjs",
      kind: OptionKind.WORKER,
    },
  ],
  [
    "workerPort",
    {
      /** @type {object} */
      value: null,
      kind: OptionKind.WORKER,
    },
  ],
  [
    "workerSrc",
    {
      /** @type {string} */
      value: "../build/pdf.worker.mjs",
      kind: OptionKind.WORKER,
    },
  ],
  // End OptionKind.WORKER
]);

if (typeof PDFJSDev === "undefined" || PDFJSDev.test("TESTING")) {
  // Ensure that the `defaultOptions` are correctly specified.
  for (const [name, { value, kind, type }] of defaultOptions) {
    if (kind & OptionKind.PREFERENCE) {
      if (kind === OptionKind.PREFERENCE) {
        throw new Error(`Cannot use only "PREFERENCE" kind: ${name}`);
      }
      if (kind & OptionKind.BROWSER) {
        throw new Error(`Cannot mix "PREFERENCE" and "BROWSER" kind: ${name}`);
      }
      if (type !== undefined) {
        throw new Error(
          `Cannot have \`type\`-field for "PREFERENCE" kind: ${name}`
        );
      }
      // Only "simple" preference-values are allowed.
      if (
        typeof value !== "boolean" &&
        typeof value !== "string" &&
        !Number.isInteger(value)
      ) {
        throw new Error(`Invalid value for "PREFERENCE" kind: ${name}`);
      }
    } else if (kind & OptionKind.BROWSER) {
      if (type !== undefined) {
        throw new Error(
          `Cannot have \`type\`-field for "BROWSER" kind: ${name}`
        );
      }
      if (value === undefined) {
        throw new Error(`Invalid value for "BROWSER" kind: ${name}`);
      }
    }
  }
}

class AppOptions {
  static eventBus;

  static #opts = new Map();

  static {
    // Initialize all the user-options.
    for (const [name, defaultOpt] of defaultOptions) {
      this.#opts.set(name, defaultOpt.value);
    }
  }

  constructor() {
    if (typeof PDFJSDev === "undefined" || PDFJSDev.test("TESTING")) {
      throw new Error("Cannot initialize AppOptions.");
    }
  }

  static get(name) {
    return this.#opts.get(name);
  }

  static getAll(kind = null, defaultOnly = false) {
    const options = Object.create(null);
    for (const [name, defaultOpt] of defaultOptions) {
      if (kind && !(kind & defaultOpt.kind)) {
        continue;
      }
      options[name] = !defaultOnly ? this.#opts.get(name) : defaultOpt.value;
    }
    return options;
  }

  static set(name, value) {
    this.setAll({ [name]: value });
  }

  static setAll(options, prefs = false) {
    let events;

    for (const name in options) {
      const defaultOpt = defaultOptions.get(name),
        userOpt = options[name];

      if (
        !defaultOpt ||
        !(
          typeof userOpt === typeof defaultOpt.value ||
          Type[(typeof userOpt).toUpperCase()] & defaultOpt.type
        )
      ) {
        continue;
      }
      const { kind } = defaultOpt;

      if (
        prefs &&
        !(kind & OptionKind.BROWSER || kind & OptionKind.PREFERENCE)
      ) {
        continue;
      }
      if (this.eventBus && kind & OptionKind.EVENT_DISPATCH) {
        (events ??= new Map()).set(name, userOpt);
      }
      this.#opts.set(name, userOpt);
    }

    events?.forEach((value, name) => {
      this.eventBus.dispatch(name.toLowerCase(), { source: this, value });
    });
  }
}

export { AppOptions, OptionKind };
