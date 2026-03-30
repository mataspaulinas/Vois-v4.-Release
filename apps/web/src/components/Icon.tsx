import React, { useState, useCallback, useMemo, CSSProperties } from 'react';

// ---------------------------------------------------------------------------
// SVG path data for all 106 VOIS design-system icons
// Every path targets a 24x24 viewBox, stroke-based (1.5 stroke, round caps)
// ---------------------------------------------------------------------------

const ICON_PATHS = {
  // ── NAVIGATION (20) ─────────────────────────────────────────────────────
  home: 'M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V9.5z',
  today: 'M8 2v2M16 2v2M3 7h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM12 12h.01',
  tasks: 'M9 11l3 3 8-8M21 12a9 9 0 1 1-6.22-8.56',
  execution: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
  assessment: 'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2M9 5h6M9 14l2 2 4-4',
  signals: 'M2 12h2M6 8l1.5 1.5M6 16l1.5-1.5M12 2v2M18 8l-1.5 1.5M18 16l-1.5-1.5M22 12h-2M12 22v-2M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
  plan: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  report: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM14 2v6h6M8 13h8M8 17h8M8 9h2',
  history: 'M12 8v4l3 3M3.05 11a9 9 0 1 1 .5 4m-.5 5v-5h5',
  reference: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z',
  knowledge: 'M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 1-4 4v14a3 3 0 0 0 3-3h7z',
  standards: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
  settings: 'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  help: 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35',
  menu: 'M3 12h18M3 6h18M3 18h18',
  collapse: 'M4 14h16M4 10h16M8 6l4 4 4-4M8 18l4-4 4 4',
  expand: 'M4 14h16M4 10h16M8 18l4-4 4 4M8 6l4 4 4-4',
  back: 'M19 12H5M12 19l-7-7 7-7',
  forward: 'M5 12h14M12 5l7 7-7 7',

  // ── ACTIONS (20) ────────────────────────────────────────────────────────
  add: 'M12 5v14M5 12h14',
  edit: 'M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z',
  delete: 'M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6',
  save: 'M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2zM17 21v-8H7v8M7 3v5h8',
  duplicate: 'M16 3H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zM12 3h6a2 2 0 0 1 2 2v14',
  'export-icon': 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
  'import-icon': 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12',
  send: 'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z',
  attach: 'M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48',
  more: 'M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM19 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM5 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
  'more-vertical': 'M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM12 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM12 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
  close: 'M18 6L6 18M6 6l12 12',
  check: 'M20 6L9 17l-5-5',
  refresh: 'M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15',
  undo: 'M3 7v6h6M3 13a9 9 0 0 1 15.36-5.36L21 10',
  filter: 'M22 3H2l8 9.46V19l4 2v-8.54L22 3z',
  sort: 'M3 6h7M3 12h5M3 18h3M16 6v12M13 15l3 3 3-3',
  drag: 'M9 5a1 1 0 1 0 0 2 1 1 0 0 0 0-2zM9 11a1 1 0 1 0 0 2 1 1 0 0 0 0-2zM9 17a1 1 0 1 0 0 2 1 1 0 0 0 0-2zM15 5a1 1 0 1 0 0 2 1 1 0 0 0 0-2zM15 11a1 1 0 1 0 0 2 1 1 0 0 0 0-2zM15 17a1 1 0 1 0 0 2 1 1 0 0 0 0-2z',
  link: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71',
  unlink: 'M18.84 12.25l1.72-1.71a5 5 0 0 0-7.07-7.07l-1.72 1.71M5.16 11.75l-1.72 1.71a5 5 0 0 0 7.07 7.07l1.72-1.71M8 2v3M2 8h3M16 22v-3M22 16h-3',

  // ── STATUS (12) ─────────────────────────────────────────────────────────
  success: 'M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4L12 14.01l-3-3',
  warning: 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01',
  error: 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM15 9l-6 6M9 9l6 6',
  info: 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 16v-4M12 8h.01',
  blocked: 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM4.93 4.93l14.14 14.14',
  'in-progress': 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 6v6l4 2',
  'on-track': 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM8 12l3 3 5-5',
  overdue: 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 8v4M12 16h.01',
  'at-risk': 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 10v4M12 18h.01',
  pending: 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 6v6M12 16h.01',
  completed: 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM8 11l3 3 5-6',
  critical: 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 8v4M12 16h.01M8 3.5l-3 1M16 3.5l3 1',

  // ── ONTOLOGY (6) ────────────────────────────────────────────────────────
  block: 'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16zM3.27 6.96L12 12.01l8.73-5.05M12 22.08V12',
  tool: 'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94L6.73 20.15a2.12 2.12 0 0 1-3-3l6.68-6.68a6 6 0 0 1 7.94-7.94L14.7 6.3z',
  signal: 'M2 20h.01M7 20v-4M12 20v-8M17 20V8M22 20V4',
  'failure-mode': 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01',
  'response-pattern': 'M22 12h-4l-3 9L9 3l-3 9H2',
  ontology: 'M12 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM4 18a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM20 18a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM12 9v3M7.5 17.2L10.5 12M16.5 17.2L13.5 12',

  // ── ROLES (6) ───────────────────────────────────────────────────────────
  owner: 'M12 2a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2M12 14l-2 7M12 14l2 7',
  manager: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  barista: 'M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8zM6 1v3M10 1v3M14 1v3',
  developer: 'M16 18l6-6-6-6M8 6l-6 6 6 6M14 4l-4 16',
  team: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  person: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',

  // ── FEATURES (16) ──────────────────────────────────────────────────────
  copilot: 'M12 2a7 7 0 0 0-7 7v3a7 7 0 0 0 14 0V9a7 7 0 0 0-7-7zM9 10h.01M15 10h.01M9 14c.83.83 2 1.5 3 1.5s2.17-.67 3-1.5',
  notification: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0',
  'notification-dot': 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0',
  escalation: 'M12 19V5M5 12l7-7 7 7M4 19h16',
  delegation: 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3',
  evidence: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM14 2v6h6M9 15l2 2 4-4',
  proof: 'M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4L12 14.01l-3-3',
  comment: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z',
  progress: 'M12 2a10 10 0 1 0 10 10M12 2v10l7-7',
  velocity: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
  calendar: 'M8 2v4M16 2v4M3 8h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
  clock: 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 6v6l4 2',
  shift: 'M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
  log: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM14 2v6h6M16 13H8M16 17H8M10 9H8',
  'report-issue': 'M7.86 2h8.28L22 7.86v8.28L16.14 22H7.86L2 16.14V7.86L7.86 2zM12 8v4M12 16h.01',
  'ask-help': 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10zM9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01',

  // ── DATA (8) ────────────────────────────────────────────────────────────
  'chart-bar': 'M12 20V10M6 20V4M18 20v-6',
  'chart-line': 'M22 12l-4-4-6 6-4-4-6 6',
  'chart-pie': 'M21.21 15.89A10 10 0 1 1 8 2.83M22 12A10 10 0 0 0 12 2v10l10 0z',
  'trending-up': 'M23 6l-9.5 9.5-5-5L1 18M17 6h6v6',
  'trending-down': 'M23 18l-9.5-9.5-5 5L1 6M17 18h6v-6',
  'trending-flat': 'M22 12H2M17 7l5 5-5 5',
  heatmap: 'M3 3h4v4H3zM10 3h4v4h-4zM17 3h4v4h-4zM3 10h4v4H3zM10 10h4v4h-4zM17 10h4v4h-4zM3 17h4v4H3zM10 17h4v4h-4zM17 17h4v4h-4z',
  metrics: 'M22 12h-4l-3 9L9 3l-3 9H2',

  // ── SYSTEM (18) ─────────────────────────────────────────────────────────
  'theme-light': 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42',
  'theme-dark': 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z',
  fullscreen: 'M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3',
  minimize: 'M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M16 21v-3a2 2 0 0 1 2-2h3',
  external: 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
  upload: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12',
  lock: 'M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2zM7 11V7a5 5 0 0 1 10 0v4',
  unlock: 'M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2zM7 11V7a5 5 0 0 1 9.9-1',
  eye: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  'eye-off': 'M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M14.12 14.12a3 3 0 1 1-4.24-4.24M1 1l22 22',
  'chevron-down': 'M6 9l6 6 6-6',
  'chevron-up': 'M18 15l-6-6-6 6',
  'chevron-left': 'M15 18l-6-6 6-6',
  'chevron-right': 'M9 18l6-6-6-6',
  'arrow-up': 'M12 19V5M5 12l7-7 7 7',
  'arrow-down': 'M12 5v14M19 12l-7 7-7-7',
  loading: 'M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83',
} as const;

