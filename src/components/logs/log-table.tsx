import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type LogRow = {
  id: string;
  eventType: string;
  outcome: string;
  message: string;
  occurredAt: Date;
  repositoryName?: string;
};

export function LogTable({ rows }: { rows: LogRow[] }): React.JSX.Element {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Event</TableHead>
          <TableHead>Outcome</TableHead>
          <TableHead>Repository</TableHead>
          <TableHead>Message</TableHead>
          <TableHead>Time</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell className="font-medium">{row.eventType}</TableCell>
            <TableCell>
              <Badge
                variant={
                  row.outcome === "success"
                    ? "secondary"
                    : row.outcome === "failed"
                      ? "destructive"
                      : "outline"
                }
              >
                {row.outcome}
              </Badge>
            </TableCell>
            <TableCell>{row.repositoryName ?? "-"}</TableCell>
            <TableCell>{row.message}</TableCell>
            <TableCell>{row.occurredAt.toISOString()}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
