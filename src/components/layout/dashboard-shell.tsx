import Link from "next/link";
import type { Route } from "next";

import { cn } from "@/lib/utils";

const links: Array<{ href: Route; label: string }> = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/repo-mappings", label: "Repo mappings" },
  { href: "/dashboard/logs", label: "Logs" },
  { href: "/integrations", label: "Integrations" },
];

export function DashboardShell({
  pathname,
  children,
}: {
  pathname: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="mx-auto grid w-full max-w-7xl gap-8 px-6 py-8 lg:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="space-y-2 rounded-3xl border border-border bg-card p-4 lg:sticky lg:top-24 lg:h-fit">
        <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Control plane
        </p>
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "block rounded-2xl px-3 py-2 text-sm font-medium transition-colors",
              pathname === link.href
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {link.label}
          </Link>
        ))}
      </aside>
      <div>{children}</div>
    </div>
  );
}
