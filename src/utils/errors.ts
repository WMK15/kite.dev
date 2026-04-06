export function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error("Unknown error");
}

export function publicErrorMessage(error: unknown): string {
  return toError(error).message || "Unexpected error";
}
