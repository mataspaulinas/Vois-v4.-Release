# VOIS Global Debut — Design Investigation Report

**Date:** 2026-03-29
**Scope:** Complete UI/UX redesign exploration — 5 design directions
**Constraint:** Preserve ALL existing functionality. Light, minimalist, focus-first.

---

## 1. Current State Analysis

### What VOIS Is
VOIS (Venue Operations Intelligence System) is a multi-role operational intelligence platform for service venues. It serves **owners** (strategic oversight), **managers** (daily execution), and **team members/baristas** (shift-level tasks). Key capabilities include AI-driven assessments, signal intelligence, plan execution, team management, and a knowledge base with copilot assistance.

### Current Design DNA
- **Stack:** React 18 + TypeScript + Vite, plain CSS with CSS variables
- **Typography:** Inter + JetBrains Mono
- **Colors:** Blue accent (#4f6ef7), gray-scale neutrals, green/gold/red status
- **Layout:** Fixed sidebar (260px) + top bar + primary canvas + optional drawers
- **Theme:** Light default with dark mode, 4 skin variants (ocean, forest, ember, midnight)

### Current Pain Points for Global Debut
1. **Navigation density** — Sidebar carries too many items across too many role contexts
2. **Visual weight** — Cards, headers, stat boxes all compete for attention equally
3. **Context switching** — Moving between owner/manager/pocket views feels like different apps
4. **Information hierarchy** — Everything looks "medium priority" — no clear visual escalation
5. **Mobile experience** — Tab strip is functional but not delightful
6. **Onboarding cognitive load** — New users face too many concepts at once

---

## 2. Design Principles for Global Debut

Based on research into 2026 SaaS design trends (Linear, Vercel, Notion, Craft, Stripe):

| Principle | Meaning |
|-----------|---------|
| **Strategic Minimalism** | Every pixel earns its place. Remove, don't add. |
| **Progressive Disclosure** | Show summary first, detail on demand |
| **Role Confidence** | Each role sees exactly what they need — nothing more |
| **Calm Authority** | The UI should feel like a trusted advisor, not a dashboard explosion |
| **Motion as Meaning** | Transitions communicate state changes, not decoration |
| **Typography as Chrome** | Use type weight/size/color instead of boxes and borders |

---

## 3. The Five Design Directions

### Option A: "Command" — Linear-Inspired Interface
**Philosophy:** Keyboard-first, density-respecting, zero chrome. Every interaction is a command.

**Inspiration:** Linear, Raycast, Arc Browser

**Key Traits:**
- Command palette (Cmd+K) as primary navigation — no traditional sidebar
- Monochrome base with single accent color for active states
- Dense but readable — small text, tight spacing, generous line height
- Lists over cards. Tables over grids. Text over icons.
- Left rail: ultra-narrow (48px) icon-only workspace switcher
- Main area: full-width content with inline filters
- Status conveyed through tiny colored dots, not colored backgrounds

**Best For:** Power users, managers who live in the tool daily, developers

**Risk:** Steep learning curve for baristas/new users

---

### Option B: "Blocks" — Notion-Style Modular Workspace
**Philosophy:** Every view is composable. Users arrange their own workspace.

**Inspiration:** Notion, Coda, Slite

**Key Traits:**
- Block-based layout — sections are draggable/rearrangeable modules
- Typography-first design: headers, body text, and labels do all the work
- Sidebar with collapsible trees (like Notion's page tree)
- Each role's home is a "page" made of blocks: task list block, metrics block, signal block
- Inline editing everywhere — click to edit, no modal forms
- Breadcrumb navigation replaces tabs
- Muted palette with one warm accent

**Best For:** Organizations that want customization, managers who want personal dashboards

**Risk:** Requires block system infrastructure. More complex to implement.

---

### Option C: "Glance" — Apple Health / Craft Intelligence Hub
**Philosophy:** See everything at a glance. Drill down when needed. Card-native.

**Inspiration:** Apple Health, Craft, Things 3, iOS design language

**Key Traits:**
- Card grid layout — each card is a self-contained intelligence unit
- Rounded corners (16-20px), soft shadows, generous padding
- Color as meaning: green/amber/red cards for health status
- Summary → Detail animation: tap card to expand into full view
- Bottom tab navigation (mobile-native feel even on desktop)
- Large, bold numbers for metrics. Small, muted labels.
- Widget-style composition: owner sees venue health widgets, manager sees task widgets

**Best For:** Quick-glance workflows, mobile-first users, baristas

**Risk:** May feel too "consumer app" for enterprise buyers

---

### Option D: "Control" — Vercel-Style Dark Command Center
**Philosophy:** Real-time awareness. Terminal meets design. Status is everything.

**Inspiration:** Vercel, GitHub, Railway, Datadog

**Key Traits:**
- Dark-first design (light mode as secondary)
- Monospace typography for data, sans-serif for navigation
- Top-aligned tabs for primary navigation, no sidebar
- Status-strip: thin colored bar at top showing system health
- Real-time feel: timestamps, activity streams, log-style entries
- Subtle grid backgrounds, technical aesthetic
- High contrast: white text on near-black, green/red for status
- Compact density: more information per screen

**Best For:** Technical operators, multi-venue monitoring, power users

**Risk:** May intimidate non-technical baristas. Dark mode isn't universally preferred.

---

### Option E: "Canvas" — Stripe-Inspired Clean Professional
**Philosophy:** Trust through whitespace. Let content breathe. Confidence through restraint.

**Inspiration:** Stripe, Resend, Clerk, Linear's marketing site

**Key Traits:**
- Generous whitespace — 40% of screen is breathing room
- Left sidebar (subtle, light gray background, no borders)
- Content hierarchy through font weight alone (800 for titles, 400 for body)
- Subtle purple/blue gradient accents (never on backgrounds, only on small elements)
- Tab groups within content area for sub-navigation
- Empty states are beautiful — illustrations + clear CTAs
- Modals over drawers for focused actions
- Micro-interactions: subtle hover lifts, smooth page transitions

**Best For:** Global debut, broad audience, professional buyers

**Risk:** May feel "too simple" for power users who want density

---

## 4. Comparative Matrix

| Criterion | A: Command | B: Blocks | C: Glance | D: Control | E: Canvas |
|-----------|-----------|-----------|-----------|-----------|-----------|
| **Learning curve** | High | Medium | Low | Medium | Low |
| **Information density** | Very High | Medium | Low-Medium | High | Medium |
| **Mobile experience** | Weak | Good | Excellent | Weak | Good |
| **Customization** | Low | Very High | Low | Low | Low |
| **Implementation effort** | Medium | High | Medium | Medium | Low |
| **Global appeal** | Niche | Broad | Broad | Niche | Very Broad |
| **Power user fit** | Excellent | Good | Weak | Excellent | Good |
| **New user fit** | Weak | Medium | Excellent | Weak | Excellent |
| **Role differentiation** | Good | Excellent | Good | Good | Good |
| **Brand distinctiveness** | High | Medium | Medium | High | Medium |

---

## 5. Recommendation

**For global debut, Option E ("Canvas") is the strongest primary direction**, with selective borrowing from:
- **Option C** for the mobile experience and card-based metric visualization
- **Option A** for a Cmd+K command palette as a power-user accelerator

This gives you:
- Clean professional appearance that builds trust
- Low learning curve for all three roles
- Strong mobile experience
- Room for power-user features without cluttering the default view
- Implementation effort that respects existing React + CSS architecture

### Hybrid Strategy
```
Base:    Option E (Canvas) — layout, typography, whitespace, navigation
Borrow:  Option C (Glance) — card metrics, status visualization, mobile tabs
Borrow:  Option A (Command) — Cmd+K palette for keyboard navigation
```

---

## 6. Browsable Mockups

Each option has an interactive HTML mockup showing the **Manager's Today view** (the highest-traffic screen) with real VOIS content:

| File | Direction |
|------|-----------|
| `mockup-a-command.html` | Linear-inspired Command Interface |
| `mockup-b-blocks.html` | Notion-style Modular Workspace |
| `mockup-c-glance.html` | Apple Health / Craft Intelligence Hub |
| `mockup-d-control.html` | Vercel-style Dark Command Center |
| `mockup-e-canvas.html` | Stripe-inspired Clean Professional |

Open any file in a browser to explore the mockup.

---

## 7. Research Sources

- [7 SaaS UI Design Trends in 2026](https://www.saasui.design/blog/7-saas-ui-design-trends-2026)
- [Linear Design: The SaaS trend that's bettering UI](https://blog.logrocket.com/ux-design/linear-design/)
- [How Linear redesigned their UI](https://linear.app/now/how-we-redesigned-the-linear-ui)
- [Linear Design System — Figma](https://www.figma.com/community/file/1222872653732371433/linear-design-system)
- [Figma Dashboard Templates](https://www.figma.com/templates/dashboard-designs/)
- [Multi-role Dashboard UI Kit — Figma](https://www.figma.com/community/file/1045704369785737014/multi-role-dashboard-ui-kit)
- [Minimalist Design System — Figma](https://www.figma.com/community/file/994442968998465538/minimalist-design-system)
- [Task Management Dashboard — Figma](https://www.figma.com/community/file/1584063380589294454/task-management-time-tracking-web-dashboard-free-figma-template)
- [Plan It — Task & Project Management UI Kit](https://www.figma.com/community/file/1291115639727516852/plan-it-free-task-project-management-dashboard-ui-kit)
- [Minimal Apps Concepts — Figma](https://www.figma.com/community/file/1368915405319760536/minimal-apps-concepts-ux-ui-free-figma-template)
- [Curated Dashboard Design Examples 2026 — Muzli](https://muz.li/blog/best-dashboard-design-examples-inspirations-for-2026/)
- [SaaS Design Trends & Best Practices 2026](https://jetbase.io/blog/saas-design-trends-best-practices)
- [Operations Dashboard Examples & Templates 2026](https://flydash.io/blogs/operations-dashboard-examples)
