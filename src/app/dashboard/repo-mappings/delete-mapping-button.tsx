"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

import { deleteMappingAction } from "./actions";

interface DeleteMappingButtonProps {
  mappingId: string;
}

export function DeleteMappingButton({
  mappingId,
}: DeleteMappingButtonProps): React.JSX.Element {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    if (!confirm("Are you sure you want to delete this mapping?")) {
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await deleteMappingAction(mappingId);
      if (!result.success) {
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-sm text-destructive">{error}</span>}
      <Button
        variant="destructive"
        size="sm"
        onClick={handleDelete}
        disabled={isPending}
      >
        {isPending ? "Deleting..." : "Delete"}
      </Button>
    </div>
  );
}
