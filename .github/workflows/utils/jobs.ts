import { job } from "@jlarky/gha-ts/workflow-types";
import { checkoutStep, installMise } from "./steps";

export function publishJsr(opts: { dryRun?: boolean } = { dryRun: true }) {
  return job({
    name: opts.dryRun ? "Dry run publish package" : "Publish package",
    "runs-on": "ubuntu-latest",
    steps: [
      checkoutStep(),
      installMise(),
      {
        name: opts.dryRun ? "Dry run publish package" : "Publish package",
        run: opts.dryRun
          ? "mise run jsr publish --dry-run"
          : "mise run jsr publish",
      },
    ],
  });
}
