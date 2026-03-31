import React from "react";
import Icon from "./Icon";

/* ─── Types ─────────────────────────────────────────────────── */

type CommandItem = {
  id: string;
  label: string;
  description?: string;
  group: string;
  shortcut?: string;
  icon?: string;
  onSelect: () => void;
};

type CommandPaletteProps = {
  open: boolean;
  onClose: () => void;
  items: CommandItem[];
  onAskCopilot?: (query: string) => void;
};

/* ─── Constants ─────────────────────────────────────────────── */

const RECENT_STORAGE_KEY = "vois-cmd-palette-recent";
const MAX_RECENT = 5;

const FONT_SANS =
  '"Inter", "Segoe UI", Arial, sans-serif';
const FONT_MONO =
  '"JetBrains Mono", monospace';

const COLOR = {
  textPrimary: "var(--color-text-primary)",
  textSecondary: "var(--color-text-secondary)",
  textMuted: "var(--color-text-muted)",
  surface: "var(--color-surface)",
  bgMuted: "var(--color-surface-subtle)",
  borderSubtle: "var(--color-border-subtle)",
  accent: "var(--color-accent)",
  accentSoft: "var(--color-accent-soft)",
} as const;

/* ─── Keyframe Injection ────────────────────────────────────── */

let stylesInjected = false;

function injectStyles() {
  if (stylesInjected) return;
  stylesInjected = true;

  const css = `
@keyframes cmd-palette-backdrop-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes cmd-palette-in {
  from { opacity: 0; transform: scale(0.98) translateY(-4px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}
@keyframes cmd-palette-out {
  from { opacity: 1; }
  to   { opacity: 0; }
}`;

  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);
}

/* ─── Icons (inline SVG) ────────────────────────────────────── */

function SearchIcon() {
  return <Icon name="search" size={20} />;
}

function ClearIcon() {
  return <Icon name="close" size={16} />;
}

function SparklesIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path
        d="M10 2l1.5 4.5L16 8l-4.5 1.5L10 14l-1.5-4.5L4 8l4.5-1.5L10 2z"
        stroke={COLOR.accent}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M15 12l.75 2.25L18 15l-2.25.75L15 18l-.75-2.25L12 15l2.25-.75L15 12z"
        stroke={COLOR.accent}
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DefaultItemIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="3" y="3" width="14" height="14" rx="3" stroke={COLOR.textMuted} strokeWidth="1.3" />
      <path d="M7 10h6" stroke={COLOR.textMuted} strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

/* ─── Recent Items Persistence ──────────────────────────────── */

function loadRecentIds(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

function saveRecentIds(ids: string[]) {
  try {
    localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(ids.slice(0, MAX_RECENT)));
  } catch {
    /* storage full — silently ignore */
  }
}

function pushRecent(id: string, current: string[]): string[] {
  const next = [id, ...current.filter((r) => r !== id)].slice(0, MAX_RECENT);
  saveRecentIds(next);
  return next;
}

/* ─── Helpers ───────────────────────────────────────────────── */

function isCopilotQuery(query: string): string | null {
  const trimmed = query.trimStart();
  if (trimmed.startsWith("ask:")) return trimmed.slice(4).trim();
  if (trimmed.startsWith("ask ")) return trimmed.slice(4).trim();
  return null;
}

function groupItems(items: CommandItem[]): { group: string; items: CommandItem[] }[] {
  const map = new Map<string, CommandItem[]>();
  for (const item of items) {
    const list = map.get(item.group);
    if (list) {
      list.push(item);
    } else {
      map.set(item.group, [item]);
    }
  }
  return Array.from(map.entries()).map(([group, items]) => ({ group, items }));
}

/* ─── Component ─────────────────────────────────────────────── */

