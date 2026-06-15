import { start } from "workflow/api";
import { offOnboardingWorkflow, type OffOnboardingInput } from "@/workflows/off-onboarding";

export async function startOffOnboardingSafely(input: OffOnboardingInput) {
  try {
    const run = await start(offOnboardingWorkflow, [input]);
    console.log("[offOnboardingWorkflow] scheduled", {
      runId: run.runId,
      email: input.email,
    });
    return run.runId;
  } catch (error) {
    console.error("[offOnboardingWorkflow] could not be scheduled", {
      email: input.email,
      error,
    });
    return null;
  }
}
