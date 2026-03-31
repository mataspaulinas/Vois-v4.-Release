# VOIS RPA-02 — Role Boundary Matrix

Use this as the release law for shell containment.

Legend:
- Allowed
- Visible only
- Forbidden
- Needs explicit policy

## Shared operational spine

| Surface | Owner | Manager | Pocket |
|---|---|---|---|
| Portfolio | Allowed | Visible only? | Forbidden |
| Venue Overview | Allowed | Allowed | Forbidden by default |
| Assessment | Allowed / Visible only | Allowed | Forbidden |
| Report | Allowed | Allowed | Forbidden |
| Plan | Allowed / Visible only | Allowed | Forbidden |
| History / Compare | Allowed | Allowed | Forbidden |
| Console | Allowed | Visible only? | Forbidden |

## Owner shell

| Surface | Owner | Manager | Pocket |
|---|---|---|---|
| Command | Allowed | Forbidden | Forbidden |
| Delegations | Allowed | Visible only? | Forbidden |
| People Intelligence | Allowed | Visible only? | Forbidden |

## Manager shell

| Surface | Owner | Manager | Pocket |
|---|---|---|---|
| Today | Visible only? | Allowed | Forbidden |
| Workspace | Forbidden by default | Allowed | Forbidden |
| Evidence Hub | Visible only? | Allowed | Limited / task-scoped only |
| Escalation Channel | Visible only | Allowed | Report-path only |
| Team Pulse | Visible only? | Allowed | Forbidden |

## Pocket shell

| Surface | Owner | Manager | Pocket |
|---|---|---|---|
| My Shift | Forbidden | Visible only? | Allowed |
| Task Detail | Forbidden | Visible only? | Allowed |
| Standards | Forbidden | Visible only? | Allowed |
| Ask for Help | Forbidden | Visible only? | Allowed |
| Report Something | Forbidden | Visible only? | Allowed |
| My Log | Forbidden | Visible only? | Allowed |

## Support/system surfaces

| Surface | Owner | Manager | Pocket |
|---|---|---|---|
| Search / Command | Allowed | Allowed | Allowed with strict scope |
| Notifications | Allowed | Allowed | Allowed with strict scope |
| Settings | Allowed | Allowed | Limited |
| Reference | Allowed | Allowed | Needs explicit Pocket-safe policy |
| Knowledge Base | Allowed | Allowed | Needs explicit Pocket-safe policy |
| Copilot | Allowed | Allowed | Allowed only in Pocket-safe help lane |

## Non-negotiable laws

1. Pocket must never see owner or manager private thread context.
2. Pocket must never browse strategic diagnosis or plan architecture.
3. Owner should not be dropped into frontline clutter by default.
4. Manager should not inherit owner strategic residue inside execution surfaces.
5. Search, notifications, inspectors, drawers, and Copilot must obey the same role law as main routes.
