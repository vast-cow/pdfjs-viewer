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

import { execSync, spawn, spawnSync } from "child_process";
import autoprefixer from "autoprefixer";
import { babelPluginPDFJSPreprocessor } from "./external/builder/babel-plugin-pdfjs-preprocessor.mjs";
import { buildPrefsSchema } from "./external/chromium/prefs.mjs";
import { COLORS_ENABLED } from "./external/color_utils.mjs";
import { fileURLToPath } from "url";
import fs from "fs";
import gulp from "gulp";
import ordered from "ordered-read-streams";
import path from "path";
import postcss from "gulp-postcss";
import postcssDiscardComments from "postcss-discard-comments";
import { preprocess } from "./external/builder/builder.mjs";
import rename from "gulp-rename";
import { pipeline as runPipeline } from "stream/promises";
import stream from "stream";
import Vinyl from "vinyl";
import webpack from "webpack";

const __dirname = import.meta.dirname;
const BUILD_DIR = "build/";
const L10N_DIR = "l10n/";
const GENERIC_DIR = BUILD_DIR + "generic/";
const CHROMIUM_DIR = BUILD_DIR + "chromium/";
const CHROMIUM_TEST_DIR = BUILD_DIR + "chromium-test/";
const PREFERENCES_DIR = BUILD_DIR + "default_preferences/";

const config = JSON.parse(fs.readFileSync("pdfjs.config"));
const distManifest = fileURLToPath(
  import.meta.resolve("pdfjs-dist/package.json")
);
const PDFJS_DIST_DIR = path.dirname(distManifest);

const ENV_TARGETS = [
  "last 2 versions",
  "Chrome >= 125",
  "Firefox ESR",
  "Safari >= 18",
  "Node >= 22",
  "> 1%",
  "not IE > 0",
  "not dead",
];

const AUTOPREFIXER_CONFIG = {
  overrideBrowserslist: ENV_TARGETS,
};
const BABEL_TARGETS = ENV_TARGETS.join(", ");

const BABEL_COREJS_OPTS = Object.freeze({
  method: "usage-global",
  version: "3.51.0",
  exclude: ["web.structured-clone"],
  shippedProposals: true,
});

const DEFINES = Object.freeze({
  GENERIC: false,
  CHROME: false,
  LIB: false,
  TESTING: false,
});

function transform(charEncoding, transformFunction) {
  return new stream.Transform({
    objectMode: true,
    transform(vinylFile, enc, done) {
      const transformedFile = vinylFile.clone();
      transformedFile.contents = Buffer.from(
        transformFunction(transformedFile.contents),
        charEncoding
      );
      done(null, transformedFile);
    },
  });
}

function createStringSource(filename, content) {
  const source = stream.Readable({ objectMode: true });
  source._read = function () {
    this.push(
      new Vinyl({
        path: filename,
        contents: Buffer.from(content),
      })
    );
    this.push(null);
  };
  return source;
}

function createWebpackAlias({ CHROME }) {
  const aliases = {
    "fluent-bundle": "node_modules/@fluent/bundle/esm/index.js",
    "fluent-dom": "node_modules/@fluent/dom/esm/index.js",
    "web-alt_text_manager": "web/alt_text_manager.js",
    "web-annotation_editor_params": "web/annotation_editor_params.js",
    "web-download_manager": "",
    "web-external_services": "",
    "web-new_alt_text_manager": "web/new_alt_text_manager.js",
    "web-pdf_attachment_viewer": "web/pdf_attachment_viewer.js",
    "web-pdf_cursor_tools": "web/pdf_cursor_tools.js",
    "web-pdf_document_properties": "web/pdf_document_properties.js",
    "web-pdf_find_bar": "web/pdf_find_bar.js",
    "web-pdf_layer_viewer": "web/pdf_layer_viewer.js",
    "web-pdf_outline_viewer": "web/pdf_outline_viewer.js",
    "web-pdf_presentation_mode": "web/pdf_presentation_mode.js",
    "web-pdf_thumbnail_viewer": "web/pdf_thumbnail_viewer.js",
    "web-preferences": "",
    "web-print_service": "",
    "web-secondary_toolbar": "web/secondary_toolbar.js",
    "web-signature_manager": "web/signature_manager.js",
    "web-digital_signature_properties_manager":
      "web/digital_signature_properties_manager.js",
    "web-toolbar": "web/toolbar.js",
    "web-views_manager": "web/views_manager.js",
  };

  const externalServices = CHROME ? "web/chromecom.js" : "web/genericcom.js";
  Object.assign(aliases, {
    "web-download_manager": CHROME
      ? externalServices
      : "web/download_manager.js",
    "web-external_services": externalServices,
    "web-preferences": externalServices,
    "web-print_service": "web/pdf_print_service.js",
  });
  return Object.fromEntries(
    Object.entries(aliases).map(([name, file]) => [
      name,
      path.join(__dirname, file),
    ])
  );
}

