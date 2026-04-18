"use client";

import { useActionState } from "react";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

import { syncRepositoriesAction, type SyncState } from "./actions";

interface SyncRepositoriesButtonProps {
  installationId: string;
}

export function SyncRepositoriesButton({
  installationId,
}: SyncRepositoriesButtonProps): React.JSX.Element {
  const [state, formAction, isPending] = useActionState<SyncState, FormData>(
    syncRepositoriesAction,
    { status: "idle" },
  );

  return (
    <form action={formAction} className="inline-flex items-center gap-2">
      <input type="hidden" name="installationId" value={installationId} />
      <Button type="submit" variant="outline" size="sm" disabled={isPending}>
        <RefreshCw
          className={`mr-2 size-4 ${isPending ? "animate-spin" : ""}`}
        />
        {isPending ? "Syncing..." : "Sync repositories"}
      </Button>
      {state.status === "success" && (
        <span className="text-sm text-green-600">
          Synced {state.syncedCount} repositories
        </span>
      )}
      {state.status === "error" && (
        <span className="text-sm text-destructive">{state.message}</span>
      )}
    </form>
  );
}
