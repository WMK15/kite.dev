import { toError } from "@/utils/errors";

const sensitiveKeyPattern =
  /(secret|token|key|private|authorization|signature)/i;

function sanitiseValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sanitiseValue);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(
        ([key, nestedValue]) => [
          key,
          sensitiveKeyPattern.test(key)
            ? "[REDACTED]"
            : sanitiseValue(nestedValue),
        ],
      ),
    );
  }

  return value;
}

function writeLog(
  level: "info" | "warn" | "error",
  message: string,
  context?: unknown,
): void {
  const payload = {
    level,
    message,
    context: sanitiseValue(context ?? {}),
    timestamp: new Date().toISOString(),
  };

  const line = JSON.stringify(payload);

  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  console.info(line);
}

export const logger = {
  info(message: string, context?: unknown): void {
    writeLog("info", message, context);
  },
  warn(message: string, context?: unknown): void {
    writeLog("warn", message, context);
  },
  error(message: string, error: unknown, context?: unknown): void {
    writeLog("error", message, {
      ...((context as Record<string, unknown> | undefined) ?? {}),
      error: {
        name: toError(error).name,
        message: toError(error).message,
      },
    });
  },
};
