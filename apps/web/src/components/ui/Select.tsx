import { useState, useRef, useEffect, useCallback } from "react";
import Icon from "../Icon";

export type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type SelectProps = {
  options: SelectOption[];
  value: string | string[];
  onChange: (value: string) => void;
  placeholder?: string;
  size?: "sm" | "md";
  searchable?: boolean;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
};

export function Select({
  options,
  value,
  onChange,
  placeholder = "Select...",
  size = "md",
  searchable = false,
  disabled = false,
  className = "",
  "aria-label": ariaLabel,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((o) => o.value === value);

  const filtered = search
    ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  const handleSelect = useCallback(
    (optValue: string) => {
      onChange(optValue);
      setOpen(false);
      setSearch("");
    },
    [onChange]
  );

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Focus search on open
  useEffect(() => {
    if (open && searchable && searchRef.current) {
      searchRef.current.focus();
    }
  }, [open, searchable]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setSearch("");
      } else if (e.key === "Enter" && !open) {
        setOpen(true);
      } else if (e.key === "ArrowDown" && open) {
        e.preventDefault();
        const currentIdx = filtered.findIndex((o) => o.value === value);
        const next = filtered[currentIdx + 1];
        if (next && !next.disabled) handleSelect(next.value);
      } else if (e.key === "ArrowUp" && open) {
        e.preventDefault();
        const currentIdx = filtered.findIndex((o) => o.value === value);
        const prev = filtered[currentIdx - 1];
        if (prev && !prev.disabled) handleSelect(prev.value);
      }
    },
    [open, filtered, value, handleSelect]
  );

  const cn = [
    "custom-select",
    size === "sm" && "small",
    open && "open",
    className,
  ].filter(Boolean).join(" ");

  return (
    <div ref={containerRef} className={cn} onKeyDown={handleKeyDown}>
      <button
        type="button"
        className={`select-trigger${open ? " focused" : ""}`}
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className={selectedOption ? undefined : "placeholder"}>
          {selectedOption?.label ?? placeholder}
        </span>
        <span className="chevron">
          <Icon name="chevron-down" size={14} />
        </span>
      </button>

      {open && (
        <div className="select-dropdown" role="listbox">
          {searchable && (
            <div className="select-search">
              <Icon name="search" size={16} />
              <input
                ref={searchRef}
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          )}
          <div className="select-options">
            {filtered.length === 0 && (
              <div className="select-option disabled">No results</div>
            )}
            {filtered.map((option) => (
              <div
                key={option.value}
                className={[
                  "select-option",
                  option.value === value && "selected",
                  option.disabled && "disabled",
                ].filter(Boolean).join(" ")}
                role="option"
                aria-selected={option.value === value}
                onClick={() => {
                  if (!option.disabled) handleSelect(option.value);
                }}
              >
                <span>{option.label}</span>
                {option.value === value && (
                  <Icon name="check" size={14} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
