export type MemoryActor = {
  id: string;
  kind: "human" | "agent" | "system";
};

export type FunctionRecord = {
  name: string;
  signature: string;
  path: string;
  vertical: "security" | "cinema" | "saude" | "core";
  updatedAt: string;
  tags: string[];
};

export type MemoryEnvelope = {
  id: string;
  page: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  version: number;
  author: MemoryActor;
  provenance?: string;
};

export type InboxMessage = {
  id: string;
  from: MemoryActor;
  to: MemoryActor | "team" | "agents";
  type: "task" | "status" | "question" | "handoff" | "result";
  subject: string;
  body: string;
  createdAt: string;
  ackedBy: string[];
  priority?: "low" | "normal" | "high" | "critical";
};

export type HandoffBaton = {
  id: string;
  title: string;
  owner: MemoryActor;
  status: "pending" | "claimed" | "done" | "cancelled";
  claimedBy?: MemoryActor;
  createdAt: string;
  updatedAt: string;
  payload: Record<string, unknown>;
  steps: string[];
};

export interface MemoryStore {
  putPage(envelope: Omit<MemoryEnvelope, "version" | "id" | "createdAt" | "updatedAt"> & { id?: string }): MemoryEnvelope;
  getPage(page: string): MemoryEnvelope | undefined;
  listPages(tag?: string): MemoryEnvelope[];
  resolveFunction(name: string): FunctionRecord | undefined;
  registerFunction(record: FunctionRecord): void;
  inboxPost(message: Omit<InboxMessage, "id" | "createdAt" | "ackedBy">): InboxMessage;
  inboxPull(to: MemoryActor["id"] | "team" | "agents", includeClaimed?: boolean): InboxMessage[];
  inboxAck(id: string, actorId: string): void;
  createHandoff(baton: Omit<HandoffBaton, "id" | "createdAt" | "updatedAt" | "status">): HandoffBaton;
  claimHandoff(id: string, actor: MemoryActor): { success: boolean; reason?: string };
  completeHandoff(id: string, actor: MemoryActor): { success: boolean; reason?: string };
  renderWiki(): string;
}

export class InMemoryStore implements MemoryStore {
  private pages = new Map<string, MemoryEnvelope>();
  private funcs = new Map<string, FunctionRecord>();
  private inbox: InboxMessage[] = [];
  private batons = new Map<string, HandoffBaton>();

  putPage(input: Omit<MemoryEnvelope, "version" | "id" | "createdAt" | "updatedAt"> & { id?: string }): MemoryEnvelope {
    const id = input.id || `page-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const existing = this.pages.get(input.page);
    const now = new Date().toISOString();
    const env: MemoryEnvelope = {
      id,
      page: input.page,
      title: input.title,
      content: input.content,
      tags: input.tags || [],
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      version: (existing?.version || 0) + 1,
      author: input.author,
      provenance: input.provenance,
    };
    this.pages.set(input.page, env);
    return env;
  }

  getPage(page: string): MemoryEnvelope | undefined {
    return this.pages.get(page);
  }

  listPages(tag?: string): MemoryEnvelope[] {
    const all = Array.from(this.pages.values()).sort((a, b) => a.updatedAt < b.updatedAt ? 1 : -1);
    if (!tag) return all;
    return all.filter((e) => (e.tags || []).includes(tag));
  }

  resolveFunction(name: string): FunctionRecord | undefined {
    return this.funcs.get(name) || undefined;
  }

  registerFunction(record: FunctionRecord): void {
    this.funcs.set(record.name, record);
  }

  inboxPost(message: Omit<InboxMessage, "id" | "createdAt" | "ackedBy">): InboxMessage {
    const msg: InboxMessage = {
      ...message,
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
      ackedBy: [],
      priority: message.priority || "normal",
    };
    this.inbox.push(msg);
    return msg;
  }

  inboxPull(to: MemoryActor["id"] | "team" | "agents", includeClaimed?: boolean): InboxMessage[] {
    const want = (m: InboxMessage) => (m.to === to || m.to === "team" || (includeClaimed && m.ackedBy.includes(to)));
    return this.inbox.filter(want).sort((a, b) => priorityOrder(a.priority) - priorityOrder(b.priority));
  }

  inboxAck(id: string, actorId: string): void {
    const m = this.inbox.find((x) => x.id === id);
    if (!m) return;
    if (!m.ackedBy.includes(actorId)) m.ackedBy.push(actorId);
  }

  createHandoff(baton: Omit<HandoffBaton, "id" | "createdAt" | "updatedAt" | "status">): HandoffBaton {
    const now = new Date().toISOString();
    const b: HandoffBaton = {
      id: `baton-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: baton.title,
      owner: baton.owner,
      status: "pending",
      payload: baton.payload || {},
      steps: baton.steps || [],
      createdAt: now,
      updatedAt: now,
    };
    this.batons.set(b.id, b);
    return b;
  }

  claimHandoff(id: string, actor: MemoryActor): { success: boolean; reason?: string } {
    const b = this.batons.get(id);
    if (!b) return { success: false, reason: "not-found" };
    if (b.status === "claimed" || b.status === "done") {
      return { success: false, reason: "already-claimed" };
    }
    b.status = "claimed";
    b.claimedBy = actor;
    b.updatedAt = new Date().toISOString();
    this.batons.set(id, b);
    return { success: true };
  }

  completeHandoff(id: string, actor: MemoryActor): { success: boolean; reason?: string } {
    const b = this.batons.get(id);
    if (!b) return { success: false, reason: "not-found" };
    b.status = "done";
    if (!b.claimedBy) b.claimedBy = actor;
    b.updatedAt = new Date().toISOString();
    this.batons.set(id, b);
    return { success: true };
  }

  renderWiki(): string {
    const lines: string[] = ["# Project Memory Wiki", "", "## Pages", ""];
    for (const p of this.listPages()) {
      lines.push(`### ${p.title} (${p.page})`, "", p.content, "", "---", "");
    }
    if (this.funcs.size > 0) {
      lines.push("## Function Index", "");
      for (const f of this.funcs.values()) lines.push(`- \`${f.name}\` → ${f.path} (vertical: ${f.vertical})`);
    }
    return lines.join("\n");
  }
}

const priorityOrder = (p?: InboxMessage["priority"]) => {
  switch (p) {
    case "critical": return 0;
    case "high": return 1;
    case "normal": return 2;
    case "low": return 3;
    default: return 9;
  }
};

export function createMemory(): MemoryStore {
  return new InMemoryStore();
}
