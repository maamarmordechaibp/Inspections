import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType, duration?: number) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const ICONS: Record<ToastType, string> = {
  success: 'ri-checkbox-circle-fill',
  error: 'ri-error-warning-fill',
  info: 'ri-information-fill',
  warning: 'ri-alert-fill',
};

const STYLES: Record<ToastType, string> = {
  success: 'bg-white border-emerald-200 text-gray-800',
  error: 'bg-white border-red-200 text-gray-800',
  info: 'bg-white border-brand-cyan/30 text-gray-800',
  warning: 'bg-white border-amber-200 text-gray-800',
};

const ICON_COLORS: Record<ToastType, string> = {
  success: 'text-emerald-500',
  error: 'text-red-500',
  info: 'text-brand-cyan',
  warning: 'text-amber-500',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const toast = useCallback(
    (message: string, type: ToastType = 'info', duration = 4000) => {
      const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      setToasts((prev) => [...prev, { id, type, message, duration }]);
      if (duration > 0) {
        const timer = setTimeout(() => dismiss(id), duration);
        timers.current.set(id, timer);
      }
    },
    [dismiss]
  );

  const success = useCallback((m: string, d?: number) => toast(m, 'success', d), [toast]);
  const error = useCallback((m: string, d?: number) => toast(m, 'error', d ?? 6000), [toast]);
  const info = useCallback((m: string, d?: number) => toast(m, 'info', d), [toast]);
  const warning = useCallback((m: string, d?: number) => toast(m, 'warning', d), [toast]);

  useEffect(() => {
    const map = timers.current;
    return () => {
      map.forEach((t) => clearTimeout(t));
      map.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={{ toast, success, error, info, warning, dismiss }}>
      {children}
      <div
        className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 w-[calc(100%-2rem)] sm:w-96 max-w-[calc(100vw-2rem)] pointer-events-none"
        role="region"
        aria-label="Notifications"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="alert"
            aria-live={t.type === 'error' ? 'assertive' : 'polite'}
            className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg animate-[slideIn_0.2s_ease-out] ${STYLES[t.type]}`}
          >
            <span className={`w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5 ${ICON_COLORS[t.type]}`}>
              <i className={`${ICONS[t.type]} text-lg`}></i>
            </span>
            <p className="flex-1 text-sm leading-snug">{t.message}</p>
            <button
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss notification"
              className="w-5 h-5 flex items-center justify-center flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
            >
              <i className="ri-close-line"></i>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}
