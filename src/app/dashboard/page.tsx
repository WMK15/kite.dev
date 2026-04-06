export const dynamic = "force-dynamic";

import { MetricCard } from "@/components/dashboard/metric-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardSnapshot } from "@/lib/services/dashboard";

export default async function DashboardPage(): Promise<React.JSX.Element> {
  const snapshot = await getDashboardSnapshot();

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          Operational overview
        </h1>
        <p className="text-muted-foreground">
          Monitor branch intents, repository mappings, and recent sync
          behaviour.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Repositories"
          value={snapshot.repositoryCount}
          hint="GitHub repositories linked to installations."
        />
        <MetricCard
          title="Database mappings"
          value={snapshot.mappingCount}
          hint="Notion databases currently wired to repositories."
        />
        <MetricCard
          title="Active branch intents"
          value={snapshot.openIntentCount}
          hint="Tasks still waiting on a push or pull request state change."
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Recent sync events</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {snapshot.recentSyncEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No sync events recorded yet.
              </p>
            ) : (
              snapshot.recentSyncEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 p-4"
                >
                  <div>
                    <p className="font-medium">{event.eventType}</p>
                    <p className="text-sm text-muted-foreground">
                      {event.message}
                    </p>
                  </div>
                  <Badge
                    variant={
                      event.outcome === "success"
                        ? "secondary"
                        : event.outcome === "failed"
                          ? "destructive"
                          : "outline"
                    }
                  >
                    {event.outcome}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tracked branch intents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {snapshot.recentBranchIntents.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Start a branch from Notion to populate this feed.
              </p>
            ) : (
              snapshot.recentBranchIntents.map((intent) => (
                <div
                  key={intent.id}
                  className="rounded-2xl border border-border/70 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{intent.taskIdentifier}</p>
                      <p className="text-sm text-muted-foreground">
                        {intent.taskTitle}
                      </p>
                    </div>
                    <Badge variant="outline">{intent.status}</Badge>
                  </div>
                  <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                    <p>{intent.branchName}</p>
                    <p>{intent.repository.fullName}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