function createWebpackConfig(defines, filename) {
  const plugins = [
    [
      babelPluginPDFJSPreprocessor,
      {
        rootPath: __dirname,
        defines: {
          ...defines,
          DEFAULT_FTL: defines.GENERIC ? getDefaultFtl() : "",
          BUNDLE_VERSION: config.stableVersion,
        },
      },
    ],
  ];
  if (defines.CHROME) {
    plugins.push(["babel-plugin-polyfill-corejs3", BABEL_COREJS_OPTS]);
  }

  const license = fs.readFileSync(
    "external/builder/license_header_libre.js",
    "utf8"
  );
  return {
    mode: "production",
    devtool: !defines.CHROME && !defines.TESTING ? "source-map" : false,
    optimization: { minimize: false, mangleExports: false },
    experiments: { outputModule: true },
    externalsType: "module",
    externals: { "pdfjs-dist": "../build/pdf.mjs" },
    output: {
      filename,
      globalObject: "globalThis",
      library: { type: "module" },
    },
    performance: { hints: false },
    plugins: [
      new webpack.BannerPlugin({
        banner:
          license +
          `
/** pdfjsVersion = ${config.stableVersion} */`,
        raw: true,
      }),
    ],
    resolve: { alias: createWebpackAlias(defines) },
    module: {
      parser: { javascript: { importMeta: false, url: false } },
      rules: [
        {
          test: /\.[mc]?js$/,
          loader: "babel-loader",
          exclude: /node_modules[\\/]core-js/,
          options: {
            presets: defines.CHROME ? ["@babel/preset-env"] : undefined,
            plugins,
            targets: BABEL_TARGETS,
          },
        },
      ],
    },
    node: false,
  };
}

class WebpackCompilationError extends Error {
  // Omit the stack trace in gulp's error output.
  showStack = false;
}

/** Bundle `entry` into an in-memory Vinyl stream. */
function createWebpackStream(entry, webpackConfig) {
  const outputPath = __dirname;
  const files = [];
  const readable = new stream.Readable({ objectMode: true, read() {} });

  const compiler = webpack({
    ...webpackConfig,
    entry: path.resolve(entry),
    output: {
      ...webpackConfig.output,
      path: outputPath,
      compareBeforeEmit: false,
    },
  });
  compiler.outputFileSystem = {
    mkdir(_dirPath, callback) {
      callback(null);
    },
    writeFile(filePath, contents, callback) {
      files.push(new Vinyl({ base: outputPath, path: filePath, contents }));
      callback(null);
    },
  };

  compiler.run((runError, stats) => {
    compiler.close(closeError => {
      if (runError || closeError) {
        readable.destroy(runError || closeError);
        return;
      }
      console.log(
        stats.toString({
          colors: COLORS_ENABLED,
          chunks: false,
          hash: false,
          modules: false,
          timings: false,
        })
      );
      if (stats.hasErrors()) {
        readable.destroy(
          new WebpackCompilationError(`Webpack failed to bundle "${entry}".`)
        );
        return;
      }
      for (const file of files) {
        readable.push(file);
      }
      readable.push(null);
    });
  });
  return readable;
}

/** Write a Vinyl stream to `dest` and wait for completion. */
function writeToDirectory(readable, dest) {
  return runPipeline(
    readable,
    gulp.dest(dest),
    // Drain `gulp.dest`'s readable side to prevent backpressure.
    new stream.Writable({
      objectMode: true,
      write(_file, _encoding, callback) {
        callback();
      },
    })
  );
}

function copyCoreDistribution(dir, { legacy = false } = {}) {
  const { version } = JSON.parse(fs.readFileSync(distManifest));
  if (version !== config.stableVersion) {
    throw new Error(
      `Expected pdfjs-dist ${config.stableVersion}, found ${version}.`
    );
  }
  const build = path.join(PDFJS_DIST_DIR, legacy ? "legacy/build" : "build");
  return ordered([
    gulp
      .src("pdf{,.worker,.renderer,.sandbox}.mjs{,.map}", {
        cwd: build,
        encoding: false,
      })
      .pipe(gulp.dest(dir + "build")),
    gulp
      .src("LICENSE", { cwd: PDFJS_DIST_DIR, encoding: false })
      .pipe(rename("LICENSE.pdfjs-dist"))
      .pipe(gulp.dest(dir)),
    gulp
      .src("{cmaps,iccs,standard_fonts,wasm}/**/*", {
        cwd: PDFJS_DIST_DIR,
        encoding: false,
      })
      .pipe(gulp.dest(dir + "web")),
  ]);
}

