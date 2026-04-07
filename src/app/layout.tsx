import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";

import { SiteHeader } from "@/components/layout/site-header";
import { AppProviders } from "@/components/providers/app-providers";
import { serverEnv } from "@/env/server";

import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(serverEnv.NEXT_PUBLIC_APP_URL),
  title: {
    default: "Kite.dev",
    template: "%s | Kite.dev",
  },
  description:
    "Kite.dev keeps Notion tasks and GitHub branches in sync from branch suggestion to pull request linking.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.JSX.Element {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${mono.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-background font-sans text-foreground antialiased">
        <AppProviders>
          <div className="relative flex min-h-screen flex-col">
            <SiteHeader />
            <main className="flex-1">{children}</main>
          </div>
        </AppProviders>
      </body>
    </html>
  );
}
