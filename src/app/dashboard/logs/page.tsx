export const dynamic = "force-dynamic";

import { LogTable } from "@/components/logs/log-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getRecentSyncLog } from "@/lib/services/dashboard";

export default async function LogsPage(): Promise<React.JSX.Element> {
  const rows = await getRecentSyncLog();

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          Logs and sync status
        </h1>
        <p className="text-muted-foreground">
          Structured operational logs for webhook processing and task
          synchronisation.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent events</CardTitle>
        </CardHeader>
        <CardContent>
          <LogTable
            rows={rows.map((row) => ({
              id: row.id,
              eventType: row.eventType,
              outcome: row.outcome,
              message: row.message,
              occurredAt: row.occurredAt,
              repositoryName: row.repository?.fullName ?? "-",
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
