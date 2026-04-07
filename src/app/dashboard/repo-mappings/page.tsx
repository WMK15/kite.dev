export const dynamic = "force-dynamic";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getRepositoryMappings } from "@/lib/services/dashboard";

export default async function RepoMappingsPage(): Promise<React.JSX.Element> {
  const mappings = await getRepositoryMappings();

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          Repository mappings
        </h1>
        <p className="text-muted-foreground">
          Each mapping joins one Notion database to one GitHub repository and
          defines which task properties Kite.dev updates.
        </p>
      </div>

      <div className="grid gap-4">
        {mappings.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-sm text-muted-foreground">
              No mappings configured yet.
            </CardContent>
          </Card>
        ) : (
          mappings.map((mapping) => (
            <Card key={mapping.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle>{mapping.repository.fullName}</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {mapping.notionWorkspace.workspaceName}
                  </p>
                </div>
                <Badge variant={mapping.active ? "secondary" : "outline"}>
                  {mapping.active ? "active" : "inactive"}
                </Badge>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm text-muted-foreground md:grid-cols-2">
                <p>Database ID: {mapping.notionDatabaseId}</p>
                <p>Default branch type: {mapping.defaultBranchType}</p>
                <p>Task ID property: {mapping.taskIdProperty}</p>
                <p>Title property: {mapping.titleProperty}</p>
                <p>
                  Suggested branch property: {mapping.suggestedBranchProperty}
                </p>
                <p>Git status property: {mapping.gitStatusProperty}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
