export type NotionPropertyValue = {
  type: string;
  [key: string]: unknown;
};

export type NotionPageProperties = Record<string, NotionPropertyValue>;

function richTextToPlainText(
  value: { plain_text?: string }[] | undefined,
): string {
  return value?.map((item) => item.plain_text ?? "").join("") ?? "";
}

export function getPropertyPlainText(
  properties: NotionPageProperties,
  propertyName: string,
): string {
  const property = properties[propertyName];

  if (!property) {
    return "";
  }

  switch (property.type) {
    case "title":
      return richTextToPlainText(
        (property as { title?: { plain_text?: string }[] }).title,
      );
    case "rich_text":
      return richTextToPlainText(
        (property as { rich_text?: { plain_text?: string }[] }).rich_text,
      );
    case "status":
      return (property as { status?: { name?: string } }).status?.name ?? "";
    case "select":
      return (property as { select?: { name?: string } }).select?.name ?? "";
    case "number":
      return (property as { number?: number }).number?.toString() ?? "";
    case "url":
      return (property as { url?: string }).url ?? "";
    case "formula": {
      const formula = (
        property as { formula?: { string?: string; number?: number } }
      ).formula;
      return formula?.string ?? formula?.number?.toString() ?? "";
    }
    case "unique_id": {
      const uniqueId = (
        property as { unique_id?: { prefix?: string; number?: number } }
      ).unique_id;
      return uniqueId?.prefix
        ? `${uniqueId.prefix}-${uniqueId.number}`
        : `${uniqueId?.number ?? ""}`;
    }
    default:
      return "";
  }
}

export function buildNotionPropertyUpdate(
  property: NotionPropertyValue,
  value: string,
): Record<string, unknown> | undefined {
  switch (property.type) {
    case "rich_text":
      return {
        rich_text: [{ text: { content: value } }],
      };
    case "url":
      return { url: value || null };
    case "select":
      return { select: value ? { name: value } : null };
    case "status":
      return { status: value ? { name: value } : null };
    case "date":
      return { date: value ? { start: value } : null };
    default:
      return {
        rich_text: [{ text: { content: value } }],
      };
  }
}
