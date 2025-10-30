#!/usr/bin/env -S node --no-warnings
import { workflow } from "@jlarky/gha-ts/workflow-types";
import { generateWorkflowYaml } from "./utils/yaml.ts";
import { checkoutStep } from "./utils/steps.ts";
import { installMise } from "./utils/steps.ts";

const wf = workflow({
  name: "Create Release",
  on: {
    push: {
      branches: ["main"],
      paths: ["jsr.json"],
    },
  },
  permissions: {
    contents: "write",
  },
  jobs: {
    "create-release": {
      "runs-on": "ubuntu-latest",
      steps: [
        checkoutStep(),
        installMise(),
        {
          name: "Get version from jsr.json",
          id: "get_version",
          run: `echo "version=$(jq -r '.version' ./jsr.json)" >> "$GITHUB_OUTPUT"`,
        },
        {
          name: "Create Release",
          uses: "softprops/action-gh-release@v2",
          with: {
            tag_name: `v\${{ steps.get_version.outputs.version }}`,
            draft: true,
            make_latest: true,
          },
        },
      ],
    },
  },
});

await generateWorkflowYaml(wf, import.meta.url);
