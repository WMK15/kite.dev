import type {
  BranchIntent,
  DatabaseMapping,
  GitHubInstallation,
  NotionWorkspace,
  Repository,
  SyncEvent,
  WebhookDelivery,
} from "@/schema";

export type JsonObject = Record<string, unknown>;

export type IntegrationStatus = {
  notionWorkspaces: NotionWorkspace[];
  githubInstallations: GitHubInstallation[];
};

export type DashboardSnapshot = {
  repositoryCount: number;
  mappingCount: number;
  openIntentCount: number;
  recentSyncEvents: SyncEvent[];
  recentBranchIntents: Array<
    BranchIntent & { repository: Repository; mapping: DatabaseMapping }
  >;
};

export type WebhookProcessingResult = {
  statusCode: number;
  body: JsonObject;
};

export type VerifiedWebhook = {
  deliveryId: string;
  eventName: string;
  payloadHash: string;
};

export type StoredWebhookDelivery = WebhookDelivery;