// ---------------------------------------------------------------------------
// Exported types
// ---------------------------------------------------------------------------

export type IconName = keyof typeof ICON_PATHS;
export const ICON_NAMES = Object.keys(ICON_PATHS) as IconName[];

// ---------------------------------------------------------------------------
// Category membership (used for animation + default colors)
// ---------------------------------------------------------------------------

const NAVIGATION_ICONS: ReadonlySet<string> = new Set([
  'home', 'today', 'tasks', 'execution', 'assessment', 'signals', 'plan',
  'report', 'history', 'reference', 'knowledge', 'standards', 'settings',
  'help', 'search', 'menu', 'collapse', 'expand', 'back', 'forward',
]);

const ACTION_ICONS: ReadonlySet<string> = new Set([
  'add', 'edit', 'delete', 'save', 'duplicate', 'export-icon', 'import-icon',
  'send', 'attach', 'more', 'more-vertical', 'close', 'check', 'refresh',
  'undo', 'filter', 'sort', 'drag', 'link', 'unlink',
]);

const STATUS_ICONS: ReadonlySet<string> = new Set([
  'success', 'warning', 'error', 'info', 'blocked', 'in-progress',
  'on-track', 'overdue', 'at-risk', 'pending', 'completed', 'critical',
]);

const ONTOLOGY_ICONS: ReadonlySet<string> = new Set([
  'block', 'tool', 'signal', 'failure-mode', 'response-pattern', 'ontology',
]);

