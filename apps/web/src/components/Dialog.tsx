import React from "react";

/* ─── Types ─────────────────────────────────────────────────── */

type DialogVariant = "standard" | "destructive" | "success" | "info" | "input";

type DialogProps = {
  open: boolean;
  onClose: () => void;
  variant?: DialogVariant;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: (inputValue?: string) => void;
  inputPlaceholder?: string;
  inputRequired?: boolean;
};

/* ─── Constants ─────────────────────────────────────────────── */

const VARIANT_COLORS: Record<DialogVariant, string> = {
  standard: "#F59E0B",
  destructive: "#EF4444",
  success: "#10B981",
  info: "#6366F1",
  input: "#6C5CE7",
};

/* ─── Icons per variant ─────────────────────────────────────── */

function DialogIcon({ variant }: { variant: DialogVariant }) {
  const color = VARIANT_COLORS[variant];
  const size = 24;

  const circleStyle: React.CSSProperties = {
    width: 48,
    height: 48,
    borderRadius: "50%",
    backgroundColor: color + "18",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 16px",
    flexShrink: 0,
  };

  const svgProps = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
  };

  let path: React.ReactNode;

  switch (variant) {
    case "standard":
      // Warning triangle
      path = (
        <>
          <path
            d="M12 2L1 21h22L12 2z"
            stroke={color}
            strokeWidth="2"
            strokeLinejoin="round"
            fill="none"
          />
          <path d="M12 10v4" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <circle cx="12" cy="17" r="1" fill={color} />
        </>
      );
      break;
    case "destructive":
      // Trash can
      path = (
        <>
          <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <path d="M5 6v14a2 2 0 002 2h10a2 2 0 002-2V6" stroke={color} strokeWidth="2" />
          <path d="M10 11v5M14 11v5" stroke={color} strokeWidth="2" strokeLinecap="round" />
        </>
      );
      break;
    case "success":
      // Checkmark
      path = (
        <path
          d="M6 12l4 4 8-8"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
      break;
    case "info":
      // Info i
      path = (
        <>
          <circle cx="12" cy="7" r="1.2" fill={color} />
          <path d="M12 11v6" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
        </>
      );
      break;
    case "input":
      // Pencil
      path = (
        <path
          d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z"
          stroke={color}
          strokeWidth="2"
          strokeLinejoin="round"
        />
      );
      break;
  }

  return (
    <div style={circleStyle}>
      <svg {...svgProps}>{path}</svg>
    </div>
  );
}

/* ─── Keyframe Injection ────────────────────────────────────── */

let stylesInjected = false;

function injectDialogStyles() {
  if (stylesInjected) return;
  stylesInjected = true;

  const css = `
@keyframes dialog-backdrop-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes dialog-backdrop-out {
  from { opacity: 1; }
  to   { opacity: 0; }
}
@keyframes dialog-panel-in {
  from { transform: scale(0.95); opacity: 0; }
  to   { transform: scale(1);    opacity: 1; }
}
@keyframes dialog-panel-out {
  from { transform: scale(1);    opacity: 1; }
  to   { transform: scale(0.95); opacity: 0; }
}`;

  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);
}

/* ─── Focus Trap Hook ───────────────────────────────────────── */

function useFocusTrap(ref: React.RefObject<HTMLDivElement | null>, active: boolean) {
  React.useEffect(() => {
    if (!active || !ref.current) return;

    const el = ref.current;
    const focusable = el.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    // Focus first focusable element on open
    first.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== "Tab") return;
      if (focusable.length === 0) return;

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    el.addEventListener("keydown", handleKeyDown);
    return () => el.removeEventListener("keydown", handleKeyDown);
  }, [active, ref]);
}

/* ─── Dialog Component ──────────────────────────────────────── */

