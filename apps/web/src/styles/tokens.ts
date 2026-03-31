/**
 * VOIS Design Tokens — centralised single source of truth.
 *
 * Every value references a CSS custom-property defined in styles.css.
 * If you need a one-off colour that doesn't exist here,
 * add a new CSS variable first, then reference it here.
 *
 * NEVER put a raw hex colour in a .tsx file.
 */
import type React from "react";

/* ------------------------------------------------------------------ */
/*  Scalar tokens                                                      */
/* ------------------------------------------------------------------ */

export const ds = {
  // ── Colours ──────────────────────────────────────────────────────
  accent:        "var(--color-accent)",
  accentSoft:    "var(--color-accent-soft)",
  accentHover:   "var(--color-accent-hover)",
  success:       "var(--color-success)",
  successSoft:   "var(--color-success-soft)",
  warning:       "var(--color-warning)",
  warningSoft:   "var(--color-warning-soft)",
  danger:        "var(--color-danger)",
  dangerSoft:    "var(--color-danger-soft)",
  info:          "var(--color-info)",
  infoSoft:      "var(--color-info-soft)",
  cardBg:        "var(--color-surface)",
  surfaceBg:     "var(--color-surface-subtle)",
  surfaceElevated: "var(--color-surface-elevated)",
  bgInput:       "var(--bg-input)",
  textPrimary:   "var(--color-text-primary)",
  textSecondary: "var(--color-text-secondary)",
  muted:         "var(--color-text-muted)",
  border:        "var(--color-border-subtle)",
  borderStrong:  "var(--color-border-strong)",
  white:         "var(--white)",
  grid:          "var(--color-border-subtle)",

  // Named palette aliases used in specific views
  sunrise:       "var(--sunrise)",
  lavender:      "var(--lavender)",
  coral:         "var(--ois-coral)",
  gold:          "var(--gold)",
  leaf:          "var(--leaf)",
  sky:           "var(--sky)",

  // Lane / category colours (PlanView, PortfolioView)
  l1Color:       "var(--sunrise)",
  l2Color:       "var(--color-success)",
  l3Color:       "var(--color-info)",
  l4Color:       "var(--lavender)",

  // ── Typography (as CSS var strings — use in fontSize) ────────────
  textDisplay:   "var(--text-display)",
  textPage:      "var(--text-page)",
  textSection:   "var(--text-section)",
  textHeading:   "var(--text-section)",   // alias
  textTitle:     "var(--text-page)",      // alias (28px)
  textCard:      "var(--text-card)",
  textCardTitle: "var(--text-card)",      // alias
  textBody:      "var(--text-body)",
  textSmall:     "var(--text-small)",
  textEyebrow:   "var(--text-eyebrow)",

  // ── Radii ────────────────────────────────────────────────────────
  cardRadius:    "var(--radius-md)",
  btnRadius:     "var(--radius-sm)",
  radiusFull:    "var(--radius-full)",

  // ── Shadows ──────────────────────────────────────────────────────
  cardShadow:      "var(--shadow-sm)",
  cardShadowHover: "var(--shadow-md)",
  shadowLg:        "var(--shadow-lg)",

  // ── Spacing ──────────────────────────────────────────────────────
  sectionGap:    "var(--spacing-xl)",
  cardGap:       "var(--spacing-sm)",
  pageMargin:    "var(--spacing-2xl)",

  // ── Motion ───────────────────────────────────────────────────────
  motionFast:    "var(--motion-fast)",
  motionBase:    "var(--motion-base)",
  motionSlow:    "var(--motion-slow)",

  /* ----------------------------------------------------------------
   *  Composite style objects
   *  These can be spread directly into JSX style props.
   * ---------------------------------------------------------------- */

  // ── Typography style objects ─────────────────────────────────────
  eyebrow: {
    fontSize: "var(--text-eyebrow)",
    fontWeight: 600,
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
    color: "var(--color-text-muted)",
    margin: 0,
  } as React.CSSProperties,

  pageTitle: {
    fontSize: "var(--text-page)",
    fontWeight: 700,
    color: "var(--color-text-primary)",
    margin: "4px 0 0",
  } as React.CSSProperties,

  sectionTitle: {
    fontSize: "var(--text-section)",
    fontWeight: 600,
    color: "var(--color-text-primary)",
    margin: 0,
  } as React.CSSProperties,

  sectionHeading: {
    fontSize: "var(--text-section)",
    fontWeight: 600,
    color: "var(--color-text-primary)",
    margin: 0,
  } as React.CSSProperties,

  body: {
    fontSize: "var(--text-body)",
    color: "var(--color-text-secondary)",
    lineHeight: 1.55,
    margin: 0,
  } as React.CSSProperties,

  small: {
    fontSize: "var(--text-small)",
    color: "var(--color-text-muted)",
    lineHeight: 1.5,
    margin: 0,
  } as React.CSSProperties,

  // ── Card ─────────────────────────────────────────────────────────
  card: {
    background: "var(--color-surface)",
    borderRadius: "var(--radius-md)",
    boxShadow: "var(--shadow-sm)",
    padding: "16px 20px",
  } as React.CSSProperties,

  cardCompact: {
    background: "var(--color-surface)",
    borderRadius: "var(--radius-md)",
    boxShadow: "var(--shadow-sm)",
    padding: "12px 16px",
  } as React.CSSProperties,

  interactiveCard: {
    background: "var(--color-surface)",
    borderRadius: "var(--radius-md)",
    border: "1px solid var(--color-border-subtle)",
    boxShadow: "var(--shadow-sm)",
    padding: "12px 16px",
    cursor: "pointer",
    transition: "all var(--motion-base) var(--easing-standard)",
  } as React.CSSProperties,

  // ── Buttons ──────────────────────────────────────────────────────
  btnPrimary: {
    background: "var(--color-accent)",
    color: "var(--white)",
    border: "none",
    borderRadius: "var(--radius-sm)",
    padding: "6px 14px",
    fontSize: "var(--text-small)",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all var(--motion-base) var(--easing-standard)",
  } as React.CSSProperties,

  btnSecondary: {
    background: "var(--color-surface)",
    color: "var(--color-text-primary)",
    border: "1px solid var(--color-border-subtle)",
    borderRadius: "var(--radius-sm)",
    padding: "6px 14px",
    fontSize: "var(--text-small)",
    fontWeight: 500,
    cursor: "pointer",
    transition: "all var(--motion-base) var(--easing-standard)",
  } as React.CSSProperties,

  btnDanger: {
    background: "var(--color-danger)",
    color: "var(--white)",
    border: "none",
    borderRadius: "var(--radius-sm)",
    padding: "6px 14px",
    fontSize: "var(--text-small)",
    fontWeight: 600,
    cursor: "pointer",
  } as React.CSSProperties,

  btnSmall: {
    padding: "4px 12px",
    fontSize: "var(--text-eyebrow)",
    fontWeight: 600,
    borderRadius: "var(--radius-sm)",
    cursor: "pointer",
    border: "none",
  } as React.CSSProperties,

  btnSmPrimary: {
    background: "var(--color-accent)",
    color: "var(--white)",
    padding: "4px 12px",
    fontSize: "var(--text-eyebrow)",
    fontWeight: 600,
    borderRadius: "var(--radius-sm)",
    border: "none",
    cursor: "pointer",
  } as React.CSSProperties,

  btnSmSecondary: {
    background: "var(--color-surface)",
    color: "var(--color-text-secondary)",
    padding: "4px 12px",
    fontSize: "var(--text-eyebrow)",
    fontWeight: 600,
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--color-border-subtle)",
    cursor: "pointer",
  } as React.CSSProperties,

  // ── Form inputs ──────────────────────────────────────────────────
  input: {
    width: "100%",
    padding: "8px 12px",
    fontSize: "var(--text-body)",
    border: "1px solid var(--color-border-subtle)",
    borderRadius: "var(--radius-sm)",
    background: "var(--bg-input)",
    outline: "none",
    boxSizing: "border-box" as const,
  } as React.CSSProperties,

  searchInput: {
    width: "100%",
    padding: "8px 12px",
    fontSize: "var(--text-small)",
    border: "1px solid var(--color-border-subtle)",
    borderRadius: "var(--radius-sm)",
    background: "var(--bg-input)",
    outline: "none",
    boxSizing: "border-box" as const,
  } as React.CSSProperties,

  selectInput: {
    padding: "6px 10px",
    fontSize: "var(--text-small)",
    border: "1px solid var(--color-border-subtle)",
    borderRadius: "var(--radius-sm)",
    background: "var(--bg-input)",
    outline: "none",
  } as React.CSSProperties,

  textarea: {
    width: "100%",
    padding: "10px 14px",
    fontSize: "var(--text-body)",
    border: "1px solid var(--color-border-subtle)",
    borderRadius: "var(--radius-sm)",
    background: "var(--bg-input)",
    outline: "none",
    resize: "vertical" as const,
    boxSizing: "border-box" as const,
    fontFamily: "var(--font-body)",
  } as React.CSSProperties,

  // ── Pills & Tags ────────────────────────────────────────────────
  tag: {
    display: "inline-flex",
    alignItems: "center",
    padding: "2px 10px",
    borderRadius: "var(--radius-full)",
    fontSize: "var(--text-eyebrow)",
    fontWeight: 600,
    background: "var(--color-surface-subtle)",
    color: "var(--color-text-secondary)",
  } as React.CSSProperties,

  countPill: {
    display: "inline-flex",
    alignItems: "center",
    padding: "2px 8px",
    borderRadius: 10,
    fontSize: "var(--text-eyebrow)",
    fontWeight: 600,
    background: "var(--color-surface-subtle)",
    color: "var(--color-text-muted)",
  } as React.CSSProperties,

  confidenceBadge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "2px 8px",
    borderRadius: "var(--radius-full)",
    fontSize: "var(--text-eyebrow)",
    fontWeight: 600,
  } as React.CSSProperties,

  // ── Metrics ──────────────────────────────────────────────────────
  metricNumber: {
    fontSize: "var(--text-page)",
    fontWeight: 700,
    color: "var(--color-text-primary)",
    lineHeight: 1,
  } as React.CSSProperties,

  metricLabel: {
    fontSize: "var(--text-eyebrow)",
    fontWeight: 500,
    color: "var(--color-text-muted)",
    marginTop: 4,
  } as React.CSSProperties,

  // ── Key-value rows ───────────────────────────────────────────────
  kvRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "var(--text-small)",
  } as React.CSSProperties,

  kvLabel: { color: "var(--color-text-muted)", fontWeight: 500 } as React.CSSProperties,
  kvValue: { color: "var(--color-text-primary)", fontWeight: 500 } as React.CSSProperties,

  metaRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "var(--text-small)",
  } as React.CSSProperties,

  rowLabel: { color: "var(--color-text-muted)", fontWeight: 500 } as React.CSSProperties,
  rowValue: { color: "var(--color-text-primary)", fontWeight: 500 } as React.CSSProperties,
} as const;