// ---------------------------------------------------------------------------
// Semantic default colors (applied when no explicit color prop is given)
// ---------------------------------------------------------------------------

const SEMANTIC_COLORS: Partial<Record<IconName, string>> = {
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#6366F1',
  blocked: '#EF4444',
  'in-progress': '#6366F1',
  'on-track': '#10B981',
  overdue: '#EF4444',
  'at-risk': '#F59E0B',
  completed: '#10B981',
  critical: '#EF4444',
  pending: '#A3A3A3',
  block: '#6C5CE7',
  tool: '#3B82F6',
  signal: '#10B981',
  'failure-mode': '#EF4444',
  'response-pattern': '#F59E0B',
  'trending-up': '#10B981',
  'trending-down': '#EF4444',
  escalation: '#EF4444',
  copilot: '#6C5CE7',
  'notification-dot': undefined, // handled specially (red dot added)
};

// ---------------------------------------------------------------------------
// Animation helpers
// ---------------------------------------------------------------------------

type AnimationCategory = 'navigation' | 'action' | 'status-ontology' | 'settings' | 'notification' | 'loading' | 'none';

function getAnimationCategory(name: IconName): AnimationCategory {
  if (name === 'loading') return 'loading';
  if (name === 'settings') return 'settings';
  if (name === 'notification' || name === 'notification-dot') return 'notification';
  if (NAVIGATION_ICONS.has(name)) return 'navigation';
  if (ACTION_ICONS.has(name)) return 'action';
  if (STATUS_ICONS.has(name) || ONTOLOGY_ICONS.has(name)) return 'status-ontology';
  return 'none';
}

