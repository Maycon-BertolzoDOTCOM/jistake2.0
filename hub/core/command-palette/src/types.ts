export interface CommandAction {
  id: string;
  label: string;
  description?: string;
  shortcut?: string;
  category: "operation" | "deception" | "intelligence" | "copylab" | "status" | "vertical" | "help";
  keywords: string[];
  execute: () => Promise<void> | void;
  disabled?: boolean;
}

export interface CommandGroup {
  id: string;
  label: string;
  actions: CommandAction[];
}

export interface CommandPaletteState {
  isOpen: boolean;
  query: string;
  selectedIndex: number;
  filteredActions: CommandAction[];
  activeGroupId: string | null;
}

export type CommandPaletteShortcut =
  | "g,o"
  | "g,d"
  | "g,i"
  | "g,c"
  | "g,s"
  | "v"
  | "?"
  | "cmd+k"
  | "ctrl+k"
  | "escape";

export const GLOBAL_SHORTCUTS: Record<Exclude<CommandPaletteShortcut, "cmd+k" | "ctrl+k" | "escape">, string> = {
  "g,o": "Operação",
  "g,d": "Deception",
  "g,i": "Inteligência",
  "g,c": "Copy Lab",
  "g,s": "Status",
  "v": "Trocar Vertical",
  "?": "Atalhos",
};

export function matchShortcut(keys: string[]): CommandPaletteShortcut | null {
  const seq = keys.join(",");
  if (seq === "g,o") return "g,o";
  if (seq === "g,d") return "g,d";
  if (seq === "g,i") return "g,i";
  if (seq === "g,c") return "g,c";
  if (seq === "g,s") return "g,s";
  if (seq === "v") return "v";
  if (seq === "?") return "?";
  return null;
}