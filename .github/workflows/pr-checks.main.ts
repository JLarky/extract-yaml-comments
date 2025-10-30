#!/usr/bin/env -S node --no-warnings
import { workflow } from "@jlarky/gha-ts/workflow-types";
import { generateWorkflowYaml } from "./utils/yaml.ts";
import { lines } from "@jlarky/gha-ts/utils";

import { checkoutStep, installMise } from "./utils/steps.ts";

const wf = workflow({
  name: "PR Checks",
  on: {
    push: { branches: ["main"] },
    pull_request: {},
  },
  jobs: {
    checkFormat: {
      "runs-on": "ubuntu-latest",
      steps: [
        checkoutStep(),
        installMise(),
        {
          name: "Check format",
          run: lines`mise run format-check`,
        },
      ],
    },
    runTests: {
      "runs-on": "ubuntu-latest",
      steps: [
        checkoutStep(),
        installMise(),
        {
          name: "bun install",
          run: "mise run install",
        },
        {
          name: "Run tests",
          run: lines`mise run test`,
        },
      ],
    },
  },
});

await generateWorkflowYaml(wf, import.meta.url);
