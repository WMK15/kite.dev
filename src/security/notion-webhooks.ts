export type NotionVerificationResult = {
  strategy: "shared-secret" | "workspace-page-check";
  strongVerification: boolean;
};

export function verifyNotionStartBranchRequest(input: {
  providedSecret: string | null;
  configuredSecret: string | null;
}): NotionVerificationResult {
  if (input.configuredSecret) {
    if (input.providedSecret !== input.configuredSecret) {
      throw new Error("Invalid Notion webhook secret");
    }

    return {
      strategy: "shared-secret",
      strongVerification: true,
    };
  }

  // Further hardening should provision per-mapping secrets by default. Until then,
  // the service performs a workspace and page ownership check before changing data.
  return {
    strategy: "workspace-page-check",
    strongVerification: false,
  };
}
