export const dynamic = "force-dynamic";

import { CheckCircle2, ShieldCheck, Webhook } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getIntegrationStatus } from "@/lib/services/dashboard";
import {
  getGitHubAppInstallationUrl,
  getNotionAuthorisationUrl,
} from "@/lib/services/integration-links";

import { DeleteInstallationButton } from "./delete-installation-button";
import { DeleteWorkspaceButton } from "./delete-workspace-button";
import { SyncRepositoriesButton } from "./sync-repositories-button";

export default async function IntegrationsPage(): Promise<React.JSX.Element> {
  const integrations = await getIntegrationStatus();
  const notionAuthorisationUrl = getNotionAuthorisationUrl();
  const githubInstallationUrl = getGitHubAppInstallationUrl();

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-6 py-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Integrations</h1>
        <p className="text-muted-foreground">
          Connect Notion workspaces and GitHub App installations, then map
          databases to repositories.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Notion</CardTitle>
                <CardDescription>
                  Public integration and task database access
                </CardDescription>
              </div>
              <Badge
                variant={
                  integrations.notionWorkspaces.length > 0
                    ? "secondary"
                    : "outline"
                }
              >
                {integrations.notionWorkspaces.length > 0
                  ? "Connected"
                  : "Not connected"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            {integrations.notionWorkspaces.map((workspace) => (
              <div
                key={workspace.id}
                className="rounded-2xl border border-border/70 p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-foreground">
                      {workspace.workspaceName}
                    </p>
                    <p>{workspace.notionWorkspaceId}</p>
                  </div>
                  <DeleteWorkspaceButton
                    workspaceId={workspace.id}
                    workspaceName={workspace.workspaceName}
                  />
                </div>
              </div>
            ))}
            <div className="rounded-2xl bg-muted p-4">
              <p>Redirect URI: `/api/auth/notion/callback`</p>
              <p>Webhook endpoint: `/api/notion/webhook/start-branch`</p>
            </div>
            <Button asChild variant="outline">
              <a href={notionAuthorisationUrl}>Connect Notion workspace</a>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>GitHub App</CardTitle>
                <CardDescription>
                  Installation-driven repository access and webhook delivery
                </CardDescription>
              </div>
              <Badge
                variant={
                  integrations.githubInstallations.length > 0
                    ? "secondary"
                    : "outline"
                }
              >
                {integrations.githubInstallations.length > 0
                  ? "Connected"
                  : "Not connected"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            {integrations.githubInstallations.map((installation) => (
              <div
                key={installation.id}
                className="space-y-3 rounded-2xl border border-border/70 p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-foreground">
                      {installation.accountLogin}
                    </p>
                    <p>Installation ID: {installation.githubInstallationId}</p>
                  </div>
                  <DeleteInstallationButton
                    installationId={installation.id}
                    accountLogin={installation.accountLogin}
                  />
                </div>
                <SyncRepositoriesButton installationId={installation.id} />
              </div>
            ))}
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl bg-muted p-4">
                <ShieldCheck className="mb-2 size-4 text-primary" />
                <p>Signature verification</p>
              </div>
              <div className="rounded-2xl bg-muted p-4">
                <Webhook className="mb-2 size-4 text-primary" />
                <p>Push and pull request webhooks</p>
              </div>
              <div className="rounded-2xl bg-muted p-4">
                <CheckCircle2 className="mb-2 size-4 text-primary" />
                <p>Idempotent delivery handling</p>
              </div>
            </div>
            <div className="rounded-2xl bg-muted p-4">
              <p>Callback URL: `/api/auth/github/callback`</p>
              <p>Webhook endpoint: `/api/github/webhooks`</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <a href={githubInstallationUrl}>Install GitHub App</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