export function CommandPalette({ open, onClose, items, onAskCopilot }: CommandPaletteProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  const [query, setQuery] = React.useState("");
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [recentIds, setRecentIds] = React.useState(loadRecentIds);
  const [closing, setClosing] = React.useState(false);

  React.useEffect(() => {
    injectStyles();
  }, []);

  // Reset state when opening
  React.useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setClosing(false);
      setRecentIds(loadRecentIds());
      // Focus input after frame to allow animation start
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [open]);

  // Build flat list of visible items
  const copilotQuery = isCopilotQuery(query);
  const hasCopilot = copilotQuery !== null && copilotQuery.length > 0 && onAskCopilot;

  const filtered = React.useMemo(() => {
    if (!query.trim()) {
      // Show recent items when query is empty
      const recentItems = recentIds
        .map((id) => items.find((item) => item.id === id))
        .filter(Boolean) as CommandItem[];

      if (recentItems.length > 0) {
        return recentItems.map((item) => ({
          ...item,
          group: "Recent",
        }));
      }
      return items;
    }

    if (copilotQuery !== null) {
      // In copilot mode, still show filtered results below
      const lower = copilotQuery.toLowerCase();
      if (!lower) return [];
      return items.filter(
        (item) =>
          item.label.toLowerCase().includes(lower) ||
          item.description?.toLowerCase().includes(lower) ||
          item.group.toLowerCase().includes(lower),
      );
    }

    const lower = query.toLowerCase().trim();
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(lower) ||
        item.description?.toLowerCase().includes(lower) ||
        item.group.toLowerCase().includes(lower),
    );
  }, [query, items, recentIds, copilotQuery]);

  const grouped = React.useMemo(() => groupItems(filtered), [filtered]);

  // Build flat index for keyboard nav
  const flatItems = React.useMemo(() => {
    const flat: { type: "copilot"; query: string }[] | { type: "item"; item: CommandItem }[] = [];
    if (hasCopilot) {
      (flat as { type: "copilot"; query: string }[]).push({ type: "copilot", query: copilotQuery! });
    }
    for (const item of filtered) {
      (flat as { type: "item"; item: CommandItem }[]).push({ type: "item", item });
    }
    return flat as ({ type: "copilot"; query: string } | { type: "item"; item: CommandItem })[];
  }, [hasCopilot, copilotQuery, filtered]);

  // Clamp selected index
  React.useEffect(() => {
    setSelectedIndex((prev) => {
      if (flatItems.length === 0) return 0;
      return Math.min(prev, flatItems.length - 1);
    });
  }, [flatItems.length]);

  // Scroll selected into view
  React.useEffect(() => {
    const container = listRef.current;
    if (!container) return;
    const el = container.querySelector(`[data-cmd-index="${selectedIndex}"]`) as HTMLElement | null;
    if (el) {
      el.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  const handleClose = React.useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      onClose();
    }, 100);
  }, [onClose]);

  const handleSelect = React.useCallback(
    (index: number) => {
      const entry = flatItems[index];
      if (!entry) return;
      if (entry.type === "copilot") {
        onAskCopilot?.(entry.query);
        handleClose();
      } else {
        setRecentIds((prev) => pushRecent(entry.item.id, prev));
        entry.item.onSelect();
        handleClose();
      }
    },
    [flatItems, onAskCopilot, handleClose],
  );

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown": {
          e.preventDefault();
          if (flatItems.length === 0) return;
          setSelectedIndex((prev) => (prev + 1) % flatItems.length);
          break;
        }
        case "ArrowUp": {
          e.preventDefault();
          if (flatItems.length === 0) return;
          setSelectedIndex((prev) => (prev - 1 + flatItems.length) % flatItems.length);
          break;
        }
        case "Enter": {
          e.preventDefault();
          handleSelect(selectedIndex);
          break;
        }
        case "Escape": {
          e.preventDefault();
          handleClose();
          break;
        }
      }
    },
    [flatItems.length, selectedIndex, handleSelect, handleClose],
  );

  // Global Cmd+K / Ctrl+K listener for closing
  React.useEffect(() => {
    if (!open) return;

    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        handleClose();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, handleClose]);

  if (!open && !closing) return null;

  /* ─── Styles ────────────────────────────────────────────────── */

  const backdropStyle: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    backdropFilter: "blur(4px)",
    WebkitBackdropFilter: "blur(4px)",
    zIndex: 130,
    animation: closing
      ? "cmd-palette-out 100ms ease forwards"
      : "cmd-palette-backdrop-in 150ms ease forwards",
  };

  const modalStyle: React.CSSProperties = {
    position: "fixed",
    top: "30%",
    left: "50%",
    transform: "translateX(-50%)",
    width: "100%",
    maxWidth: 560,
    backgroundColor: COLOR.surface,
    borderRadius: "var(--radius-lg)",
    boxShadow: "0 16px 48px rgba(0, 0, 0, 0.12), 0 4px 16px rgba(0, 0, 0, 0.08)",
    zIndex: 130,
    overflow: "hidden",
    fontFamily: FONT_SANS,
    animation: closing
      ? "cmd-palette-out 100ms ease forwards"
      : "cmd-palette-in 150ms ease forwards",
  };

  const inputWrapperStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "0 16px",
    height: 48,
    borderBottom: `1px solid ${COLOR.borderSubtle}`,
  };

  const inputStyle: React.CSSProperties = {
    flex: 1,
    border: "none",
    outline: "none",
    background: "transparent",
    fontSize: "var(--text-card)",
    fontFamily: FONT_SANS,
    fontWeight: 400,
    color: COLOR.textPrimary,
    lineHeight: "48px",
  };

  const resultsStyle: React.CSSProperties = {
    maxHeight: 400,
    overflowY: "auto",
    overflowX: "hidden",
    padding: "4px 0",
  };

  const groupHeaderStyle: React.CSSProperties = {
    fontSize: "var(--text-eyebrow)",
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
    color: COLOR.textMuted,
    padding: "10px 16px 4px",
    fontFamily: FONT_SANS,
    lineHeight: "16px",
  };

  /* ─── Render helpers ────────────────────────────────────────── */

  let flatIndex = 0;

  function renderCopilotItem() {
    const idx = flatIndex++;
    const isSelected = idx === selectedIndex;

    const style: React.CSSProperties = {
      display: "flex",
      alignItems: "center",
      gap: 10,
      height: 44,
      padding: "0 15px",
      cursor: "pointer",
      backgroundColor: isSelected ? COLOR.accentSoft : "transparent",
      borderLeft: isSelected ? `3px solid ${COLOR.accent}` : "3px solid transparent",
      transition: "background-color 60ms ease",
    };

    return (
      <div
        key="__copilot__"
        data-cmd-index={idx}
        style={style}
        onClick={() => handleSelect(idx)}
        onMouseEnter={() => setSelectedIndex(idx)}
      >
        <div style={{ flexShrink: 0 }}>
          <SparklesIcon />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span
            style={{
              fontSize: "var(--text-body)",
              fontWeight: 500,
              color: COLOR.accent,
              fontFamily: FONT_SANS,
            }}
          >
            Ask Copilot:{" "}
          </span>
          <span
            style={{
              fontSize: "var(--text-body)",
              fontWeight: 400,
              color: COLOR.textPrimary,
              fontFamily: FONT_SANS,
            }}
          >
            {copilotQuery}
          </span>
        </div>
        <ShortcutPill text="Enter" />
      </div>
    );
  }

  function renderItem(item: CommandItem) {
    const idx = flatIndex++;
    const isSelected = idx === selectedIndex;

    const style: React.CSSProperties = {
      display: "flex",
      alignItems: "center",
      gap: 10,
      height: 44,
      padding: "0 15px",
      cursor: "pointer",
      backgroundColor: isSelected ? COLOR.accentSoft : "transparent",
      borderLeft: isSelected ? `3px solid ${COLOR.accent}` : "3px solid transparent",
      transition: "background-color 60ms ease",
    };

    return (
      <div
        key={item.id}
        data-cmd-index={idx}
        style={style}
        onClick={() => handleSelect(idx)}
        onMouseEnter={() => setSelectedIndex(idx)}
      >
        <div style={{ flexShrink: 0, color: COLOR.textMuted }}>
          {item.icon ? <DefaultItemIcon /> : <DefaultItemIcon />}
        </div>
        <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "baseline", gap: 8 }}>
          <span
            style={{
              fontSize: "var(--text-body)",
              fontWeight: 500,
              color: COLOR.textPrimary,
              fontFamily: FONT_SANS,
              whiteSpace: "nowrap",
            }}
          >
            {item.label}
          </span>
          {item.description && (
            <span
              style={{
                fontSize: "var(--text-small)",
                color: COLOR.textMuted,
                fontFamily: FONT_SANS,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                minWidth: 0,
              }}
            >
              {item.description}
            </span>
          )}
        </div>
        {item.shortcut && <ShortcutPill text={item.shortcut} />}
      </div>
    );
  }

  // Reset flat index counter for each render
  flatIndex = 0;

  const showEmpty = query.trim().length > 0 && flatItems.length === 0;

  return (
    <>
      {/* Backdrop */}
      <div style={backdropStyle} onClick={handleClose} />

      {/* Modal */}
      <div
        style={modalStyle}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div style={inputWrapperStyle}>
          <SearchIcon />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search or type a command..."
            style={inputStyle}
            autoComplete="off"
            spellCheck={false}
          />
          {query.length > 0 && (
            <button
              onClick={() => {
                setQuery("");
                setSelectedIndex(0);
                inputRef.current?.focus();
              }}
              aria-label="Clear search"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "none",
                background: "none",
                cursor: "pointer",
                padding: 4,
                borderRadius: "var(--radius-sm)",
                flexShrink: 0,
              }}
            >
              <ClearIcon />
            </button>
          )}
        </div>

        {/* Results */}
        <div ref={listRef} style={resultsStyle}>
          {/* Copilot item at top */}
          {hasCopilot && renderCopilotItem()}

          {/* Grouped results */}
          {grouped.map(({ group, items: groupItems }) => (
            <div key={group}>
              <div style={groupHeaderStyle}>{group}</div>
              {groupItems.map((item) => renderItem(item))}
            </div>
          ))}

          {/* Empty state */}
          {showEmpty && (
            <div style={{ padding: "32px 16px", textAlign: "center" }}>
              <div
                style={{
                  fontSize: "var(--text-body)",
                  color: COLOR.textMuted,
                  fontFamily: FONT_SANS,
                  marginBottom: 6,
                }}
              >
                No results for &lsquo;{query.trim()}&rsquo;
              </div>
              <div
                style={{
                  fontSize: "var(--text-small)",
                  color: COLOR.textMuted,
                  fontFamily: FONT_SANS,
                }}
              >
                Try searching for venues, tasks, or blocks
              </div>
            </div>
          )}

          {/* Empty state when no items and no query */}
          {!query.trim() && items.length === 0 && (
            <div style={{ padding: "32px 16px", textAlign: "center" }}>
              <div
                style={{
                  fontSize: "var(--text-small)",
                  color: COLOR.textMuted,
                  fontFamily: FONT_SANS,
                }}
              >
                No commands available
              </div>
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            padding: "8px 16px",
            borderTop: `1px solid ${COLOR.borderSubtle}`,
          }}
        >
          <FooterHint keys={["↑", "↓"]} label="navigate" />
          <FooterHint keys={["Enter"]} label="select" />
          <FooterHint keys={["Esc"]} label="close" />
        </div>
      </div>
    </>
  );
}

