import { sleep } from "workflow";

export type OffOnboardingInput = {
  email: string;
  name?: string;
  userId?: string;
  subscriberId?: string;
};

function onboardingContext(input: OffOnboardingInput) {
  return {
    email: input.email,
    name: input.name ?? null,
    userId: input.userId ?? null,
    subscriberId: input.subscriberId ?? null,
  };
}

async function recordOnboardingStart(input: OffOnboardingInput) {
  "use step";

  console.log("[offOnboardingWorkflow] onboarding started", onboardingContext(input));
}

export async function sendWelcomeEmail(input: OffOnboardingInput) {
  "use step";

  console.log("[offOnboardingWorkflow] welcome email placeholder", onboardingContext(input));
}

export async function sendRecommendedArticleEmail(input: OffOnboardingInput) {
  "use step";

  console.log("[offOnboardingWorkflow] recommended article email placeholder", onboardingContext(input));
}

export async function sendCommentInviteEmail(input: OffOnboardingInput) {
  "use step";

  console.log("[offOnboardingWorkflow] comment invite email placeholder", onboardingContext(input));
}

export async function sendReturnReminderEmail(input: OffOnboardingInput) {
  "use step";

  console.log("[offOnboardingWorkflow] return reminder email placeholder", onboardingContext(input));
}

export async function offOnboardingWorkflow(input: OffOnboardingInput) {
  "use workflow";

  await recordOnboardingStart(input);
  await sendWelcomeEmail(input);

  await sleep("3d");
  await sendRecommendedArticleEmail(input);

  await sleep("4d");
  await sendCommentInviteEmail(input);

  await sleep("8d");
  await sendReturnReminderEmail(input);

  return { completed: true, email: input.email };
}
