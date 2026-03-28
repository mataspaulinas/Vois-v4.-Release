# Real Authentication & Authorization Matrix

Status: active rollout contract  
Scope: temporary hosted launch and ongoing development

## Identity model

- identity provider: Firebase Authentication
- initial transport: Firebase ID token on protected API requests
- backend authority: FastAPI route dependencies and access guards
- frontend authority: none; frontend only adapts shell/UI after backend-authenticated identity is known

## Launch roles

- `owner`
  - portfolio visibility
  - owner shell
  - manager shell
  - reference / KB / reports / history
  - venue creation and ontology binding changes
  - organization export / backup / delete-readiness visibility
- `manager`
  - manager shell
  - venue execution workspace
  - assessments, engine runs, plans, follow-ups, escalations, evidence, progress, help handling
  - reference / KB / reports / history within assigned venue scope
- `barista`
  - pocket shell
  - current shift, standards, help, report/log flows
  - task status/proof/comment actions within assigned venue scope
  - no portfolio, no owner shell, no global admin actions
- `developer`
  - diagnostics, ontology workbench, mount inspection, legacy parity bridge
  - portfolio visibility
  - no hidden fallback identity; developer must be a real Firebase-authenticated role

## Route-class matrix

### Public

- `GET /api/v1/health`
- `GET /api/v1/health/ready`

### Authenticated any role

- `GET /api/v1/auth/me`
- `GET /api/v1/bootstrap`
- venue-scoped reads guarded by organization and venue access checks

### Owner only

- `POST /api/v1/venues`
- organization export / readiness routes
- owner-only people intelligence routes

### Owner or manager

- assessment create / mutate / run
- direct engine runs
- plan mutation and activation
- progress entries
- integration event ingestion and retries
- people/team execution routes

### Owner or manager or barista

- plan task updates
- task comments
- follow-ups
- evidence
- friction reports
- help requests
- pocket shell task/proof/help/log flows

### Developer only

- ontology mount inspection and workbench routes
- ontology import / publish / evaluation routes
- legacy engine bridge
- developer diagnostics and parity-only paths

## Non-negotiable auth laws

- no `X-OIS-User-Id` auth in live environments
- no bootstrap fallback auth in live environments
- no frontend-only protection for sensitive actions
- every protected endpoint must authenticate and authorize on the backend
- Firebase custom claims are the runtime role truth
- internal DB user rows exist for tenancy, venue membership, and audit linkage; they do not replace claim truth

## Operational notes

- local password sessions may remain available only when `ALLOW_LOCAL_PASSWORD_AUTH=true`
- managed session inventory is meaningful only for local/session-cookie auth mode
- the temporary hosted launch is expected to run with:
  - `AUTH_PROVIDER=firebase`
  - `ALLOW_LOCAL_PASSWORD_AUTH=false`
  - `ALLOW_LEGACY_HEADER_AUTH=false`
  - `ALLOW_BOOTSTRAP_FALLBACK=false`
