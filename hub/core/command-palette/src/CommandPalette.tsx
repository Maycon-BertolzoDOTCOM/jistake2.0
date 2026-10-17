"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { cn } from "./lib/utils";
import Fuse from "fuse.js";
import {
  CommandAction,
  CommandGroup,
  CommandPaletteState,
  GLOBAL_SHORTCUTS,
} from "./types";

interface CommandPaletteProps {
  actions: CommandAction[];
  onClose: () => void;
  onExecute: (action: CommandAction) => void;
  placeholder?: string;
  className?: string;
}

export function CommandPalette({
  actions,
  onClose,
  onExecute,
  placeholder = "Digite um comando ou procure...",
  className,
}: CommandPaletteProps) {
  const [state, setState] = useState<CommandPaletteState>({
    isOpen: false,
    query: "",
    selectedIndex: 0,
    filteredActions: [],
    activeGroupId: null,
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const keySequenceRef = useRef<string[]>([]);
  const keyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const groups = useMemo(() => groupActions(actions), [actions]);

  const fuse = useMemo(
    () =>
      new Fuse(actions, {
        keys: ["label", "description", "keywords"],
        threshold: 0.4,
        includeScore: true,
        minMatchCharLength: 1,
      }),
    [actions]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        open();
        return;
      }

      if (!state.isOpen) {
        handleGlobalShortcuts(e);
        return;
      }

      switch (e.key) {
        case "Escape":
          close();
          break;
        case "ArrowDown":
          e.preventDefault();
          moveSelection(1);
          break;
        case "ArrowUp":
          e.preventDefault();
          moveSelection(-1);
          break;
        case "Enter":
          e.preventDefault();
          executeSelected();
          break;
        case "Tab":
          e.preventDefault();
          cycleGroup();
          break;
        default:
          if (e.key.length === 1 && !e.metaKey && !e.ctrlKey) {
            handleKeySequence(e.key);
          }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [state.isOpen, state.filteredActions.length]);

  useEffect(() => {
    if (state.isOpen) {
      setTimeout(() => inputRef.current?.focus(), 0);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [state.isOpen]);

  useEffect(() => {
    const results = fuse.search(state.query);
    setState((prev) => ({
      ...prev,
      filteredActions: results.map((r) => r.item),
      selectedIndex: 0,
    }));
  }, [state.query, fuse]);

  const open = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: true, query: "", selectedIndex: 0 }));
  }, []);

  const close = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: false, query: "" }));
    onClose();
  }, [onClose]);

  const moveSelection = useCallback((delta: number) => {
    setState((prev) => ({
      ...prev,
      selectedIndex: Math.max(
        0,
        Math.min(prev.filteredActions.length - 1, prev.selectedIndex + delta)
      ),
    }));
  }, []);

  const executeSelected = useCallback(() => {
    const action = state.filteredActions[state.selectedIndex];
    if (action && !action.disabled) {
      onExecute(action);
      close();
    }
  }, [state.filteredActions, state.selectedIndex, onExecute, close]);

  const cycleGroup = useCallback(() => {
    const groupIds = groups.map((g) => g.id);
    const currentIndex = groupIds.indexOf(state.activeGroupId || groupIds[0]);
    const nextIndex = (currentIndex + 1) % groupIds.length;
    setState((prev) => ({ ...prev, activeGroupId: groupIds[nextIndex] }));
  }, [groups, state.activeGroupId]);

  const handleKeySequence = useCallback((key: string) => {
    keySequenceRef.current.push(key);
    if (keyTimeoutRef.current) clearTimeout(keyTimeoutRef.current);
    keyTimeoutRef.current = setTimeout(() => {
      keySequenceRef.current = [];
    }, 1000);

    const shortcut = matchShortcut(keySequenceRef.current);
    if (shortcut) {
      const action = actions.find((a) => a.shortcut === shortcut);
      if (action && !action.disabled) {
        onExecute(action);
        close();
      }
      keySequenceRef.current = [];
    }
  }, [actions, onExecute, close]);

  const handleGlobalShortcuts = useCallback((e: KeyboardEvent) => {
    if (e.key === "g") {
      keySequenceRef.current = ["g"];
      if (keyTimeoutRef.current) clearTimeout(keyTimeoutRef.current);
      keyTimeoutRef.current = setTimeout(() => {
        keySequenceRef.current = [];
      }, 1000);
    } else if (keySequenceRef.current[0] === "g" && (e.key === "o" || e.key === "d" || e.key === "i" || e.key === "c" || e.key === "s")) {
      const shortcut = `g,${e.key}` as keyof typeof GLOBAL_SHORTCUTS;
      const action = actions.find((a) => a.shortcut === shortcut);
      if (action && !action.disabled) {
        onExecute(action);
      }
      keySequenceRef.current = [];
      if (keyTimeoutRef.current) clearTimeout(keyTimeoutRef.current);
    } else if (e.key === "v") {
      const action = actions.find((a) => a.shortcut === "v");
      if (action && !action.disabled) {
        onExecute(action);
      }
    } else if (e.key === "?" && e.shiftKey) {
      const action = actions.find((a) => a.shortcut === "?");
      if (action && !action.disabled) {
        onExecute(action);
      }
    } else {
      keySequenceRef.current = [];
    }
  }, [actions, onExecute]);

  if (!state.isOpen) return null;

  const selectedAction = state.filteredActions[state.selectedIndex];

  return (
    <div className={cn("command-palette-overlay", className)} role="dialog" aria-modal="true" aria-label="Command Palette">
      <div className="command-palette" role="document">
        <div className="command-palette-input-wrapper">
          <svg className="command-palette-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            className="command-palette-input"
            placeholder={placeholder}
            value={state.query}
            onChange={(e) => setState((prev) => ({ ...prev, query: e.target.value }))}
            aria-activedescendant={selectedAction ? `cmd-${selectedAction.id}` : undefined}
            aria-autocomplete="list"
            aria-controls="command-palette-list"
            aria-expanded="true"
            spellCheck={false}
          />
          <kbd className="command-palette-hint">⌘K</kbd>
        </div>

        <ul
          ref={listRef}
          id="command-palette-list"
          className="command-palette-list"
          role="listbox"
          aria-label="Comandos disponíveis"
        >
          {groups
            .filter((g) => !state.activeGroupId || g.id === state.activeGroupId)
            .map((group) => (
              <li key={group.id} className="command-palette-group">
                <div className="command-palette-group-label">{group.label}</div>
                {group.actions
                  .filter((a) => state.filteredActions.includes(a))
                  .map((action) => {
                    const globalIndex = state.filteredActions.indexOf(action);
                    const isSelected = globalIndex === state.selectedIndex;
                    return (
                      <button
                        key={action.id}
                        id={`cmd-${action.id}`}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        aria-disabled={action.disabled}
                        className={cn(
                          "command-palette-item",
                          isSelected && "selected",
                          action.disabled && "disabled"
                        )}
                        onClick={() => {
                          if (!action.disabled) {
                            onExecute(action);
                            close();
                          }
                        }}
                        onMouseEnter={() => setState((prev) => ({ ...prev, selectedIndex: globalIndex }))}
                      >
                        <span className="command-palette-item-label">{action.label}</span>
                        {action.description && (
                          <span className="command-palette-item-desc">{action.description}</span>
                        )}
                        {action.shortcut && (
                          <kbd className="command-palette-item-shortcut">{formatShortcut(action.shortcut)}</kbd>
                        )}
                      </button>
                    );
                  })}
              </li>
            ))}
          {state.filteredActions.length === 0 && (
            <li className="command-palette-empty">
              Nenhum comando encontrado para "<strong>{state.query}</strong>"
            </li>
          )}
        </ul>

        <div className="command-palette-footer">
          <div className="command-palette-shortcuts">
            {Object.entries(GLOBAL_SHORTCUTS).map(([shortcut, label]) => (
              <span key={shortcut} className="shortcut-hint">
                <kbd>{formatShortcut(shortcut)}</kbd> {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function groupActions(actions: CommandAction[]): CommandGroup[] {
  const groups = new Map<string, CommandAction[]>();
  for (const action of actions) {
    const group = groups.get(action.category) || [];
    group.push(action);
    groups.set(action.category, group);
  }
  return Array.from(groups.entries()).map(([id, actions]) => ({
    id,
    label: id.charAt(0).toUpperCase() + id.slice(1),
    actions: actions.sort((a, b) => a.label.localeCompare(b.label)),
  }));
}

function formatShortcut(shortcut: string): string {
  return shortcut
    .replace("cmd", "⌘")
    .replace("ctrl", "Ctrl")
    .replace(",", " → ")
    .replace("g,o", "G → O")
    .replace("g,d", "G → D")
    .replace("g,i", "G → I")
    .replace("g,c", "G → C")
    .replace("g,s", "G → S");
}

function matchShortcut(keys: string[]): keyof typeof GLOBAL_SHORTCUTS | null {
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