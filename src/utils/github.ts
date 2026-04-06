export function extractBranchFromRef(ref: string): string | null {
  if (!ref.startsWith("refs/heads/")) {
    return null;
  }

  return ref.replace("refs/heads/", "");
}

export function normaliseRepositoryFullName(
  owner: string,
  name: string,
): string {
  return `${owner}/${name}`.toLowerCase();
}
