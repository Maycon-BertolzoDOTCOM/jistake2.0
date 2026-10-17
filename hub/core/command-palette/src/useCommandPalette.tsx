import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { CommandAction } from "./types";

interface CommandPaletteContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  registerActions: (actions: CommandAction[]) => () => void;
  executeAction: (actionId: string) => void;
}

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(null);

interface CommandPaletteProviderProps {
  children: ReactNode;
}

export function CommandPaletteProvider({ children }: CommandPaletteProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [registeredActions, setRegisteredActions] = useState<CommandAction[]>([]);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  const registerActions = useCallback((actions: CommandAction[]) => {
    setRegisteredActions((prev) => [...prev, ...actions]);
    return () => {
      setRegisteredActions((prev) => prev.filter((a) => !actions.includes(a)));
    };
  }, []);

  const executeAction = useCallback((actionId: string) => {
    const action = registeredActions.find((a) => a.id === actionId);
    if (action && !action.disabled) {
      action.execute();
      close();
    }
  }, [registeredActions, close]);

  return (
    <CommandPaletteContext.Provider value={{ isOpen, open, close, registerActions, executeAction }}>
      {children}
    </CommandPaletteContext.Provider>
  );
}

export function useCommandPalette() {
  const context = useContext(CommandPaletteContext);
  if (!context) {
    throw new Error("useCommandPalette deve ser usado dentro de CommandPaletteProvider");
  }
  return context;
}