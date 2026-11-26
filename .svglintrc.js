export default {
  rules: {
    valid: true,

    custom: [
      (reporter, $, ast, { filename }) => {
        reporter.name = "no-svg-fill-context-fill";

        const svg = $.find("svg");
        const fill = svg.attr("fill");
        if (fill === "context-fill") {
          reporter.error(
            "Fill attribute on svg element must not be set to 'context-fill'",
            svg[0],
            ast
          );
        }
      },
    ],
  },
  ignore: [
    "build/**",
    "l10n/**",
    "node_modules/**",
    "external/builder/fixtures/**",
    "external/builder/fixtures_babel/**",
    "test/tmp/**",
    "test/pdfs/**",
    "web/locale/**",
    "*~/**",
  ],
};
