#!/usr/bin/env -S bun
/**
 * Command-line interface for extracting comments from YAML files.
 *
 * This CLI tool reads a YAML file and extracts all comments, mapping each comment
 * to the nearest following YAML node. The output is formatted as JavaScript comments.
 *
 * @example
 * ```bash
 * bun run cli.ts .github/workflows/hello-world.generated.yml
 * ```
 *
 * @module
 */

import { parseArgs, type ParseArgsConfig } from "util";
import { extractYamlComments } from "./index.ts";
import { readFileSync } from "fs";

const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  options: {
    help: {
      type: "boolean",
    },
  },
  strict: true,
  allowPositionals: true,
} satisfies ParseArgsConfig);

if (values.help) {
  console.log("Usage: extract-yaml-comments [file]");
  console.log("Options:");
  console.log("  --help    Show help");
  console.log();
  process.exit(0);
}

const filePath = positionals[0];

if (!filePath) {
  console.error("Error: filename argument is required");
  console.error("Usage: extract-yaml-comments [file]");
  process.exit(1);
}

const src = readFileSync(filePath, "utf8");
const { comments } = extractYamlComments(src);

const output = comments
  .map(
    (h) =>
      `// original comment from line ${h.line} (before ${
        h.path
      }): ${JSON.stringify(h.text)}`,
  )
  .join("\n\n");

console.log(output);
