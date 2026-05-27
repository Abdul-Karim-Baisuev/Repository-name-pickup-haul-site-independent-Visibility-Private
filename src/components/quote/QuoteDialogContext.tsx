import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type QuoteDialogContextValue = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  setOpen: (open: boolean) => void;
};

const QuoteDialogContext = createContext<QuoteDialogContextValue | null>(null);

export const QuoteDialogProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  const value = useMemo(
    () => ({ isOpen, open, close, setOpen: setIsOpen }),
    [isOpen, open, close],
  );

  return <QuoteDialogContext.Provider value={value}>{children}</QuoteDialogContext.Provider>;
};

export const useQuoteDialog = () => {
  const ctx = useContext(QuoteDialogContext);
  if (!ctx) {
    throw new Error("useQuoteDialog must be used within a QuoteDialogProvider");
  }
  return ctx;
};
