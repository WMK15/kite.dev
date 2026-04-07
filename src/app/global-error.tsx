"use client";

import { Button } from "@/components/ui/button";

export default function GlobalError(): React.JSX.Element {
  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
        <div className="max-w-xl space-y-4 rounded-3xl border border-border bg-card p-8 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">
            Global application error
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Kite.dev could not render this page.
          </h1>
          <p className="text-muted-foreground">
            Internal details are intentionally hidden. Refresh the page or
            return to the dashboard.
          </p>
          <Button asChild>
            <a href="/dashboard">Go to dashboard</a>
          </Button>
        </div>
      </body>
    </html>
  );
}
