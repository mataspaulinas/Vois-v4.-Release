import React from "react";
import Icon from "./Icon";

/* ─── Types ─────────────────────────────────────────────────── */

type ToastType = "success" | "error" | "warning" | "info";

type Toast = {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  autoDismiss?: boolean;
  duration?: number;
};

type ToastContextValue = {
  toast: (t: Omit<Toast, "id">) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
};

/* ─── Constants ─────────────────────────────────────────────── */

const COLORS: Record<ToastType, string> = {
  success: "var(--color-success)",
  error: "var(--color-danger)",
  warning: "var(--color-warning)",
  info: "var(--color-info)",
};

const DEFAULT_DURATION = 5000;

/* ─── Context ───────────────────────────────────────────────── */

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a <ToastProvider>");
  }
  return ctx;
}

/* ─── Icons (inline SVG paths) ──────────────────────────────── */

function ToastIcon({ type }: { type: ToastType }) {
  const color = COLORS[type];
  const size = 20;
  const iconStyle: React.CSSProperties = {
    width: size,
    height: size,
    flexShrink: 0,
  };

  const circleStyle: React.CSSProperties = {
    width: 32,
    height: 32,
    borderRadius: "50%",
    backgroundColor: color + "18",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  };

  const svgProps = {
    width: size,
    height: size,
    viewBox: "0 0 20 20",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    style: iconStyle,
  };

  let path: React.ReactNode;

  switch (type) {
    case "success":
      path = (
        <path
          d="M6 10l3 3 5-6"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
      break;
    case "error":
      path = (
        <>
          <path d="M6 6l8 8M14 6l-8 8" stroke={color} strokeWidth="2" strokeLinecap="round" />
        </>
      );
      break;
    case "warning":
      path = (
        <>
          <path d="M10 6v4" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <circle cx="10" cy="13" r="1" fill={color} />
        </>
      );
      break;
    case "info":
      path = (
        <>
          <circle cx="10" cy="6" r="1" fill={color} />
          <path d="M10 9v5" stroke={color} strokeWidth="2" strokeLinecap="round" />
        </>
      );
      break;
  }

  return (
    <div style={circleStyle}>
      <svg {...svgProps}>{path}</svg>
    </div>
  );
}

/* ─── Progress Bar ──────────────────────────────────────────── */

function ProgressBar({ duration, color, onComplete }: { duration: number; color: string; onComplete: () => void }) {
  const [progress, setProgress] = React.useState(100);
  const startRef = React.useRef(Date.now());
  const frameRef = React.useRef<number>(0);

  React.useEffect(() => {
    startRef.current = Date.now();

    const tick = () => {
      const elapsed = Date.now() - startRef.current;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      if (remaining <= 0) {
        onComplete();
        return;
      }
      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [duration, onComplete]);

  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: 3,
        backgroundColor: color + "20",
        borderRadius: "0 0 12px 12px",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${progress}%`,
          backgroundColor: color,
          transition: "width 60ms linear",
          borderRadius: "0 0 0 12px",
        }}
      />
    </div>
  );
}

/* ─── Single Toast Item ─────────────────────────────────────── */

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const [exiting, setExiting] = React.useState(false);
  const color = COLORS[toast.type];

  const shouldAutoDismiss = toast.autoDismiss ?? toast.type !== "error";
  const duration = toast.duration ?? DEFAULT_DURATION;

  const handleDismiss = React.useCallback(() => {
    setExiting(true);
    setTimeout(() => onDismiss(toast.id), 200);
  }, [onDismiss, toast.id]);

  const containerStyle: React.CSSProperties = {
    position: "relative",
    width: 360,
    backgroundColor: "var(--color-surface)",
    borderRadius: "var(--radius-md)",
    boxShadow: "0 4px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06)",
    borderLeft: `4px solid ${color}`,
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
    padding: "14px 16px",
    overflow: "hidden",
    animation: exiting
      ? "toast-slide-out 200ms ease-in forwards"
      : "toast-slide-in 250ms ease-out forwards",
  };

  return (
    <div style={containerStyle}>
      <ToastIcon type={toast.type} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "var(--text-body)", fontWeight: 600, color: "var(--color-text-primary)", lineHeight: "20px" }}>
          {toast.title}
        </div>
        {toast.description && (
          <div style={{ fontSize: "var(--text-small)", color: "var(--color-text-muted)", lineHeight: "18px", marginTop: 2 }}>
            {toast.description}
          </div>
        )}
        {toast.actionLabel && toast.onAction && (
          <button
            onClick={toast.onAction}
            style={{
              marginTop: 6,
              padding: 0,
              border: "none",
              background: "none",
              color,
              fontSize: "var(--text-small)",
              fontWeight: 600,
              cursor: "pointer",
              lineHeight: "18px",
            }}
          >
            {toast.actionLabel}
          </button>
        )}
      </div>

      <button
        onClick={handleDismiss}
        aria-label="Dismiss"
        style={{
          flexShrink: 0,
          width: 24,
          height: 24,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "none",
          background: "none",
          color: "var(--color-text-muted)",
          cursor: "pointer",
          borderRadius: "var(--radius-sm)",
          padding: 0,
          fontSize: 16,
          lineHeight: 1,
        }}
      >
        <Icon name="close" size={14} />
      </button>

      {shouldAutoDismiss && (
        <ProgressBar duration={duration} color={color} onComplete={handleDismiss} />
      )}
    </div>
  );
}

/* ─── Keyframe Injection ────────────────────────────────────── */

let stylesInjected = false;

function injectToastStyles() {
  if (stylesInjected) return;
  stylesInjected = true;

  const css = `
@keyframes toast-slide-in {
  from { transform: translateX(100%); opacity: 0; }
  to   { transform: translateX(0);    opacity: 1; }
}
@keyframes toast-slide-out {
  from { transform: translateX(0);    opacity: 1; }
  to   { transform: translateX(100%); opacity: 0; }
}`;

  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);
}

/* ─── Provider ──────────────────────────────────────────────── */

let toastCounter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  React.useEffect(() => {
    injectToastStyles();
  }, []);

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const dismissAll = React.useCallback(() => {
    setToasts([]);
  }, []);

  const toast = React.useCallback((t: Omit<Toast, "id">): string => {
    const id = `toast-${++toastCounter}-${Date.now()}`;
    const newToast: Toast = { ...t, id };
    setToasts((prev) => [newToast, ...prev]);
    return id;
  }, []);

  const contextValue = React.useMemo<ToastContextValue>(
    () => ({ toast, dismiss, dismissAll }),
    [toast, dismiss, dismissAll],
  );

  const containerStyle: React.CSSProperties = {
    position: "fixed",
    top: 16,
    right: 16,
    zIndex: 140,
    display: "flex",
    flexDirection: "column",
    gap: 12,
    pointerEvents: "none",
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {toasts.length > 0 && (
        <div style={containerStyle}>
          {toasts.map((t) => (
            <div key={t.id} style={{ pointerEvents: "auto" }}>
              <ToastItem toast={t} onDismiss={dismiss} />
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}
