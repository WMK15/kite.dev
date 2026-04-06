import type { BranchIntent } from "@/schema";

export function matchBranchIntentByBranchName(
  intents: BranchIntent[],
  branchName: string,
): BranchIntent | null {
  return (
    intents.find(
      (intent) =>
        intent.branchName === branchName &&
        [
          "suggested",
          "waiting_for_push",
          "pushed",
          "pull_request_opened",
        ].includes(intent.status),
    ) ?? null
  );
}