export function Dialog({
  open,
  onClose,
  variant = "standard",
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  inputPlaceholder,
  inputRequired = false,
}: DialogProps) {
  const [inputValue, setInputValue] = React.useState("");
  const [exiting, setExiting] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const panelRef = React.useRef<HTMLDivElement | null>(null);

  const color = VARIANT_COLORS[variant];
  const isDestructive = variant === "destructive";
  const isInput = variant === "input";

  React.useEffect(() => {
    injectDialogStyles();
  }, []);

  // Manage mount/unmount for exit animation
  React.useEffect(() => {
    if (open) {
      setMounted(true);
      setExiting(false);
      setInputValue("");
    } else if (mounted) {
      setExiting(true);
      const timer = setTimeout(() => {
        setMounted(false);
        setExiting(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Escape key
  React.useEffect(() => {
    if (!mounted) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        handleClose();
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [mounted, inputValue]);

  useFocusTrap(panelRef, mounted && !exiting);

  function handleClose() {
    if (isInput && inputRequired && !inputValue.trim()) return;
    onClose();
  }

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  }

  function handleConfirm() {
    if (isInput && inputRequired && !inputValue.trim()) return;
    onConfirm(isInput ? inputValue : undefined);
  }

  if (!mounted) return null;

  const backdropStyle: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    zIndex: 150,
    backgroundColor: "rgba(0,0,0,0.4)",
    backdropFilter: "blur(4px)",
    WebkitBackdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    animation: exiting
      ? "dialog-backdrop-out 200ms ease-in forwards"
      : "dialog-backdrop-in 200ms ease-out forwards",
  };

  const panelStyle: React.CSSProperties = {
    backgroundColor: "#fff",
    borderRadius: 16,
    boxShadow: "0 20px 60px rgba(0,0,0,0.15), 0 4px 16px rgba(0,0,0,0.08)",
    maxWidth: 420,
    width: "100%",
    padding: 32,
    animation: exiting
      ? "dialog-panel-out 200ms ease-in forwards"
      : "dialog-panel-in 200ms ease-out forwards",
    outline: "none",
  };

  const confirmBtnStyle: React.CSSProperties = {
    height: 36,
    borderRadius: 8,
    border: "none",
    padding: "0 20px",
    fontSize: 14,
    fontWeight: 600,
    cursor:
      isInput && inputRequired && !inputValue.trim() ? "not-allowed" : "pointer",
    color: "#fff",
    backgroundColor: isDestructive ? "#EF4444" : color,
    opacity: isInput && inputRequired && !inputValue.trim() ? 0.5 : 1,
    transition: "opacity 150ms, background-color 150ms",
    lineHeight: "36px",
  };

  const cancelBtnStyle: React.CSSProperties = {
    height: 36,
    borderRadius: 8,
    border: "1px solid #e5e7eb",
    padding: "0 20px",
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
    color: "#374151",
    backgroundColor: "#fff",
    lineHeight: "36px",
    transition: "background-color 150ms",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    height: 44,
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    padding: "0 14px",
    fontSize: 15,
    color: "#1a1a1a",
    outline: "none",
    boxSizing: "border-box",
    marginTop: 16,
    transition: "border-color 150ms",
  };

  return (
    <div style={backdropStyle} onClick={handleBackdropClick}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        style={panelStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <DialogIcon variant={variant} />

        <h2
          id="dialog-title"
          style={{
            fontSize: 20,
            fontWeight: 600,
            color: "#1a1a1a",
            textAlign: "center",
            margin: 0,
            lineHeight: "28px",
          }}
        >
          {title}
        </h2>

        {description && (
          <p
            style={{
              fontSize: 15,
              color: "#6b7280",
              textAlign: "center",
              margin: "8px 0 0",
              lineHeight: "22px",
            }}
          >
            {description}
          </p>
        )}

        {isInput && (
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={inputPlaceholder}
            style={inputStyle}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = color;
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "#e5e7eb";
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleConfirm();
            }}
          />
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 12,
            marginTop: 24,
          }}
        >
          <button
            style={cancelBtnStyle}
            onClick={onClose}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#f9fafb";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#fff";
            }}
          >
            {cancelLabel}
          </button>
          <button
            style={confirmBtnStyle}
            onClick={handleConfirm}
            disabled={isInput && inputRequired && !inputValue.trim()}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
