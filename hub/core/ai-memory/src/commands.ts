import { MemoryStore, type MemoryActor } from "./index";

export type MemoryCommand = {
  id: string;
  label: string;
  description: string;
  keywords: string[];
};

export function createMemoryCommands(_store: MemoryStore): MemoryCommand[] {
  return [
    {
      id: "memory:search",
      label: "Search Memory",
      description: "Search OKF pages with local embeddings",
      keywords: ["memory", "search", "embeddings", "okf", "lookup", "function"],
    },
    {
      id: "memory:inbox",
      label: "Memory Inbox",
      description: "Pull pending messages for this actor",
      keywords: ["inbox", "messages", "status", "question", "task"],
    },
    {
      id: "memory:wiki",
      label: "Render Memory Wiki",
      description: "Render full OKF markdown wiki and export bundle",
      keywords: ["wiki", "okf", "markdown", "export", "functions"],
    },
    {
      id: "memory:handoff",
      label: "Create/Claim Baton",
      description: "Create baton and claim once without stealing",
      keywords: ["handoff", "baton", "owner", "resume"],
    },
  ];
}

export async function executeMemoryCommand(store: MemoryStore, commandId: string, params: Record<string, unknown>) {
  switch (commandId) {
    case "memory:search": {
      const page = store.getPage(String(params.page || ""));
      return { found: !!page, page };
    }
    case "memory:inbox": {
      const actor = String(params.actorId || "team");
      return { messages: store.inboxPull(actor as MemoryActor["id"] | "team" | "agents", true) };
    }
    case "memory:wiki": {
      return { wiki: store.renderWiki() };
    }
    case "memory:handoff": {
      const baton = store.createHandoff({
        title: String(params.title || "handoff"),
        owner: { id: String(params.ownerId || "agent"), kind: "agent" },
        payload: (params.payload as Record<string, unknown>) || {},
        steps: (params.steps as string[]) || [],
      });
      return { baton };
    }
    default:
      return { ok: false, error: `Unknown command: ${commandId}` };
  }
}