function checkFile(filePath) {
  try {
    const stat = fs.lstatSync(filePath);
    return stat.isFile();
  } catch {
    return false;
  }
}

function checkDir(dirPath) {
  try {
    const stat = fs.lstatSync(dirPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

function getArgValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function getDefaultFtl() {
  const content = fs.readFileSync("l10n/en-US/viewer.ftl").toString(),
    stringBuf = [];

  // Strip out comments and line-breaks.
  const regExp = /^\s*#/;
  for (const line of content.split("\n")) {
    if (!line || regExp.test(line)) {
      continue;
    }
    stringBuf.push(line);
  }
  return stringBuf.join("\n");
}

function copyViewerLocales(dest) {
  const viewerOutput = Object.create(null);
  const sources = [];
  for (const locale of fs.readdirSync(L10N_DIR).sort()) {
    const dirPath = L10N_DIR + locale;
    if (!checkDir(dirPath)) {
      continue;
    }
    if (!/^[a-z]{2,3}(?:-[A-Z]{2})?$/.test(locale)) {
      console.log("Skipping invalid locale: " + locale);
      continue;
    }
    const resource = `${locale}/viewer.ftl`;
    if (checkFile(L10N_DIR + resource)) {
      viewerOutput[locale.toLowerCase()] = resource;
      sources.push(L10N_DIR + resource);
    }
  }
  return ordered([
    gulp
      .src(sources, { base: L10N_DIR, encoding: false })
      .pipe(gulp.dest(dest)),
    createStringSource("locale.json", JSON.stringify(viewerOutput)).pipe(
      gulp.dest(dest)
    ),
  ]);
}

gulp.task("locale", function () {
  const dest = "web/locale/";
  fs.rmSync(dest, { recursive: true, force: true });
  return copyViewerLocales(dest);
});

function discardCommentsCSS() {
  let copyrightNum = 0;

  function remove(comment) {
    // Remove all comments, except the *first* license header.
    if (comment.startsWith("Copyright") && copyrightNum++ === 0) {
      return false;
    }
    return true;
  }
  return postcssDiscardComments({ remove });
}

function preprocessViewerFile(filename, defines) {
  const lines = [];
  preprocess(filename, line => lines.push(line), defines);
  return createStringSource(
    path.basename(filename),
    `${lines.join("\n").trimEnd()}\n`
  );
}

function buildViewer(dir, defines) {
  const imageFiles = ["web/images/*.{png,svg,gif}"];
  if (defines.CHROME) {
    imageFiles.push("!web/images/toolbarButton-openFile.svg");
  }
  return ordered([
    copyCoreDistribution(dir, { legacy: defines.CHROME }),
    createWebpackStream(
      "web/viewer.js",
      createWebpackConfig(defines, "viewer.mjs")
    ).pipe(gulp.dest(dir + "web")),
    gulp
      .src([...imageFiles, "web/debugger.{css,mjs}"], {
        base: "web",
        encoding: false,
      })
      .pipe(gulp.dest(dir + "web")),
    copyViewerLocales(dir + "web/locale/"),
    preprocessViewerFile("web/viewer.html", defines).pipe(
      gulp.dest(dir + "web")
    ),
    preprocessViewerFile("web/viewer.css", defines)
      .pipe(postcss([discardCommentsCSS(), autoprefixer(AUTOPREFIXER_CONFIG)]))
      .pipe(gulp.dest(dir + "web")),
  ]);
}

function buildGeneric(dir = GENERIC_DIR, { testing = false } = {}) {
  fs.rmSync(dir, { recursive: true, force: true });
  const defines = { ...DEFINES, GENERIC: true, TESTING: testing };
  return ordered([
    buildViewer(dir, defines),
    gulp.src("LICENSE", { encoding: false }).pipe(gulp.dest(dir)),
    gulp
      .src("web/compressed.tracemonkey-pldi-09.pdf", { encoding: false })
      .pipe(gulp.dest(dir + "web")),
  ]);
}

gulp.task("generic", function generic() {
  return buildGeneric();
});

function extensionVersion() {
  // Preserve Chrome's existing extension update sequence independently of
  // the core version. GitHub Actions checks out the full history.
  const result = spawnSync(
    "git",
    ["rev-list", "--count", `${config.baseVersion}..HEAD`],
    {
      encoding: "utf8",
    }
  );
  return (
    config.versionPrefix + (result.status === 0 ? result.stdout.trim() : "0")
  );
}

async function buildChromiumPreferences(dir) {
  const defines = { ...DEFINES, CHROME: true };
  const filename = "app_options.mjs";
  await writeToDirectory(
    createWebpackStream(
      "web/app_options.js",
      createWebpackConfig(defines, filename)
    ),
    PREFERENCES_DIR
  );

  const url = new URL(PREFERENCES_DIR + filename, import.meta.url);
  url.searchParams.set("id", String(defaultPreferencesId++));
  // eslint-disable-next-line no-unsanitized/method
  const { AppOptions, OptionKind } = await import(url.href);
  const preferences = AppOptions.getAll(
    OptionKind.PREFERENCE,
    /* defaultOnly = */ true
  );
  if (Object.keys(preferences).length === 0) {
    throw new Error("No Chromium default preferences found.");
  }
  const schema = buildPrefsSchema(preferences);
  await writeToDirectory(
    createStringSource(
      "preferences_schema.json",
      JSON.stringify(schema, null, 2)
    ),
    dir
  );
}

let defaultPreferencesId = 0;

function buildChromiumViewer(dir, { testing = false } = {}) {
  fs.rmSync(dir, { recursive: true, force: true });
  const defines = { ...DEFINES, CHROME: true, TESTING: testing };
  const version = extensionVersion();
  return ordered([
    buildViewer(dir + "content/", defines),
    gulp.src("LICENSE", { encoding: false }).pipe(gulp.dest(dir)),
    gulp
      .src("extensions/chromium/manifest.json", { encoding: false })
      .pipe(
        transform("utf8", content =>
          content.toString().replaceAll("PDFJSSCRIPT_VERSION", version)
        )
      )
      .pipe(gulp.dest(dir)),
    gulp
      .src("extensions/chromium/**/*.{html,js,css,png}", {
        base: "extensions/chromium",
        encoding: false,
      })
      .pipe(gulp.dest(dir)),
  ]);
}

function buildChromium() {
  return buildChromiumViewer(CHROMIUM_DIR);
}

function chromiumPreferences() {
  return buildChromiumPreferences(CHROMIUM_DIR);
}

gulp.task("chromium", gulp.series(buildChromium, chromiumPreferences));
gulp.task(
  "build",
  gulp.parallel(
    function generic() {
      return buildGeneric();
    },
    gulp.series(buildChromium, chromiumPreferences)
  )
);
gulp.task("prefstest", function prefstest() {
  return buildChromiumPreferences(BUILD_DIR + "prefstest/");
});

function runNode(script, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, ...args], {
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("close", code => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${script} exited with status ${code}.`));
      }
    });
  });
}

function unitTests() {
  return runNode("test/viewer-tests.mjs", ["unit"]);
}

function smokeTests() {
  return runNode("test/viewer-tests.mjs", ["smoke"]);
}

gulp.task("unittest", gulp.series("locale", unitTests));
gulp.task(
  "integrationtest",
  gulp.series(
    "locale",
    function chromiumTestBuild() {
      return buildChromiumViewer(CHROMIUM_TEST_DIR, { testing: true });
    },
    function chromiumTestPreferences() {
      return buildChromiumPreferences(CHROMIUM_TEST_DIR);
    },
    function integrationTests() {
      const filter = getArgValue("--filter");
      return runNode(
        "test/viewer-tests.mjs",
        filter ? ["integration", filter] : ["integration"]
      );
    }
  )
);
gulp.task("smoketest", gulp.series("locale", "build", smokeTests));
gulp.task(
  "test",
  gulp.series(
    "locale",
    "build",
    "prefstest",
    unitTests,
    smokeTests,
    function telemetryTests() {
      return runNode("test/chromium/test-telemetry.js");
    }
  )
);

gulp.task(
  "server",
  gulp.series("locale", async function startServer() {
    const { WebServer } = await import("./test/webserver.mjs");
    const host = getArgValue("--host");
    const port = Number(getArgValue("--port") || 8888);
    const server = new WebServer({
      host: host === "0" ? "0.0.0.0" : host,
      port,
    });
    server.start();
    gulp.watch("l10n/**/*.ftl", gulp.series("locale"));
  })
);

gulp.task("lint-licenses", function (done) {
  console.log("\n### Checking license headers");

  const jsRE =
    /^(?:#[^\n]*\n)?\/\* Copyright \d{4} Mozilla Foundation\n \*\n \* Licensed under the Apache License, Version 2\.0 \(the "License"\);/;
  const htmlRE = /^<!doctype html>\n<!--\nCopyright \d{4} Mozilla Foundation\n/;

  // Files with non-standard license headers (different copyright holder,
  // different license, or missing license).
  const NON_STANDARD_HEADER_FILES = new Set([
    "web/grab_to_pan.js",
    "web/toggle_button.css",
  ]);

  const errors = [];

  gulp
    .src(["{web,test}/**/*.{js,mjs,css}", "!test/pdfs/**/*"], { base: "." })
    .on("data", function (file) {
      if (!file.contents) {
        console.warn(
          `  ${file.relative} is a directory, skipping license header check.`
        );
        return;
      }

      const relativePath = file.relative.replaceAll("\\", "/");
      const content = file.contents.toString();
      const re = relativePath.endsWith(".html") ? htmlRE : jsRE;

      if (NON_STANDARD_HEADER_FILES.has(relativePath)) {
        if (re.test(content)) {
          console.warn(
            `  ${relativePath} has a standard license header, but is in the list of non-standard header files list.`
          );
        }
        return;
      }
      if (!re.test(content)) {
        errors.push(relativePath);
      }
    })
    .on("end", function () {
      if (errors.length > 0) {
        for (const file of errors.sort()) {
          console.log(`  Invalid license header: ${file}`);
        }
        done(new Error("License header check failed."));
        return;
      }
      console.log("files checked, no errors found");
      done();
    });
});

gulp.task("lint-chmod", function (done) {
  console.log("\n### Checking executable bit on tracked and untracked files");

  // Files allowed to keep the executable bit (shebang scripts).
  const EXECUTABLE_FILES = new Set(["test/chromium/test-telemetry.js"]);

  // Cover untracked-but-not-ignored files too: a `gulp lint` run before
  // `git add` would otherwise miss any 0755 file the developer just created.
  // `-z` is NUL-separated to tolerate whitespace in paths; `--exclude-standard`
  // honours .gitignore / .git/info/exclude / core.excludesFile.
  let lsFiles;
  try {
    lsFiles = execSync("git ls-files -coz --exclude-standard", {
      encoding: "utf8",
    });
  } catch (e) {
    done(e);
    return;
  }

  const offenders = [];
  for (const file of lsFiles.split("\0")) {
    if (!file || EXECUTABLE_FILES.has(file)) {
      continue;
    }
    let stat;
    try {
      stat = fs.lstatSync(file);
    } catch {
      // Tracked file removed from the working tree, broken symlink, etc.
      continue;
    }
    // Skip symlinks (stored as mode 120000) and directories (submodules show
    // up here as 160000 in the index, never as a regular file on disk).
    if (!stat.isFile()) {
      continue;
    }
    // Match git's own heuristic in `ce_permissions`: only the owner execute
    // bit matters when deciding between 100644 and 100755.
    if (stat.mode & 0o100) {
      offenders.push(file);
    }
  }

  if (offenders.length === 0) {
    console.log("files checked, no errors found");
    done();
    return;
  }

  if (!process.argv.includes("--fix")) {
    for (const file of offenders.sort()) {
      console.log(`  Unexpected executable bit: ${file}`);
    }
    done(
      new Error(
        "Executable-bit check failed (run `gulp lint-chmod --fix` to clear)."
      )
    );
    return;
  }

  // Working-tree-only fix, like every other --fix in `gulp lint`: clear the
  // bit on disk and let the user stage the change. On filesystems with
  // `core.filemode=false` (e.g. Windows) this is a no-op and the offending
  // mode must be cleared with `git update-index --chmod=-x` instead.
  for (const file of offenders.sort()) {
    try {
      const { mode } = fs.statSync(file);
      fs.chmodSync(file, mode & ~0o111);
    } catch (e) {
      done(e);
      return;
    }
    console.log(`  cleared executable bit: ${file}`);
  }
  console.log(`done: ${offenders.length} file(s) updated`);
  done();
});

gulp.task("lint-bom", async function () {
  console.log("\n### Checking for UTF-8 byte order marks");

  // Cover untracked-but-not-ignored files too, so a BOM in a freshly created
  // file is caught before `git add`.
  const files = execSync("git ls-files -coz --exclude-standard", {
    encoding: "utf8",
    maxBuffer: 1 << 28,
  })
    .split("\0")
    .filter(Boolean);

  // Only the first three bytes matter: a leading EF BB BF is a UTF-8 BOM.
  async function hasBOM(file) {
    let handle;
    try {
      handle = await fs.promises.open(file, "r");
    } catch {
      return false; // Directory, broken symlink, removed file, etc.
    }
    try {
      const { bytesRead, buffer } = await handle.read(Buffer.alloc(3), 0, 3, 0);
      return (
        bytesRead === 3 &&
        buffer[0] === 0xef &&
        buffer[1] === 0xbb &&
        buffer[2] === 0xbf
      );
    } finally {
      await handle.close();
    }
  }

  // Don't exhaust file descriptors.
  const offenders = [];
  for (let i = 0; i < files.length; i += 256) {
    const chunk = files.slice(i, i + 256);
    const flags = await Promise.all(chunk.map(hasBOM));
    chunk.forEach((file, j) => flags[j] && offenders.push(file));
  }
  offenders.sort();

  if (offenders.length === 0) {
    console.log("files checked, no errors found");
    return;
  }

  if (!process.argv.includes("--fix")) {
    for (const file of offenders) {
      console.log(`  Unexpected byte order mark: ${file}`);
    }
    throw new Error("BOM check failed (run `gulp lint-bom --fix` to clear).");
  }

  // Strip the BOM on disk and let the user stage the change.
  await Promise.all(
    offenders.map(async file => {
      const content = await fs.promises.readFile(file);
      await fs.promises.writeFile(file, content.subarray(3));
      console.log(`  removed byte order mark: ${file}`);
    })
  );
  console.log(`done: ${offenders.length} file(s) updated`);
});

gulp.task("lint", function (done) {
  console.log("\n### Linting JS/CSS/JSON/SVG/HTML files");

  const esLintOptions = [
    "node_modules/eslint/bin/eslint",
    ".",
    "--report-unused-disable-directives",
    "--concurrency=auto",
  ];
  if (process.argv.includes("--fix")) {
    esLintOptions.push("--fix");
  }

  const styleLintOptions = [
    "node_modules/stylelint/bin/stylelint.mjs",
    "**/*.css",
    "--report-needless-disables",
  ];
  if (process.argv.includes("--fix")) {
    styleLintOptions.push("--fix");
  }

  // JSON files are intentionally not passed to Prettier here: ESLint already
  // formats them via its prettier/prettier rule (with identical output), and
  // running both in parallel would race on writes in --fix mode.
  const prettierOptions = [
    "node_modules/prettier/bin/prettier.cjs",
    "**/*.html",
  ];
  if (process.argv.includes("--fix")) {
    prettierOptions.push("--log-level", "error", "--write");
  } else {
    prettierOptions.push("--log-level", "warn", "--check");
  }

  const svgLintOptions = [
    "node_modules/svglint/bin/cli.js",
    "**/*.svg",
    "--ci",
    "--no-summary",
  ];

  function runLinter(name, options) {
    return new Promise(resolve => {
      const proc = spawn(process.execPath, options, { stdio: "inherit" });
      proc.on("close", code => {
        resolve(code === 0 ? null : name);
      });
    });
  }

  Promise.all([
    runLinter("ESLint", esLintOptions),
    runLinter("Stylelint", styleLintOptions),
    runLinter("Prettier", prettierOptions),
    runLinter("svglint", svgLintOptions),
  ]).then(results => {
    const failures = results.filter(Boolean);
    if (failures.length) {
      done(new Error(`${failures.join(", ")} failed.`));
      return;
    }

    gulp.series("lint-licenses", "lint-chmod", "lint-bom")(done);
  });
});

gulp.task("clean", function (done) {
  console.log("\n### Cleaning up project builds");

  fs.rmSync(BUILD_DIR, { recursive: true, force: true });
  done();
});

gulp.task("importl10n", async function () {
  const { downloadL10n } = await import("./external/importL10n/locales.mjs");

  console.log("\n### Importing translations from mozilla-central");

  if (!fs.existsSync(L10N_DIR)) {
    fs.mkdirSync(L10N_DIR);
  }
  await downloadL10n(L10N_DIR);
});

gulp.task("check_l10n", function () {
  console.log("\n### Checking for unused l10n IDs");

  return runNode("external/check_l10n/check_l10n.mjs");
});
