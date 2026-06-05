'use client';

import { CheckCircle2, Info, TriangleAlert, X, XCircle } from 'lucide-react';
import * as React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../utils/cn';

/* ────────────────────────────────────────────────────────────────────────────
 * Sistema de toasts canónico del design system (Neobrutalism), sin dependencias.
 *
 * Multi-Zones: cada microfrontend es una app React independiente, por lo que cada
 * app debe montar <ToastProvider> una vez en su `app/layout.tsx` (dentro del
 * ApiProvider / StoreProvider). Los componentes usan `useToast()` para emitir
 * feedback transitorio tras una acción (éxito/error/aviso/info).
 * ──────────────────────────────────────────────────────────────────────────── */

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
  /** Título corto (línea principal). */
  title: string;
  /** Detalle opcional en segunda línea. */
  description?: string;
  variant?: ToastVariant;
  /** Milisegundos antes de auto-cerrar. Default 4500 (6000 para error). 0 = no auto-cerrar. */
  duration?: number;
}

interface ToastItem extends ToastOptions {
  id: number;
  variant: ToastVariant;
  duration: number;
}

interface ToastApi {
  toast: (opts: ToastOptions) => number;
  success: (title: string, description?: string) => number;
  error: (title: string, description?: string) => number;
  warning: (title: string, description?: string) => number;
  info: (title: string, description?: string) => number;
  dismiss: (id: number) => void;
}

const ToastContext = React.createContext<ToastApi | null>(null);

const VARIANT_META: Record<
  ToastVariant,
  {
    icon: React.ComponentType<{ className?: string }>;
    accent: string;
    iconColor: string;
    role: 'status' | 'alert';
  }
> = {
  success: { icon: CheckCircle2, accent: 'bg-success', iconColor: 'text-success', role: 'status' },
  error: { icon: XCircle, accent: 'bg-destructive', iconColor: 'text-destructive', role: 'alert' },
  warning: { icon: TriangleAlert, accent: 'bg-warning', iconColor: 'text-warning', role: 'alert' },
  info: { icon: Info, accent: 'bg-main', iconColor: 'text-main', role: 'status' },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);
  const [mounted, setMounted] = React.useState(false);
  const idRef = React.useRef(0);
  const timers = React.useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  React.useEffect(() => {
    setMounted(true);
    const map = timers.current;
    return () => {
      for (const t of map.values()) clearTimeout(t);
      map.clear();
    };
  }, []);

  const dismiss = React.useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const toast = React.useCallback(
    (opts: ToastOptions) => {
      idRef.current += 1;
      const id = idRef.current;
      const variant = opts.variant ?? 'info';
      const duration = opts.duration ?? (variant === 'error' ? 6000 : 4500);
      setToasts((prev) => [...prev, { ...opts, id, variant, duration }]);
      if (duration > 0) {
        timers.current.set(
          id,
          setTimeout(() => dismiss(id), duration),
        );
      }
      return id;
    },
    [dismiss],
  );

  const api = React.useMemo<ToastApi>(
    () => ({
      toast,
      success: (title, description) => toast({ variant: 'success', title, description }),
      error: (title, description) => toast({ variant: 'error', title, description }),
      warning: (title, description) => toast({ variant: 'warning', title, description }),
      info: (title, description) => toast({ variant: 'info', title, description }),
      dismiss,
    }),
    [toast, dismiss],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {mounted &&
        createPortal(
          <div
            className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:bottom-4 sm:right-4 sm:items-end sm:p-0"
            aria-live="polite"
            aria-relevant="additions"
          >
            {toasts.map((t) => (
              <ToastCard key={t.id} toast={t} onClose={() => dismiss(t.id)} />
            ))}
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  );
}

function ToastCard({ toast, onClose }: { toast: ToastItem; onClose: () => void }) {
  const meta = VARIANT_META[toast.variant];
  const Icon = meta.icon;
  return (
    <div
      role={meta.role}
      className={cn(
        'pointer-events-auto relative flex w-full max-w-sm items-start gap-3 overflow-hidden',
        'rounded-base border-2 border-border bg-background py-3 pl-4 pr-9 shadow-lg',
        'animate-in slide-in-from-bottom-2 fade-in-0 duration-200',
      )}
    >
      <span className={cn('absolute inset-y-0 left-0 w-1.5', meta.accent)} aria-hidden="true" />
      <Icon className={cn('mt-0.5 size-5 shrink-0', meta.iconColor)} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-heading leading-snug tracking-tight">{toast.title}</p>
        {toast.description ? (
          <p className="mt-0.5 text-xs font-sans leading-snug text-muted-foreground">
            {toast.description}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar notificación"
        className="absolute right-2 top-2 rounded-base p-1 text-foreground/40 transition-colors hover:bg-secondary-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

/** Hook para emitir toasts. Debe usarse dentro de <ToastProvider>. */
export function useToast(): ToastApi {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast debe usarse dentro de <ToastProvider> (móntalo en app/layout.tsx).');
  }
  return ctx;
}
