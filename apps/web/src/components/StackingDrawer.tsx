import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  type ReactNode,
  type CSSProperties,
} from "react";
import Icon from "./Icon";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DrawerType =
  | "block"
  | "tool"
  | "signal"
  | "failure-mode"
  | "response-pattern"
  | "copilot"
  | "custom";

type DrawerConfig = {
  id: string;
  type: DrawerType;
  title: string;
  subtitle?: string;
  code?: string;
  width?: number;
  content: ReactNode;
};

type DrawerContextValue = {
  drawers: DrawerConfig[];
  openDrawer: (config: DrawerConfig) => void;
  closeDrawer: (id: string) => void;
  closeRightmost: () => void;
  closeAll: () => void;
  isOpen: (id: string) => boolean;
  resizeCopilot: (width: number) => void;
  /** Fires when the drawer system needs the sidebar collapsed to fit. */
  onSidebarAutoCollapse?: () => void;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_DRAWER_WIDTH = 380;
const MIN_DRAWER_WIDTH = 180;
const CANVAS_MIN_WIDTH = 300;
const MAX_CONTENT_DRAWERS = 3;
const MAX_TOTAL_DRAWERS = 4; // 3 content + 1 copilot
const COPILOT_MAX_VP_RATIO = 0.7;

const ANIM_OPEN = "260ms cubic-bezier(0.22, 1, 0.36, 1)";
const ANIM_CLOSE = "200ms ease";
const ANIM_COMPRESS = "260ms ease";

const TYPE_BORDER_COLORS: Record<DrawerType, string> = {
  block: "var(--color-accent)",
  tool: "var(--sky)",
  signal: "var(--color-success)",
  "failure-mode": "var(--color-danger)",
  "response-pattern": "var(--color-warning)",
  copilot: "transparent", // uses gradient via separate style
  custom: "var(--color-text-muted)",
};

const TYPE_BADGE_BG: Record<DrawerType, string> = {
  block: "var(--color-accent-soft)",
  tool: "var(--color-accent-soft)",
  signal: "var(--color-success-soft)",
  "failure-mode": "var(--color-danger-soft)",
  "response-pattern": "var(--color-warning-soft)",
  copilot: "var(--color-accent-soft)",
  custom: "var(--color-surface-subtle)",
};

const TYPE_BADGE_TEXT: Record<DrawerType, string> = {
  block: "var(--color-accent)",
  tool: "var(--sky)",
  signal: "var(--color-success)",
  "failure-mode": "var(--color-danger)",
  "response-pattern": "var(--color-warning)",
  copilot: "var(--color-accent)",
  custom: "var(--color-text-secondary)",
};

const TYPE_LABELS: Record<DrawerType, string> = {
  block: "Block",
  tool: "Tool",
  signal: "Signal",
  "failure-mode": "Failure Mode",
  "response-pattern": "Response Pattern",
  copilot: "Copilot",
  custom: "Custom",
};

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const DrawerContext = createContext<DrawerContextValue>({
  drawers: [],
  openDrawer: () => {},
  closeDrawer: () => {},
  closeRightmost: () => {},
  closeAll: () => {},
  isOpen: () => false,
  resizeCopilot: () => {},
});

export { DrawerContext };

export function useDrawers(): DrawerContextValue {
  return useContext(DrawerContext);
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

type DrawerProviderProps = {
  children: ReactNode;
  /** Called when drawers need more room and the sidebar should collapse. */
  onSidebarAutoCollapse?: () => void;
  /** Current sidebar width in px so width math can account for it. 0 = collapsed. */
  sidebarWidth?: number;
};

export function DrawerProvider({
  children,
  onSidebarAutoCollapse,
  sidebarWidth = 0,
}: DrawerProviderProps): JSX.Element {
  const [drawers, setDrawers] = useState<DrawerConfig[]>([]);
  const [copilotWidth, setCopilotWidth] = useState<number>(DEFAULT_DRAWER_WIDTH);

  const openDrawer = useCallback(
    (config: DrawerConfig) => {
      setDrawers((prev) => {
        // If already open, bring to front (remove + re-add)
        const filtered = prev.filter((d) => d.id !== config.id);

        const isCopilot = config.type === "copilot";
        const contentCount = filtered.filter((d) => d.type !== "copilot").length;
        const hasCopilot = filtered.some((d) => d.type === "copilot");

        // Enforce max limits
        if (isCopilot && hasCopilot) {
          // Replace existing copilot
          const withoutCopilot = filtered.filter((d) => d.type !== "copilot");
          return [...withoutCopilot, config];
        }

        if (!isCopilot && contentCount >= MAX_CONTENT_DRAWERS) {
          // Remove oldest non-copilot to make room
          const idx = filtered.findIndex((d) => d.type !== "copilot");
          if (idx !== -1) {
            filtered.splice(idx, 1);
          }
        }

        if (filtered.length >= MAX_TOTAL_DRAWERS) {
          // Remove oldest non-copilot
          const idx = filtered.findIndex((d) => d.type !== "copilot");
          if (idx !== -1) {
            filtered.splice(idx, 1);
          }
        }

        return [...filtered, config];
      });
    },
    [],
  );

  const closeDrawer = useCallback((id: string) => {
    setDrawers((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const closeRightmost = useCallback(() => {
    setDrawers((prev) => (prev.length > 0 ? prev.slice(0, -1) : prev));
  }, []);

  const closeAll = useCallback(() => {
    setDrawers([]);
  }, []);

  const isOpen = useCallback(
    (id: string) => drawers.some((d) => d.id === id),
    [drawers],
  );

  const resizeCopilot = useCallback((width: number) => {
    const maxWidth = window.innerWidth * COPILOT_MAX_VP_RATIO;
    setCopilotWidth(Math.max(MIN_DRAWER_WIDTH, Math.min(width, maxWidth)));
  }, []);

  // Check space constraints when drawers change
  useEffect(() => {
    if (drawers.length === 0) return;

    const viewportWidth = window.innerWidth;
    const totalDrawerWidth = drawers.reduce((sum, d) => {
      if (d.type === "copilot") return sum + copilotWidth;
      return sum + (d.width ?? DEFAULT_DRAWER_WIDTH);
    }, 0);

    const remainingForCanvas = viewportWidth - sidebarWidth - totalDrawerWidth;

    if (remainingForCanvas < CANVAS_MIN_WIDTH && sidebarWidth > 0) {
      onSidebarAutoCollapse?.();
    }
  }, [drawers, copilotWidth, sidebarWidth, onSidebarAutoCollapse]);

  // Auto-close oldest non-copilot if still too tight (after sidebar collapse)
  useEffect(() => {
    if (drawers.length === 0) return;

    const viewportWidth = window.innerWidth;
    const totalDrawerWidth = drawers.reduce((sum, d) => {
      if (d.type === "copilot") return sum + copilotWidth;
      return sum + (d.width ?? DEFAULT_DRAWER_WIDTH);
    }, 0);

    const effectiveSidebar = sidebarWidth; // caller should set to 0 after collapse
    const remainingForCanvas = viewportWidth - effectiveSidebar - totalDrawerWidth;

    if (remainingForCanvas < CANVAS_MIN_WIDTH) {
      // Close oldest non-copilot
      setDrawers((prev) => {
        const idx = prev.findIndex((d) => d.type !== "copilot");
        if (idx === -1) return prev;
        return [...prev.slice(0, idx), ...prev.slice(idx + 1)];
      });
    }
  }, [drawers.length, copilotWidth, sidebarWidth]);

  const value = useMemo<DrawerContextValue>(
    () => ({
      drawers,
      openDrawer,
      closeDrawer,
      closeRightmost,
      closeAll,
      isOpen,
      resizeCopilot,
      onSidebarAutoCollapse,
    }),
    [drawers, openDrawer, closeDrawer, closeRightmost, closeAll, isOpen, resizeCopilot, onSidebarAutoCollapse],
  );

  return (
    <DrawerContext.Provider value={value}>{children}</DrawerContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Width computation
// ---------------------------------------------------------------------------

function computeDrawerWidths(
  drawers: DrawerConfig[],
  copilotWidth: number,
  viewportWidth: number,
  sidebarWidth: number,
): number[] {
  if (drawers.length === 0) return [];

  const availableWidth = viewportWidth - sidebarWidth - CANVAS_MIN_WIDTH;

  // Desired widths
  const desired = drawers.map((d) => {
    if (d.type === "copilot") return copilotWidth;
    return d.width ?? DEFAULT_DRAWER_WIDTH;
  });

  const totalDesired = desired.reduce((a, b) => a + b, 0);

  if (totalDesired <= availableWidth) {
    return desired;
  }

  // Compress from left (oldest) first, keeping minimums
  const result = [...desired];
  let excess = totalDesired - availableWidth;

  for (let i = 0; i < result.length && excess > 0; i++) {
    const canShrink = result[i] - MIN_DRAWER_WIDTH;
    if (canShrink > 0) {
      const shrink = Math.min(canShrink, excess);
      result[i] -= shrink;
      excess -= shrink;
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// StackingDrawerHost
// ---------------------------------------------------------------------------

export function StackingDrawerHost({
  sidebarWidth = 0,
}: {
  sidebarWidth?: number;
}): JSX.Element {
  const { drawers, closeDrawer, closeRightmost, resizeCopilot } = useDrawers();
  const [copilotWidth, setCopilotWidthLocal] = useState(DEFAULT_DRAWER_WIDTH);
  const [isDragging, setIsDragging] = useState(false);
  const [closingId, setClosingId] = useState<string | null>(null);
  const hostRef = useRef<HTMLDivElement>(null);

  // Sync copilot width from context resize calls
  const handleResizeCopilot = useCallback(
    (w: number) => {
      setCopilotWidthLocal(w);
      resizeCopilot(w);
    },
    [resizeCopilot],
  );

  // Keyboard: Escape closes rightmost
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && drawers.length > 0) {
        closeRightmost();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [drawers.length, closeRightmost]);

  // Copilot resize drag handling
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(0);

  const onDragStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);
      dragStartX.current = e.clientX;
      dragStartWidth.current = copilotWidth;
    },
    [copilotWidth],
  );

  useEffect(() => {
    if (!isDragging) return;

    const onMove = (e: MouseEvent) => {
      // Dragging left edge means: moving cursor left => increase width
      const delta = dragStartX.current - e.clientX;
      const newWidth = dragStartWidth.current + delta;
      const maxWidth = window.innerWidth * COPILOT_MAX_VP_RATIO;
      setCopilotWidthLocal(Math.max(MIN_DRAWER_WIDTH, Math.min(newWidth, maxWidth)));
    };

    const onUp = () => {
      setIsDragging(false);
      handleResizeCopilot(copilotWidth);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [isDragging, copilotWidth, handleResizeCopilot]);

  const widths = useMemo(
    () =>
      computeDrawerWidths(
        drawers,
        copilotWidth,
        typeof window !== "undefined" ? window.innerWidth : 1400,
        sidebarWidth,
      ),
    [drawers, copilotWidth, sidebarWidth],
  );

  // Recalculate on resize
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    const handler = () => forceUpdate((n) => n + 1);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const handleClose = useCallback(
    (id: string) => {
      setClosingId(id);
      setTimeout(() => {
        closeDrawer(id);
        setClosingId(null);
      }, 200);
    },
    [closeDrawer],
  );

  if (drawers.length === 0) return <></>;

  const hostStyle: CSSProperties = {
    display: "flex",
    flexDirection: "row",
    height: "100%",
    position: "relative",
    flexShrink: 0,
  };

  return (
    <div ref={hostRef} style={hostStyle} data-stacking-drawer-host>
      {drawers.map((drawer, index) => {
        const isClosing = closingId === drawer.id;
        const isCompressed = widths[index] <= MIN_DRAWER_WIDTH;
        const isCopilot = drawer.type === "copilot";

        return (
          <DrawerPanel
            key={drawer.id}
            drawer={drawer}
            width={widths[index]}
            isCompressed={isCompressed}
            isClosing={isClosing}
            isDragging={isDragging && isCopilot}
            isCopilot={isCopilot}
            onClose={() => handleClose(drawer.id)}
            onExpand={() => {
              /* Expanding a compressed drawer could close the oldest to reclaim space.
                 For now, we just open it again to bring it to the front. */
            }}
            onResizeStart={isCopilot ? onDragStart : undefined}
          />
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// DrawerPanel (internal)
// ---------------------------------------------------------------------------

type DrawerPanelProps = {
  drawer: DrawerConfig;
  width: number;
  isCompressed: boolean;
  isClosing: boolean;
  isDragging: boolean;
  isCopilot: boolean;
  onClose: () => void;
  onExpand: () => void;
  onResizeStart?: (e: React.MouseEvent) => void;
};

function DrawerPanel({
  drawer,
  width,
  isCompressed,
  isClosing,
  isDragging,
  isCopilot,
  onClose,
  onExpand,
  onResizeStart,
}: DrawerPanelProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Trigger entrance animation on next frame
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const borderColor = TYPE_BORDER_COLORS[drawer.type];

  const leftBorderStyle: CSSProperties = isCopilot
    ? {
        position: "absolute",
        top: 0,
        left: 0,
        bottom: 0,
        width: 4,
        background: "linear-gradient(180deg, var(--color-accent), var(--lavender))",
        borderRadius: "2px 0 0 2px",
      }
    : {
        position: "absolute",
        top: 0,
        left: 0,
        bottom: 0,
        width: 4,
        backgroundColor: borderColor,
        borderRadius: "2px 0 0 2px",
      };

  const panelTransition = isDragging
    ? "none"
    : isClosing
      ? `transform ${ANIM_CLOSE}, opacity ${ANIM_CLOSE}`
      : `width ${ANIM_COMPRESS}, transform ${ANIM_OPEN}, opacity ${ANIM_OPEN}`;

  const panelStyle: CSSProperties = {
    position: "relative",
    width,
    minWidth: MIN_DRAWER_WIDTH,
    height: "100%",
    backgroundColor: "var(--color-surface)",
    boxShadow: "-4px 0 12px rgba(0,0,0,0.06)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    flexShrink: 0,
    transition: panelTransition,
    transform: !mounted || isClosing ? "translateX(100%)" : "translateX(0)",
    opacity: !mounted || isClosing ? 0 : 1,
  };

  return (
    <div style={panelStyle} data-drawer-id={drawer.id} data-drawer-type={drawer.type}>
      {/* Colored left border */}
      <div style={leftBorderStyle} />

      {/* Copilot resize handle */}
      {isCopilot && onResizeStart && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            bottom: 0,
            width: 8,
            cursor: "col-resize",
            zIndex: 10,
          }}
          onMouseDown={onResizeStart}
        />
      )}

      {/* Header */}
      <DrawerHeader
        drawer={drawer}
        isCompressed={isCompressed}
        onClose={onClose}
        onExpand={onExpand}
      />

      {/* Content */}
      {!isCompressed ? (
        <div
          style={{
            flex: 1,
            overflow: "auto",
            padding: 20,
          }}
        >
          {drawer.content}
        </div>
      ) : (
        <CompressedBody onExpand={onExpand} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// DrawerHeader (internal)
// ---------------------------------------------------------------------------

function DrawerHeader({
  drawer,
  isCompressed,
  onClose,
  onExpand,
}: {
  drawer: DrawerConfig;
  isCompressed: boolean;
  onClose: () => void;
  onExpand: () => void;
}) {
  const headerStyle: CSSProperties = {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    padding: isCompressed ? "12px 8px 12px 12px" : "16px 16px 12px 20px",
    borderBottom: "1px solid var(--color-border-subtle)",
    gap: 8,
    flexShrink: 0,
  };

  const codeStyle: CSSProperties = {
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: "var(--text-eyebrow)",
    color: "var(--color-text-muted)",
    lineHeight: "1.2",
    marginBottom: 2,
  };

  const titleStyle: CSSProperties = {
    fontSize: isCompressed ? "var(--text-small)" : "var(--text-section)",
    fontWeight: 600,
    color: "var(--color-text-primary)",
    lineHeight: "1.25",
    margin: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: isCompressed ? "nowrap" : undefined,
  };

  const badgeStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: "2px 8px",
    borderRadius: "var(--radius-full)",
    fontSize: "var(--text-eyebrow)",
    fontWeight: 500,
    lineHeight: "1.4",
    backgroundColor: TYPE_BADGE_BG[drawer.type],
    color: TYPE_BADGE_TEXT[drawer.type],
    whiteSpace: "nowrap",
    marginTop: 4,
  };

  const closeBtnStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 28,
    height: 28,
    border: "none",
    background: "transparent",
    borderRadius: "var(--radius-sm)",
    cursor: "pointer",
    color: "var(--color-text-muted)",
    flexShrink: 0,
    transition: "background 120ms ease, color 120ms ease",
  };

  return (
    <div style={headerStyle}>
      <div style={{ flex: 1, minWidth: 0 }}>
        {drawer.code && <div style={codeStyle}>{drawer.code}</div>}
        <h3 style={titleStyle}>{drawer.title}</h3>
        {drawer.subtitle && !isCompressed && (
          <div style={{ fontSize: "var(--text-small)", color: "var(--color-text-secondary)", marginTop: 2, lineHeight: "1.4" }}>
            {drawer.subtitle}
          </div>
        )}
        {!isCompressed && <div style={badgeStyle}>{TYPE_LABELS[drawer.type]}</div>}
      </div>
      <button
        style={closeBtnStyle}
        onClick={onClose}
        aria-label="Close drawer"
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "var(--color-surface-subtle)";
          e.currentTarget.style.color = "var(--color-text-primary)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = "var(--color-text-muted)";
        }}
      >
        <Icon name="close" size={14} />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CompressedBody (internal)
// ---------------------------------------------------------------------------

function CompressedBody({ onExpand }: { onExpand: () => void }) {
  const btnStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    margin: "12px 8px",
    padding: "8px 12px",
    border: "1px solid var(--color-border-subtle)",
    borderRadius: "var(--radius-sm)",
    background: "var(--color-surface-subtle)",
    cursor: "pointer",
    fontSize: "var(--text-small)",
    fontWeight: 500,
    color: "var(--color-text-secondary)",
    transition: "background 120ms ease, border-color 120ms ease",
    width: "calc(100% - 16px)",
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
      <button
        style={btnStyle}
        onClick={onExpand}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "var(--color-surface-subtle)";
          e.currentTarget.style.borderColor = "var(--color-border-strong)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "var(--color-surface-subtle)";
          e.currentTarget.style.borderColor = "var(--color-border-subtle)";
        }}
      >
        <Icon name="add" size={12} />
        Expand
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// OntologyLink
// ---------------------------------------------------------------------------

type OntologyLinkProps = {
  type: "block" | "tool" | "signal" | "failure-mode" | "response-pattern";
  code: string;
  label: string;
  onClick?: () => void;
};

export function OntologyLink({ type, code, label, onClick }: OntologyLinkProps): JSX.Element {
  const { openDrawer, isOpen } = useDrawers();
  const active = isOpen(code);

  const bgColors: Record<OntologyLinkProps["type"], string> = {
    block: "var(--color-accent-soft)",
    tool: "var(--color-accent-soft)",
    signal: "var(--color-success-soft)",
    "failure-mode": "var(--color-danger-soft)",
    "response-pattern": "var(--color-warning-soft)",
  };

  const textColors: Record<OntologyLinkProps["type"], string> = {
    block: "var(--color-accent)",
    tool: "var(--sky)",
    signal: "var(--color-success)",
    "failure-mode": "var(--color-danger)",
    "response-pattern": "var(--color-warning)",
  };

  const hoverBgColors: Record<OntologyLinkProps["type"], string> = {
    block: "var(--color-accent-soft)",
    tool: "var(--color-accent-soft)",
    signal: "var(--color-success-soft)",
    "failure-mode": "var(--color-danger-soft)",
    "response-pattern": "var(--color-warning-soft)",
  };

  const solidBgColors: Record<OntologyLinkProps["type"], string> = {
    block: "var(--color-accent)",
    tool: "var(--sky)",
    signal: "var(--color-success)",
    "failure-mode": "var(--color-danger)",
    "response-pattern": "var(--color-warning)",
  };

  const handleClick = () => {
    if (onClick) {
      onClick();
      return;
    }
    // Default: open a drawer with the code as id.
    // The content is left empty because the caller should provide a proper
    // drawer config via onClick or populate content externally.
    openDrawer({
      id: code,
      type,
      title: label,
      code,
      content: null,
    });
  };

  const pillStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    padding: "2px 10px",
    borderRadius: "var(--radius-full)",
    fontSize: "var(--text-small)",
    fontWeight: 500,
    lineHeight: "1.6",
    cursor: "pointer",
    border: "none",
    background: active ? solidBgColors[type] : bgColors[type],
    color: active ? "var(--color-surface)" : textColors[type],
    fontFamily: "inherit",
    transition: "background 120ms ease, color 120ms ease",
    verticalAlign: "middle",
  };

  return (
    <button
      style={pillStyle}
      onClick={handleClick}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.background = hoverBgColors[type];
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.background = bgColors[type];
        }
      }}
    >
      <span
        style={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: "var(--text-eyebrow)",
          opacity: 0.8,
        }}
      >
        {code}
      </span>
      {label}
    </button>
  );
}
