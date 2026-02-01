import { useToast } from "../context/ToastContext";

const styles = {
  success: "bg-emerald-600 text-white border-emerald-700",
  error: "bg-red-600 text-white border-red-700",
  info: "bg-slate-700 text-white border-slate-800"
};

export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed right-4 top-4 z-[100] flex flex-col gap-2"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="alert"
          className={`flex min-w-[280px] max-w-sm items-center justify-between rounded-lg border px-4 py-3 shadow-lg ${styles[t.type]}`}
        >
          <span className="text-sm font-medium">{t.message}</span>
          <button
            type="button"
            onClick={() => removeToast(t.id)}
            className="ml-2 rounded p-1 opacity-80 hover:opacity-100"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
