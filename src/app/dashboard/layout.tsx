"use client";

import { usePathname } from "next/navigation";

import { DashboardShell } from "@/components/layout/dashboard-shell";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const pathname = usePathname();

  return <DashboardShell pathname={pathname}>{children}</DashboardShell>;
}
