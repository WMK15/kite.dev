"use client";

import { useActionState, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { NotionWorkspace, Repository } from "@/schema";

import {
  createMappingAction,
  fetchDatabasesForWorkspace,
  type CreateMappingState,
  type NotionDatabase,
} from "./actions";

interface CreateMappingFormProps {
  workspaces: NotionWorkspace[];
  repositories: Repository[];
}

const branchTypes = [
  { value: "feat", label: "feat (feature)" },
  { value: "fix", label: "fix (bug fix)" },
  { value: "chore", label: "chore (maintenance)" },
  { value: "docs", label: "docs (documentation)" },
  { value: "refactor", label: "refactor (refactoring)" },
  { value: "test", label: "test (testing)" },
] as const;

export function CreateMappingForm({
  workspaces,
  repositories,
}: CreateMappingFormProps): React.JSX.Element {
  const [state, formAction, isPending] = useActionState<
    CreateMappingState,
    FormData
  >(createMappingAction, { status: "idle" });

  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>("");
  const [selectedRepositoryId, setSelectedRepositoryId] = useState<string>("");
  const [selectedDatabase, setSelectedDatabase] =
    useState<NotionDatabase | null>(null);
  const [manualDatabaseId, setManualDatabaseId] = useState<string>("");
  const [manualDatabaseName, setManualDatabaseName] = useState<string>("");
  const [useManualEntry, setUseManualEntry] = useState<boolean>(false);
  const [selectedBranchType, setSelectedBranchType] = useState<string>("feat");
  const [databases, setDatabases] = useState<NotionDatabase[]>([]);
  const [isLoadingDatabases, startLoadingDatabases] = useTransition();

  function handleWorkspaceChange(workspaceId: string) {
    setSelectedWorkspaceId(workspaceId);
    setSelectedDatabase(null);
    setDatabases([]);

    if (workspaceId) {
      startLoadingDatabases(async () => {
        const dbs = await fetchDatabasesForWorkspace(workspaceId);
        console.log("=== FETCHED DATABASES ===");
        dbs.forEach((db, i) => console.log(`  ${i}: ${db.id} - ${db.title}`));
        console.log("=========================");
        setDatabases(dbs);
      });
    }
  }

  function handleDatabaseChange(databaseId: string) {
    console.log("=== DATABASE CHANGE ===");
    console.log("Selected ID from dropdown:", databaseId);
    console.log(
      "Databases in state:",
      databases.map((d) => d.id),
    );
    const db = databases.find((d) => d.id === databaseId) ?? null;
    console.log("Found database:", db);
    console.log("=======================");
    setSelectedDatabase(db);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create new mapping</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="notionWorkspaceId">Notion workspace</Label>
            <Select
              required
              disabled={isPending}
              value={selectedWorkspaceId}
              onValueChange={handleWorkspaceChange}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a workspace" />
              </SelectTrigger>
              <SelectContent>
                {workspaces.map((ws) => (
                  <SelectItem key={ws.id} value={ws.id}>
                    {ws.workspaceName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input
              type="hidden"
              name="notionWorkspaceId"
              value={selectedWorkspaceId}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="repositoryId">Repository</Label>
            <Select
              required
              disabled={isPending}
              value={selectedRepositoryId}
              onValueChange={setSelectedRepositoryId}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a repository" />
              </SelectTrigger>
              <SelectContent>
                {repositories.map((repo) => (
                  <SelectItem key={repo.id} value={repo.id}>
                    {repo.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input
              type="hidden"
              name="repositoryId"
              value={selectedRepositoryId}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="notionDatabaseId">Notion database</Label>
              <button
                type="button"
                className="text-xs text-muted-foreground underline cursor-pointer"
                onClick={() => {
                  setUseManualEntry(!useManualEntry);
                  setSelectedDatabase(null);
                  setManualDatabaseId("");
                  setManualDatabaseName("");
                }}
              >
                {useManualEntry ? "Select from list" : "Enter ID manually"}
              </button>
            </div>
            {useManualEntry ? (
              <div className="space-y-2">
                <Input
                  id="manualDatabaseId"
                  placeholder="Paste database ID (from URL)"
                  value={manualDatabaseId}
                  onChange={(e) => setManualDatabaseId(e.target.value)}
                  disabled={isPending}
                />
                <Input
                  id="manualDatabaseName"
                  placeholder="Database name"
                  value={manualDatabaseName}
                  onChange={(e) => setManualDatabaseName(e.target.value)}
                  disabled={isPending}
                />
                <p className="text-xs text-muted-foreground">
                  Copy the database ID from the Notion URL (the long string
                  after the workspace name)
                </p>
              </div>
            ) : selectedWorkspaceId ? (
              <Select
                required={!useManualEntry}
                disabled={isPending || isLoadingDatabases}
                value={selectedDatabase?.id ?? ""}
                onValueChange={handleDatabaseChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={
                      isLoadingDatabases
                        ? "Loading databases..."
                        : databases.length === 0
                          ? "No databases found"
                          : "Select a database"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {databases.map((db) => (
                    <SelectItem key={db.id} value={db.id}>
                      {db.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Select disabled>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a workspace first" />
                </SelectTrigger>
                <SelectContent />
              </Select>
            )}
            <input
              type="hidden"
              name="notionDatabaseId"
              value={
                useManualEntry ? manualDatabaseId : (selectedDatabase?.id ?? "")
              }
            />
            <input
              type="hidden"
              name="notionDatabaseName"
              value={
                useManualEntry
                  ? manualDatabaseName
                  : (selectedDatabase?.title ?? "")
              }
            />
            {!useManualEntry && selectedDatabase && (
              <p className="text-xs font-mono text-muted-foreground">
                ID: {selectedDatabase.id}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="titleProperty">Title property</Label>
            <Input
              id="titleProperty"
              name="titleProperty"
              defaultValue="Name"
              required
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="taskIdProperty">Task ID property</Label>
            <Input
              id="taskIdProperty"
              name="taskIdProperty"
              defaultValue="Task ID"
              required
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="suggestedBranchProperty">
              Suggested branch property
            </Label>
            <Input
              id="suggestedBranchProperty"
              name="suggestedBranchProperty"
              defaultValue="Suggested Branch"
              required
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gitStatusProperty">Git status property</Label>
            <Input
              id="gitStatusProperty"
              name="gitStatusProperty"
              defaultValue="Git Status"
              required
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastSyncedAtProperty">
              Last synced at property
            </Label>
            <Input
              id="lastSyncedAtProperty"
              name="lastSyncedAtProperty"
              defaultValue="Last Synced At"
              required
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="defaultBranchType">Default branch type</Label>
            <Select
              value={selectedBranchType}
              onValueChange={setSelectedBranchType}
              required
              disabled={isPending}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select branch type" />
              </SelectTrigger>
              <SelectContent>
                {branchTypes.map((bt) => (
                  <SelectItem key={bt.value} value={bt.value}>
                    {bt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input
              type="hidden"
              name="defaultBranchType"
              value={selectedBranchType}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pullRequestUrlProperty">
              Pull request URL property (optional)
            </Label>
            <Input
              id="pullRequestUrlProperty"
              name="pullRequestUrlProperty"
              placeholder="PR URL"
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="webhookSecret">Webhook secret (optional)</Label>
            <Input
              id="webhookSecret"
              name="webhookSecret"
              type="password"
              placeholder="Optional secret for webhook verification"
              disabled={isPending}
            />
          </div>

          <div className="md:col-span-2">
            {state.status === "error" && (
              <p className="mb-4 text-sm text-destructive">{state.message}</p>
            )}
            {state.status === "success" && (
              <p className="mb-4 text-sm text-green-600">
                Mapping created successfully
              </p>
            )}
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creating..." : "Create mapping"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
