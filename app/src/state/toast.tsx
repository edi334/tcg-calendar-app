import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import type { ToastType } from "../theme/palette";
import { ToastHost } from "../components/ToastHost";

export interface ToastData {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastState {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastState | null>(null);

const AUTO_DISMISS_MS = 2800;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastData | null>(null);
  const idRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    idRef.current += 1;
    setToast({ id: idRef.current, message, type });
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setToast(null), AUTO_DISMISS_MS);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastHost toast={toast} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastState {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