/* ─── Sub-components ────────────────────────────────────────── */

function ShortcutPill({ text }: { text: string }) {
  return (
    <span
      style={{
        fontSize: "var(--text-eyebrow)",
        fontFamily: FONT_MONO,
        fontWeight: 500,
        color: COLOR.textMuted,
        backgroundColor: COLOR.bgMuted,
        padding: "2px 6px",
        borderRadius: "var(--radius-sm)",
        lineHeight: "16px",
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}
    >
      {text}
    </span>
  );
}

function FooterHint({ keys, label }: { keys: string[]; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      {keys.map((key) => (
        <span
          key={key}
          style={{
            fontSize: "var(--text-eyebrow)",
            fontFamily: FONT_MONO,
            fontWeight: 500,
            color: COLOR.textMuted,
            backgroundColor: COLOR.bgMuted,
            padding: "1px 5px",
            borderRadius: "var(--radius-sm)",
            lineHeight: "16px",
          }}
        >
          {key}
        </span>
      ))}
      <span
        style={{
          fontSize: "var(--text-eyebrow)",
          color: COLOR.textMuted,
          fontFamily: FONT_SANS,
        }}
      >
        {label}
      </span>
    </div>
  );
}

/* ─── Hook: useCommandPalette ───────────────────────────────── */

export function useCommandPalette(): {
  open: boolean;
  setOpen: (open: boolean) => void;
} {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Cmd+K (Mac) / Ctrl+K (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        e.stopPropagation();
        setOpen((prev) => !prev);
      }

      // Escape to close
      if (e.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return { open, setOpen };
}
