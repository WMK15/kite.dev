"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

import { deleteNotionWorkspaceAction } from "./actions";

interface DeleteWorkspaceButtonProps {
  workspaceId: string;
  workspaceName: string;
}

export function DeleteWorkspaceButton({
  workspaceId,
  workspaceName,
}: DeleteWorkspaceButtonProps): React.JSX.Element {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    if (
      !confirm(
        `Are you sure you want to remove the Notion workspace "${workspaceName}"? This will also delete all linked mappings.`,
      )
    ) {
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await deleteNotionWorkspaceAction(workspaceId);
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