function getHoverStyle(category: AnimationCategory, semanticColor?: string): CSSProperties {
  switch (category) {
    case 'navigation':
      return { transform: 'scale(1.15)' };
    case 'action':
      return { transform: 'translateY(-2px)' };
    case 'status-ontology':
      return semanticColor ? { color: semanticColor } : {};
    case 'settings':
      return { transform: 'rotate(90deg)' };
    case 'notification':
      return { transform: 'translateX(2px)' };
    default:
      return {};
  }
}

// ---------------------------------------------------------------------------
// Keyframes injected once for the loading spinner
// ---------------------------------------------------------------------------

let loadingKeyframesInjected = false;
const LOADING_KEYFRAME_NAME = 'vois-icon-spin';

function ensureLoadingKeyframes(): void {
  if (loadingKeyframesInjected || typeof document === 'undefined') return;
  const style = document.createElement('style');
  style.textContent = `@keyframes ${LOADING_KEYFRAME_NAME} { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`;
  document.head.appendChild(style);
  loadingKeyframesInjected = true;
}

// ---------------------------------------------------------------------------
// Component props
// ---------------------------------------------------------------------------

export interface IconProps {
  /** Icon name from the VOIS design system */
  name: IconName;
  /** Pixel size (width & height). Default 24 */
  size?: number;
  /** Stroke / currentColor override. When omitted, semantic icons use their
   *  designated color; all others inherit currentColor. */
  color?: string;
  /** Additional CSS class */
  className?: string;
  /** Click handler */
  onClick?: (e: React.MouseEvent<SVGSVGElement>) => void;
  /** Enable category-specific hover animation. Default false */
  animated?: boolean;
}

// ---------------------------------------------------------------------------
// Icon component
// ---------------------------------------------------------------------------

const Icon: React.FC<IconProps> = ({
  name,
  size = 24,
  color,
  className,
  onClick,
  animated = false,
}) => {
  const [hovered, setHovered] = useState(false);

  const pathData = ICON_PATHS[name];
  if (!pathData) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[Icon] Unknown icon name: "${name}"`);
    }
    return null;
  }

  // Resolve color
  const semanticColor = SEMANTIC_COLORS[name];
  const resolvedColor = color ?? semanticColor ?? 'currentColor';

  // Animation
  const animCategory = animated ? getAnimationCategory(name) : 'none';
  const isLoading = name === 'loading';

  if (isLoading) {
    ensureLoadingKeyframes();
  }

  const baseStyle: CSSProperties = {
    transition: 'transform 0.2s ease, color 0.2s ease',
    cursor: onClick ? 'pointer' : undefined,
    flexShrink: 0,
    ...(isLoading ? { animation: `${LOADING_KEYFRAME_NAME} 1s linear infinite` } : {}),
  };

  const hoverAnimStyle = animated && hovered ? getHoverStyle(animCategory, semanticColor) : {};

  const combinedStyle: CSSProperties = { ...baseStyle, ...hoverAnimStyle };

  const handleMouseEnter = useCallback(() => {
    if (animated) setHovered(true);
  }, [animated]);

  const handleMouseLeave = useCallback(() => {
    if (animated) setHovered(false);
  }, [animated]);

  // notification-dot gets a small filled red circle overlay
  const isNotificationDot = name === 'notification-dot';

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={resolvedColor}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={combinedStyle}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role={onClick ? 'button' : 'img'}
      aria-label={name}
    >
      <path d={pathData} />
      {isNotificationDot && (
        <circle
          cx={18}
          cy={4}
          r={3.5}
          fill="#EF4444"
          stroke="#EF4444"
          strokeWidth={0}
        />
      )}
    </svg>
  );
};

export default Icon;
