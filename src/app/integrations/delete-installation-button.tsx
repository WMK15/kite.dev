"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

import { deleteGitHubInstallationAction } from "./actions";

interface DeleteInstallationButtonProps {
  installationId: string;
  accountLogin: string;
}

export function DeleteInstallationButton({
  installationId,
  accountLogin,
}: DeleteInstallationButtonProps): React.JSX.Element {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    if (
      !confirm(
        `Are you sure you want to remove the GitHub installation for "${accountLogin}"? This will also delete all linked repositories and mappings.`,
      )
    ) {
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await deleteGitHubInstallationAction(installationId);
      if (!result.success) {
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-sm text-destructive">{error}</span>}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleDelete}
        disabled={isPending}
        className="text-destructive hover:text-destructive"
      >
        {isPending ? "Removing..." : "Remove"}
      </Button>
    </div>
  );
}