/* ------------------------------------------------------------------ */
/*  Helper factories (need runtime args → can't be static objects)     */
/* ------------------------------------------------------------------ */

/** Pill with active/inactive state */
export const pillStyle = (active: boolean): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "6px 14px",
  borderRadius: "var(--radius-sm)",
  fontSize: "var(--text-small)",
  fontWeight: active ? 600 : 400,
  cursor: "pointer",
  minHeight: 32,
  border: active ? "1.5px solid var(--color-accent)" : "1px solid var(--color-border-subtle)",
  background: active ? "var(--color-accent)" : "var(--color-surface)",
  color: active ? "var(--white)" : "var(--color-text-secondary)",
  transition: "all var(--motion-base) var(--easing-standard)",
});

/** Small status dot */
export const statusDot = (color: string): React.CSSProperties => ({
  width: 8,
  height: 8,
  borderRadius: "50%",
  background: color,
  display: "inline-block",
  flexShrink: 0,
});

/** Chip / filter pill (lighter, rounded) */
export const chipStyle = (active: boolean): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  padding: "4px 12px",
  borderRadius: "var(--radius-full)",
  fontSize: "var(--text-eyebrow)",
  fontWeight: 600,
  cursor: "pointer",
  border: active ? "1.5px solid var(--color-accent)" : "1px solid var(--color-border-subtle)",
  background: active ? "var(--color-accent-soft)" : "var(--color-surface)",
  color: active ? "var(--color-accent)" : "var(--color-text-secondary)",
  transition: "all var(--motion-base) var(--easing-standard)",
});
