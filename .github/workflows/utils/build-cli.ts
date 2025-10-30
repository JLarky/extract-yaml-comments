#!/usr/bin/env -S bun

/**
 * This is the main script that you need to run when you want to generate the workflows.
 *
 * You can start it in watch mode by running:
 *
 * ```bash
 * bun --watch .github/workflows/utils/build-cli.ts
 * ```
 */

import { glob } from "node:fs/promises";

const promises: Promise<void>[] = [];

for await (const entry of glob("../*.main.ts", {
  cwd: import.meta.dirname,
})) {
  console.log(`Building ${entry}`);
  promises.push(import(entry));
}

await Promise.all(promises);
