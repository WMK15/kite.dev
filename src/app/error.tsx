"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): React.JSX.Element {
  useEffect(() => {
    console.error("Route error boundary", {
      message: error.message,
      digest: error.digest,
    });
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-start justify-center gap-6 px-6 py-16">
      <p className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
        Something went wrong
      </p>
      <h1 className="text-4xl font-semibold tracking-tight">
        Kite hit an unexpected problem.
      </h1>
      <p className="max-w-2xl text-base leading-7 text-muted-foreground">
        The error details have been hidden from the interface. Try the request
        again, or inspect the service logs if the problem persists.
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
