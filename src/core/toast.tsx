import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';
import { cn } from '../utils/cn';

type ToastType = 'success' | 'error' | 'info';
interface ToastItem { id: string; message: string; type: ToastType }
interface ToastCtx { toast: (message: string, type?: ToastType) => void }

const Ctx = createContext<ToastCtx | null>(null);

export function useToast(): ToastCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useToast must be inside ToastProvider');
  return c;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev.slice(-3), { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  const dismiss = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      {toasts.length > 0 && (
        <div
          className="fixed bottom-20 inset-x-4 z-50 flex flex-col gap-2 pointer-events-none"
          role="status"
          aria-live="polite"
          aria-atomic="false"
        >
          {toasts.map(t => (
            <div
              key={t.id}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg pointer-events-auto animate-fade-in text-white',
                t.type === 'success' && 'bg-emerald-700',
                t.type === 'error'   && 'bg-red-700',
                t.type === 'info'    && 'bg-gray-900',
              )}
            >
              {t.type === 'success' && <CheckCircle2 size={18} className="shrink-0" />}
              {t.type === 'error'   && <XCircle      size={18} className="shrink-0" />}
              {t.type === 'info'    && <Info         size={18} className="shrink-0" />}
              <span className="text-sm font-medium flex-1">{t.message}</span>
              <button
                onClick={() => dismiss(t.id)}
                className="opacity-70 hover:opacity-100 shrink-0"
                aria-label="Dismiss"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </Ctx.Provider>
  );
}
