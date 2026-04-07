import Link from "next/link";
import {
  ArrowRight,
  GitBranch,
  GitPullRequest,
  NotepadText,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const steps = [
  {
    icon: NotepadText,
    title: "Start from Notion",
    description:
      "Trigger Kite.dev from a task page and generate a deterministic branch name that matches your delivery workflow.",
  },
  {
    icon: GitBranch,
    title: "Detect the push",
    description:
      "Kite.dev listens for GitHub App webhooks, matches the pushed branch, and records the sync event idempotently.",
  },
  {
    icon: GitPullRequest,
    title: "Link the pull request",
    description:
      "When the pull request opens, Kite.dev updates the task again so the branch and review state stay visible in Notion.",
  },
];

export default function MarketingPage(): React.JSX.Element {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-12 px-6 py-12 lg:py-20">
      <section className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] lg:items-center">
        <div className="space-y-6">
          <Badge variant="secondary">Open-source workflow bridge</Badge>
          <div className="space-y-4">
            <h1 className="max-w-4xl text-5xl font-semibold tracking-tight text-balance lg:text-6xl">
              Keep Notion tasks and GitHub branches in step.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
              Kite.dev focuses on one production-ready loop: suggest the branch
              from Notion, detect the push from GitHub, then update the task
              automatically.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/dashboard">
                Open dashboard
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/integrations">Configure integrations</Link>
            </Button>
          </div>
        </div>

        <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-card via-card to-secondary/40">
          <CardHeader>
            <CardTitle>Core magic loop</CardTitle>
            <CardDescription>
              Minimal surface area, strong operational boundaries.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              "Notion button sends a webhook to Kite.dev",
              "Kite.dev stores a branch intent and writes back the suggested branch",
              "GitHub push webhooks update task state when the branch appears remotely",
              "Pull request webhooks link review progress back to Notion",
            ].map((line, index) => (
              <div
                key={line}
                className="flex items-start gap-4 rounded-2xl border border-border/70 bg-background/70 p-4"
              >
                <div className="mt-0.5 flex size-7 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  {index + 1}
                </div>
                <p className="text-sm leading-6 text-muted-foreground">
                  {line}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        {steps.map((step) => (
          <Card key={step.title}>
            <CardHeader>
              <step.icon className="size-5 text-primary" />
              <CardTitle className="pt-2 text-xl">{step.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-7 text-muted-foreground">
                {step.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
