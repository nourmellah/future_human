import * as React from "react";
import { createPortal } from "react-dom";
import { createRoot } from "react-dom/client";
import { CheckCircle2, XCircle, AlertTriangle, Info } from "lucide-react";

export type NotificationVariant = "success" | "error" | "warning" | "info";

export type NotificationProps = {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  variant?: NotificationVariant;
  duration?: number; // ms; omit/0 for sticky
  icon?: React.ReactNode; // custom icon overrides variant default
  actions?: React.ReactNode; // e.g., Undo button
  placement?:
    | "top-right"
    | "top-left"
    | "bottom-right"
    | "bottom-left"
    | "top-center"
    | "bottom-center";
  closable?: boolean;
  className?: string;
};

const placements: Record<NonNullable<NotificationProps["placement"]>, string> = {
  "top-right": "top-4 right-4",
  "top-left": "top-4 left-4",
  "bottom-right": "bottom-4 right-4",
  "bottom-left": "bottom-4 left-4",
  "top-center": "top-4 left-1/2 -translate-x-1/2",
  "bottom-center": "bottom-4 left-1/2 -translate-x-1/2",
};

const variantStyles: Record<NotificationVariant, { border: string; bg: string; text: string; icon: React.ReactNode; ring: string; role: "status" | "alert"; }>
= {
  success: {
    border: "border-green-600/30",
    bg: "bg-[#102017]",
    text: "text-green-200",
    icon: <CheckCircle2 className="w-5 h-5" />,
    ring: "ring-1 ring-green-600/30",
    role: "status",
  },
  error: {
    border: "border-red-600/30",
    bg: "bg-[#1e1010]",
    text: "text-red-200",
    icon: <XCircle className="w-5 h-5" />,
    ring: "ring-1 ring-red-600/30",
    role: "alert",
  },
  warning: {
    border: "border-amber-500/30",
    bg: "bg-[#211b0f]",
    text: "text-amber-200",
    icon: <AlertTriangle className="w-5 h-5" />,
    ring: "ring-1 ring-amber-500/30",
    role: "alert",
  },
  info: {
    border: "border-white/10",
    bg: "bg-[#121212]",
    text: "text-gray-200",
    icon: <Info className="w-5 h-5" />,
    ring: "ring-1 ring-white/15",
    role: "status",
  },
};

function useAutoDismiss(open: boolean, duration: number | undefined, onClose?: () => void) {
  React.useEffect(() => {
    if (!open || !duration) return;
    const t = window.setTimeout(() => onClose?.(), duration);
    return () => window.clearTimeout(t);
  }, [open, duration, onClose]);
}

export function Notification({
  open,
  onOpenChange,
  title,
  description,
  variant = "info",
  duration = 3000,
  icon,
  actions,
  placement = "top-right",
  closable = true,
  className = "",
}: NotificationProps) {
  const vs = variantStyles[variant];

  // Create a dedicated portal host on the client
  const host = React.useMemo(() => {
    if (typeof document === "undefined") return null;
    const el = document.createElement("div");
    document.body.appendChild(el);
    return el;
  }, []);

  const close = React.useCallback(() => onOpenChange?.(false), [onOpenChange]);

  useAutoDismiss(open, duration, close);

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!open) return;
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  React.useEffect(() => () => {
    if (host && host.parentNode) host.parentNode.removeChild(host);
  }, [host]);

  if (!host) return null;

  return createPortal(
    <div
      className={`pointer-events-none fixed z-[1000] ${placements[placement]} transition-all duration-200`}
      aria-live={vs.role === "alert" ? "assertive" : "polite"}
    >
      <div
        role={vs.role}
        className={[
          "pointer-events-auto min-w-[280px] max-w-[420px] rounded-2xl border shadow-xl",
          "backdrop-blur-sm px-4 py-3 flex items-start gap-3",
          vs.bg,
          vs.border,
          vs.ring,
          className,
          open ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2",
          "transition-all duration-200",
        ].join(" ")}
      >
        <div className={`shrink-0 mt-0.5 ${vs.text}`}>{icon ?? vs.icon}</div>
        <div className="flex-1">
          {title && <div className="text-sm font-semibold leading-5">{title}</div>}
          {description && (
            <div className="text-xs leading-5 text-gray-300 mt-0.5">{description}</div>
          )}
          {actions && <div className="mt-2 flex items-center gap-2">{actions}</div>}
        </div>
        {closable && (
          <button
            onClick={close}
            className="ml-2 inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/10 text-xs text-gray-300 hover:bg-white/5"
            aria-label="Close notification"
          >
            ×
          </button>
        )}
      </div>
    </div>,
    host
  );
}

/**
 * Fire-and-forget helper (no `require`).
 * Usage:
 *   const notify = useNotify();
 *   notify({ title: 'Saved', description: 'All set!', variant: 'success' });
 */
export function useNotify() {
  return React.useCallback((opts: Omit<NotificationProps, "open" | "onOpenChange">) => {
    if (typeof document === "undefined") return;
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);

    function destroy() {
      root.unmount();
      if (host.parentNode) host.parentNode.removeChild(host);
    }

    function OneShot() {
      const [open, setOpen] = React.useState(true);
      React.useEffect(() => { if (!open) destroy(); }, [open]);
      return (
        <Notification
          open={open}
          onOpenChange={setOpen}
          {...opts}
        />
      );
    }

    root.render(<OneShot />);
  }, []);
}
