#!/usr/bin/env -S node --no-warnings
import { workflow } from "@jlarky/gha-ts/workflow-types";
import { generateWorkflowYaml } from "./utils/yaml.ts";

import { publishJsr } from "./utils/jobs.ts";

const wf = workflow({
  name: "Publish",
  on: {
    push: {
      branches: ["main"],
    },
  },
  permissions: {
    contents: "read",
    "id-token": "write",
  },
  jobs: {
    publish: publishJsr({ dryRun: false }),
  },
});

await generateWorkflowYaml(wf, import.meta.url);
