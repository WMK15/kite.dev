import type { BranchType } from "@/env/shared";

const safeSeparator = /[^a-z0-9-]+/g;

export function slugifyBranchSegment(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(safeSeparator, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function normaliseTaskIdentifier(taskIdentifier: string): string {
  const compact = taskIdentifier
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]+/g, "-");

  return compact.replace(/-+/g, "-").replace(/^-|-$/g, "");
}

export function generateBranchName(input: {
  type: BranchType;
  taskIdentifier: string;
  title: string;
}): string {
  const taskIdentifier = normaliseTaskIdentifier(input.taskIdentifier);
  const slug = slugifyBranchSegment(input.title).slice(0, 48);

  return `${input.type}/${taskIdentifier}-${slug}`;
}
