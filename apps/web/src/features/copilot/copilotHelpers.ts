import { CopilotReference, CopilotThreadDetail, CopilotThreadSummary } from "../../lib/api";

export type CopilotThreadGroup = {
  label: string;
  items: CopilotThreadSummary[];
  unreadCount: number;
};

export function groupCopilotThreads(threads: CopilotThreadSummary[]) {
  const sections = new Map<string, CopilotThreadSummary[]>();
  for (const thread of threads) {
    const label = thread.archived
      ? "Archived"
      : thread.pinned
        ? "Pinned"
        : thread.visibility === "private"
          ? "My private"
          : thread.scope === "global"
            ? "Current workspace"
            : thread.scope === "help_request"
              ? "Shared with me"
              : "Recent shared";
    const current = sections.get(label);
    if (current) {
      current.push(thread);
    } else {
      sections.set(label, [thread]);
    }
  }
  return Array.from(sections.entries())
    .sort(([left], [right]) => threadGroupOrder(left) - threadGroupOrder(right))
    .map(([label, items]) => ({
      label,
      items: [...items].sort(compareThreads),
      unreadCount: items.reduce((sum, thread) => sum + thread.unread_count, 0),
    })) satisfies CopilotThreadGroup[];
}

export function threadGroupOrder(label: string) {
  switch (label) {
    case "Current workspace":
      return 0;
    case "Pinned":
      return 1;
    case "Recent shared":
      return 2;
    case "My private":
      return 3;
    case "Shared with me":
      return 4;
    case "Archived":
      return 5;
    default:
      return 9;
  }
}

export function compareThreads(left: CopilotThreadSummary, right: CopilotThreadSummary) {
  const leftTs = left.last_activity_at ?? left.latest_message_at ?? left.created_at;
  const rightTs = right.last_activity_at ?? right.latest_message_at ?? right.created_at;
  return new Date(rightTs).getTime() - new Date(leftTs).getTime();
}

export function fileReferencesForMessage(references: CopilotThreadDetail["messages"][number]["references"]) {
  return references.filter((reference) => reference.type === "file_asset" || reference.type === "attachment" || reference.type === "file_memory");
}

export function nonFileReferencesForMessage(references: CopilotThreadDetail["messages"][number]["references"]) {
  return references.filter((reference) => reference.type !== "file_asset" && reference.type !== "attachment" && reference.type !== "file_memory");
}

export function contentUrlFromReference(reference: CopilotReference) {
  const payload = reference.payload;
  if (!payload) {
    return null;
  }
  const contentUrl = payload["content_url"];
  if (typeof contentUrl === "string" && contentUrl.length) {
    return contentUrl;
  }
  const url = payload["url"];
  return typeof url === "string" && url.length ? url : null;
}

export function formatSourceMode(sourceMode: string) {
  switch (sourceMode) {
    case "manual_input":
      return "Manual";
    case "branch":
      return "Branch";
    case "openai_live_v1":
    case "anthropic_live_v1":
      return "Live AI";
    case "mock_ai_v1":
      return "Mock AI";
    default:
      return sourceMode.replace(/_/g, " ");
  }
}
