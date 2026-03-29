"""Seed a showcase workspace with 3 months of realistic operational data.

Invoke: ``python -m app.scripts.seed_showcase``

Creates the "Northside Collective" — a small, ambitious cafe group in Vilnius
that adopted VOIS 3 months ago and has been using it with discipline and
commitment. The data tells a story of professional improvement across 3 venues.
"""
from __future__ import annotations

import random as _random_mod
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.domain import (
    Assessment,
    AuditEntry,
    AuthRole,
    CopilotAuthorRole,
    CopilotMessage,
    CopilotThread,
    EngineRun,
    Escalation,
    EscalationSeverity,
    EscalationStatus,
    Evidence,
    FollowUp,
    FollowUpStatus,
    HelpRequest,
    HelpRequestStatus,
    KBReadingState,
    NotificationChannel,
    NotificationEvent,
    NotificationLevel,
    OperationalPlan,
    Organization,
    OrganizationMembership,
    PlanStatus,
    PlanTask,
    ProgressEntry,
    ProgressEntryType,
    Role,
    SystemicFlag,
    TaskComment,
    TaskEvent,
    TaskEventType,
    TaskStatus,
    ThreadScope,
    User,
    Venue,
    VenueAccessAssignment,
    VenueStatus,
    CommentVisibility,
)
from app.services.auth import hash_password
from app.services.bootstrap import _default_seed_mount
from app.services.ontology import get_ontology_repository
from app.services.ontology_bindings import set_venue_binding

# ─── Constants ────────────────────────────────────────────────────────────────

RNG = _random_mod.Random(42)
UID = lambda: str(uuid4())  # noqa: E731
PASSWORD = "ois-demo-2026"
EPOCH = datetime(2026, 1, 5, 8, 0, 0, tzinfo=timezone.utc)  # Monday, start of showcase

def ts(week: int = 0, day: int = 0, hour: int = 9, minute: int = 0) -> datetime:
    """Deterministic timestamp relative to EPOCH."""
    return EPOCH + timedelta(weeks=week, days=day, hours=hour - 8, minutes=minute)

def jitter(base: datetime, hours: float = 4.0) -> datetime:
    return base + timedelta(minutes=RNG.randint(0, int(hours * 60)))

# Signal schedule per venue per week (adapter alias format: S001, S005, etc.)
# Month 1: many signals (problems found). Month 2: fewer. Month 3: few remaining.
SIGNAL_SCHEDULES = {
    "northside-original": [
        # Wk0-3: discovery
        ["S001","S005","S019","S036","S053","S069","S085","S099","S129","S175","S003","S007","S021","S037","S055","S071","S100","S176"],
        ["S001","S005","S019","S036","S053","S069","S085","S099","S129","S175","S003","S021","S055","S100","S176","S037"],
        ["S005","S019","S036","S053","S069","S085","S099","S129","S175","S003","S021","S055","S100"],
        ["S019","S036","S053","S069","S085","S099","S129","S175","S021","S055","S100"],
        # Wk4-7: momentum
        ["S019","S053","S085","S099","S129","S175","S021","S055"],
        ["S019","S053","S085","S099","S129","S021"],
        ["S085","S099","S129","S053","S019"],
        ["S085","S099","S129","S019"],
        # Wk8-11: mastery
        ["S085","S099","S129"],
        ["S085","S099"],
        ["S085","S099"],
        ["S099"],
    ],
    "northside-riverside": [
        ["S001","S005","S019","S036","S053","S069","S085","S099","S129","S175","S007","S022","S038","S056","S072","S101","S130","S177","S054"],
        ["S001","S005","S019","S036","S053","S069","S085","S099","S129","S175","S007","S038","S056","S101","S177"],
        ["S005","S019","S036","S053","S069","S085","S099","S129","S175","S038","S056","S101"],
        ["S019","S036","S053","S069","S085","S099","S129","S175","S056","S101"],
        ["S019","S053","S069","S085","S099","S129","S175","S056"],
        ["S053","S085","S099","S129","S175","S056"],
        ["S085","S099","S129","S175"],
        ["S085","S099","S129"],
        ["S085","S099","S129"],
        ["S085","S099"],
        ["S085","S099"],
        ["S099"],
    ],
    "northside-market": [
        ["S001","S005","S019","S036","S053","S069","S085","S099","S129","S175","S009","S023","S039","S057","S073","S102","S131","S178","S070","S086"],
        ["S001","S005","S019","S036","S053","S069","S085","S099","S129","S175","S023","S057","S102","S070","S086"],
        ["S005","S019","S036","S069","S085","S099","S129","S175","S057","S070","S086"],
        ["S019","S036","S069","S085","S099","S129","S175","S070","S086"],
        ["S019","S069","S085","S099","S129","S175","S070"],
        ["S069","S085","S099","S129","S070"],
        ["S085","S099","S129","S069"],
        ["S085","S099","S069"],
        ["S085","S099"],
        ["S085","S099"],
        ["S099"],
        ["S099"],
    ],
}

TASK_TEMPLATES = [
    ("Implement daily temperature monitoring protocol", "B001", "critical", 3.0, [{"label":"Install digital thermometer","completed":True},{"label":"Create log sheet template","completed":True},{"label":"Train team on recording","completed":True}], [{"label":"Temperature log folder in place","completed":True}]),
    ("Establish cleaning schedule and accountability", "B002", "critical", 4.0, [{"label":"Design cleaning rotation matrix","completed":True},{"label":"Post in staff area","completed":True},{"label":"Set up daily sign-off","completed":True}], [{"label":"Weekly audit of cleaning logs","completed":True}]),
    ("Reduce peak hour queue times", "B006", "high", 5.0, [{"label":"Map peak hour bottlenecks","completed":True},{"label":"Rearrange station layout","completed":True},{"label":"Cross-train 2 staff on register","completed":True},{"label":"Pilot express lane","completed":False}], [{"label":"Average wait time under 4 min","completed":False}]),
    ("Standardize espresso calibration routine", "B011", "high", 3.0, [{"label":"Write calibration SOP","completed":True},{"label":"Train baristas on dialing in","completed":True},{"label":"Install calibration log","completed":True}], [{"label":"Taste consistency score >8/10","completed":True}]),
    ("Build staff training program", "B020", "high", 6.0, [{"label":"Design onboarding checklist","completed":True},{"label":"Create skills matrix","completed":True},{"label":"Schedule monthly skill reviews","completed":True},{"label":"Set up buddy system","completed":True}], [{"label":"All staff complete core module","completed":True}]),
    ("Optimize opening and closing routines", "B014", "normal", 3.0, [{"label":"Document opening checklist","completed":True},{"label":"Document closing checklist","completed":True},{"label":"Time trial run","completed":True}], [{"label":"Opening under 30 minutes","completed":True}]),
    ("Review supplier contracts and alternatives", "B007", "normal", 4.0, [{"label":"Audit current contracts","completed":True},{"label":"Research alternative roasters","completed":False},{"label":"Request sample batches","completed":False}], [{"label":"Supplier comparison matrix","completed":False}]),
    ("Implement daily revenue tracking", "B008", "high", 3.0, [{"label":"Set up daily sales dashboard","completed":True},{"label":"Define target metrics","completed":True},{"label":"Train managers on reading data","completed":True}], [{"label":"Daily targets visible to team","completed":True}]),
    ("Address maintenance backlog", "B009", "normal", 5.0, [{"label":"List all pending repairs","completed":True},{"label":"Prioritize by impact","completed":True},{"label":"Get quotes for top 5","completed":True},{"label":"Schedule first 3 repairs","completed":False}], [{"label":"Critical items resolved","completed":False}]),
    ("Establish customer feedback loop", "B010", "normal", 3.0, [{"label":"Choose feedback mechanism","completed":True},{"label":"Train team on asking","completed":True},{"label":"Weekly review of feedback","completed":True}], [{"label":"Monthly NPS baseline set","completed":True}]),
    ("Create waste tracking system", "B012", "normal", 2.0, [{"label":"Design waste log","completed":True},{"label":"Train team","completed":True}], [{"label":"Weekly waste report generated","completed":True}]),
    ("Set up team communication channel", "B013", "normal", 1.0, [{"label":"Choose platform","completed":True},{"label":"Create venue group","completed":True}], [{"label":"All staff onboarded","completed":True}]),
]

PROGRESS_TEMPLATES = {
    ProgressEntryType.NOTE: [
        "Morning prep completed smoothly. Team focused and ready.",
        "Noticed improved consistency in espresso pulls today.",
        "Quiet afternoon — used time for deep cleaning of milk stations.",
        "New delivery arrived on time. Quality looks good.",
        "Team handled lunch rush well. Queue stayed under 3 minutes.",
        "Reviewed yesterday's sales numbers. Trending up 8% week-over-week.",
        "Had a good conversation with the evening team about standards.",
        "Customer complimented the latte art today. Team proud.",
        "Inventory check done. Need to reorder oat milk by Thursday.",
        "All opening checklists completed before doors opened.",
    ],
    ProgressEntryType.UPDATE: [
        "Completed staff training session on food safety. All attended.",
        "New cleaning schedule posted and signed by all team members.",
        "Temperature monitoring logs are now consistent for 2 weeks straight.",
        "Espresso calibration routine is becoming second nature for the team.",
        "Reduced average peak wait time from 7 to 4 minutes this week.",
    ],
    ProgressEntryType.MILESTONE: [
        "First month of 100% food safety compliance achieved!",
        "Zero customer complaints this week — first time since opening.",
        "All active plan tasks for this phase are now completed.",
        "Team NPS score reached 72 — up from 45 at baseline.",
        "Revenue per hour exceeded target by 12% this month.",
    ],
    ProgressEntryType.RISK: [
        "Coffee roaster delayed delivery by 3 days. Need backup plan.",
        "One staff member called in sick during peak shift. Managed but tight.",
        "Equipment maintenance for grinder is overdue. Scheduling priority.",
    ],
    ProgressEntryType.DECISION: [
        "Decided to switch to dual-supplier model for coffee beans.",
        "Approved budget for new espresso machine maintenance contract.",
        "Agreed to pilot express lane concept during Friday lunch peaks.",
    ],
}

COPILOT_VENUE_MESSAGES = [
    ("user", "What should I focus on this week based on the latest assessment?"),
    ("assistant", "Based on your latest assessment, the top priority signals are in food safety and peak management. I'd recommend focusing on completing the temperature monitoring protocol — it's the highest-impact item with the lowest effort remaining."),
    ("user", "The team finished the cleaning schedule task yesterday. What's next?"),
    ("assistant", "Great progress. With cleaning covered, the next high-priority item is espresso calibration (B011). Your assessment shows S036 still active — inconsistent drink quality is your biggest customer-facing signal right now."),
    ("user", "We had a really busy Saturday. Queue times were bad again."),
    ("assistant", "I see S019 (queue wait times) is still flagged. The data shows peaks between 11:30-13:00. Consider cross-training one more person on register and testing the express lane concept. Your plan already has this as a task — shall I check its status?"),
    ("user", "Can you summarize our progress over the last month?"),
    ("assistant", "Over the past 4 weeks: you resolved 8 signals (down from 18 to 10), completed 14 of 22 plan tasks, and your food safety compliance is now at 100%. The biggest wins were temperature monitoring and the cleaning schedule. Remaining focus areas are queue management and supplier diversification."),
    ("user", "I want to understand why supplier issues keep recurring."),
    ("assistant", "S085 (single roaster dependency) has appeared in all 8 assessments. This is a systemic pattern. The current response pattern (RP007) suggests dual-sourcing, but the task for supplier research is only 40% complete. I'd flag this as a systemic issue to keep it visible at the portfolio level."),
    ("user", "The team morale is really high right now. Everyone's engaged."),
    ("assistant", "That's consistent with what I see in the data. Task completion velocity increased 40% in the last 3 weeks, all follow-ups are being acknowledged within 24 hours, and help requests from baristas are being resolved same-day. The system adoption is strong."),
    ("user", "What does our trend look like for this venue compared to when we started?"),
    ("assistant", "Dramatic improvement. Week 1: 18 active signals, overloaded plan. Now: 3 active signals, light plan. Your operational health score would be in the top quartile. The remaining signals (S085 supply chain, S099 cost optimization) are strategic, not urgent."),
    ("user", "How should I prepare for next week's assessment?"),
    ("assistant", "Review the 3 remaining active signals and document any new observations from this week. Pay attention to whether the supplier situation has changed and note any cost metrics from the daily dashboard. A focused 200-word input should give the engine plenty to work with."),
]

COPILOT_GLOBAL_MESSAGES = [
    ("user", "Give me the portfolio pulse. How are the three venues doing?"),
    ("assistant", "Portfolio overview: Original is performing strongest — down to 1 active signal (S099, cost optimization). Riverside has 2 active signals, showing good momentum. Market has the most work remaining with 2 signals but the team is making fast progress. Overall trajectory is positive across all three."),
    ("user", "Where should I focus my time as owner this week?"),
    ("assistant", "I'd recommend spending time at Market this week. Ieva's team is making good progress but they have the highest signal density per seat. Your presence there signals support during their improvement push. Original and Riverside are running well independently."),
    ("user", "Are there any patterns I'm seeing across all three venues?"),
    ("assistant", "One clear systemic pattern: S085 (single roaster dependency) appears across all three venues. This is a portfolio-level risk, not a venue-level one. Consider negotiating a group supply agreement. Also, S099 (revenue optimization) is shared — a portfolio-level pricing review might be more efficient than venue-by-venue work."),
    ("user", "I'm thinking about opening a fourth location. What does the data tell me about readiness?"),
    ("assistant", "Based on current data: your operational maturity is high. Original is in steady-state, Riverside is nearly there, and Market is on track. Key readiness indicators: all venues have active plans with >60% completion, signal counts are trending toward zero, and team engagement metrics are strong. The main risk is management bandwidth — ensure you have a strong manager candidate before committing."),
    ("user", "What's the biggest risk across the portfolio right now?"),
    ("assistant", "Supply chain concentration. All three venues depend on the same single roaster. If they have a disruption, you have no backup for any location. The dual-sourcing task is in progress at Original but hasn't started at the others. I'd prioritize making this a portfolio-wide initiative."),
]


# ─── Core seed function ───────────────────────────────────────────────────────

def seed_showcase(session: Session) -> None:
    existing = session.scalar(select(Organization).where(Organization.slug == "northside-collective"))
    if existing is not None:
        print("[seed_showcase] Organization 'northside-collective' already exists. Skipping.")
        return

    mount = _default_seed_mount()
    repo = get_ontology_repository()
    print(f"[seed_showcase] Using ontology mount: {mount.ontology_id} {mount.version}")

    # ── Layer 1: Org, Venues, Users ──
    org = Organization(name="Northside Collective", slug="northside-collective", region="europe", data_residency="eu-central")
    session.add(org)
    session.flush()

    venues = {}
    for slug, name, concept, size, cap in [
        ("northside-original", "Northside Original", "Flagship specialty cafe in Old Town", "80 seats", {"leadership_strength":"strong","volatility":"low","management_hours_available":"10","staff_count":"12"}),
        ("northside-riverside", "Northside Riverside", "Neighborhood cafe on the river", "50 seats", {"leadership_strength":"medium","volatility":"medium","management_hours_available":"8","staff_count":"8"}),
        ("northside-market", "Northside Market", "Fast-paced market hall cafe", "30 seats", {"leadership_strength":"medium","volatility":"high","management_hours_available":"6","staff_count":"5"}),
    ]:
        v = Venue(organization_id=org.id, name=name, slug=slug, status=VenueStatus.ACTIVE, concept=concept, location="Vilnius, Lithuania", size_note=size, capacity_profile=cap)
        session.add(v)
        session.flush()
        venues[slug] = v
        set_venue_binding(session, v, repo, ontology_id=mount.ontology_id, ontology_version=mount.version, bound_by=None)

    pw = hash_password(PASSWORD)
    users = {}
    user_defs = [
        ("tomas@northside.lt", "Tomas Vaiciunas", Role.PORTFOLIO_DIRECTOR, None),
        ("ruta@northside.lt", "Ruta Kazlauskiene", Role.VENUE_MANAGER, "northside-original"),
        ("mantas@northside.lt", "Mantas Jonaitis", Role.VENUE_MANAGER, "northside-riverside"),
        ("ieva@northside.lt", "Ieva Stankeviciute", Role.VENUE_MANAGER, "northside-market"),
        ("lukas@northside.lt", "Lukas Grinius", Role.EMPLOYEE, "northside-original"),
        ("gabija@northside.lt", "Gabija Petraityte", Role.EMPLOYEE, "northside-riverside"),
    ]
    auth_role_map = {
        Role.PORTFOLIO_DIRECTOR: AuthRole.OWNER,
        Role.VENUE_MANAGER: AuthRole.MANAGER,
        Role.EMPLOYEE: AuthRole.BARISTA,
    }
    for email, name, role, venue_slug in user_defs:
        u = User(organization_id=org.id, venue_id=venues[venue_slug].id if venue_slug else None, email=email, full_name=name, role=role, password_hash=pw)
        session.add(u)
        session.flush()
        users[email] = u
        session.add(OrganizationMembership(organization_id=org.id, user_id=u.id, role_claim=auth_role_map[role], created_by=u.id))

    # Venue access: managers get their venue, Tomas + Lukas get all
    tomas = users["tomas@northside.lt"]
    lukas = users["lukas@northside.lt"]
    for slug, v in venues.items():
        session.add(VenueAccessAssignment(organization_id=org.id, venue_id=v.id, user_id=tomas.id))
        session.add(VenueAccessAssignment(organization_id=org.id, venue_id=v.id, user_id=lukas.id))
    for email, _, _, venue_slug in user_defs:
        if venue_slug and users[email].id not in (tomas.id, lukas.id):
            session.add(VenueAccessAssignment(organization_id=org.id, venue_id=venues[venue_slug].id, user_id=users[email].id))
    session.flush()
    print(f"[seed_showcase] Created org + 3 venues + 6 users")

    # Venue → manager mapping for convenience
    venue_managers = {
        "northside-original": users["ruta@northside.lt"],
        "northside-riverside": users["mantas@northside.lt"],
        "northside-market": users["ieva@northside.lt"],
    }

    # ── Layer 2: Assessments + Engine Runs ──
    engine_runs = {}  # (slug, week) → EngineRun
    assessments_all = {}
    for slug, v in venues.items():
        manager = venue_managers[slug]
        schedule = SIGNAL_SCHEDULES[slug]
        for week in range(12):
            sig_ids = schedule[week]
            sig_states = {s: {"active": True, "severity": "high" if s in ("S001","S005") else "medium"} for s in sig_ids}
            load = "overloaded" if week < 2 else "high" if week < 4 else "medium" if week < 8 else "light"
            a = Assessment(
                venue_id=v.id, created_by=manager.id,
                assessment_type="full_diagnostic",
                assessment_date=ts(week).date().isoformat(),
                ontology_id=mount.ontology_id, ontology_version=mount.version,
                core_canon_version="v3", adapter_id="cafe", manifest_digest="showcase-seed",
                management_hours_available=float(v.capacity_profile.get("management_hours_available", "8")),
                weekly_effort_budget=float(v.capacity_profile.get("management_hours_available", "8")),
                selected_signal_ids=sig_ids,
                signal_states=sig_states,
                raw_input_text=_assessment_narrative(v.name, week, len(sig_ids)),
                raw_intake_payload={"source": "showcase_seed", "week": week},
                venue_context_json={"name": v.name, "concept": v.concept},
                created_at=jitter(ts(week, hour=9)),
            )
            session.add(a)
            session.flush()
            assessments_all[(slug, week)] = a

            norm_sigs = [{"signal_id": s, "severity": "high" if s in ("S001","S005") else "medium", "confidence": round(RNG.uniform(0.7, 0.95), 2)} for s in sig_ids]
            er = EngineRun(
                venue_id=v.id, assessment_id=a.id, created_by=manager.id,
                ontology_id=mount.ontology_id, ontology_version=mount.version,
                core_canon_version="v3", adapter_id="cafe", manifest_digest="showcase-seed",
                plan_load_classification=load,
                report_markdown=_report_markdown(v.name, week, sig_ids, load),
                report_json={"signals_count": len(sig_ids), "load": load},
                normalized_signals_json=norm_sigs,
                diagnostic_snapshot_json={"venue": v.name, "week": week},
                plan_snapshot_json={"load": load, "tasks_suggested": max(5, 22 - week * 2)},
                created_at=jitter(ts(week, hour=10)),
            )
            session.add(er)
            session.flush()
            engine_runs[(slug, week)] = er
    session.flush()
    print(f"[seed_showcase] Created {len(assessments_all)} assessments + engine runs")

    # ── Layer 3: Plans + Tasks ──
    all_tasks = {}  # (slug, plan_idx, task_idx) → PlanTask
    all_plans = {}  # (slug, plan_idx) → OperationalPlan
    for slug, v in venues.items():
        manager = venue_managers[slug]
        for plan_idx, (src_week, status, task_count, effort_mult) in enumerate([
            (0, PlanStatus.ARCHIVED, 12, 1.0),
            (4, PlanStatus.ARCHIVED, 10, 0.7),
            (8, PlanStatus.ACTIVE, 8, 0.5),
        ]):
            er = engine_runs[(slug, src_week)]
            total_effort = sum(t[3] for t in TASK_TEMPLATES[:task_count]) * effort_mult
            plan = OperationalPlan(
                engine_run_id=er.id, venue_id=v.id,
                title=f"{'Q1' if plan_idx < 2 else 'Q2'} {v.name} Plan {plan_idx + 1}",
                summary=f"{'Foundation overhaul' if plan_idx == 0 else 'Refinement' if plan_idx == 1 else 'Optimization'} plan for {v.name}",
                status=status, total_effort_hours=round(total_effort, 1),
                ontology_id=mount.ontology_id, ontology_version=mount.version,
                core_canon_version="v3", adapter_id="cafe", manifest_digest="showcase-seed",
                snapshot_json={"task_count": task_count},
                created_at=jitter(ts(src_week, hour=11)),
            )
            if status == PlanStatus.ARCHIVED:
                plan.archived_at = jitter(ts(src_week + 3, hour=16))
            session.add(plan)
            session.flush()
            all_plans[(slug, plan_idx)] = plan

            for ti in range(task_count):
                tmpl = TASK_TEMPLATES[ti % len(TASK_TEMPLATES)]
                title, block_id, priority, effort, sub_actions, deliverables = tmpl
                # Determine task status
                if status == PlanStatus.ARCHIVED:
                    t_status = TaskStatus.COMPLETED if RNG.random() < 0.9 else TaskStatus.DEFERRED
                elif status == PlanStatus.ACTIVE:
                    r = RNG.random()
                    t_status = TaskStatus.COMPLETED if r < 0.6 else TaskStatus.IN_PROGRESS if r < 0.85 else TaskStatus.NOT_STARTED
                else:
                    t_status = TaskStatus.NOT_STARTED

                started = jitter(ts(src_week, day=RNG.randint(0, 6)), 8) if t_status != TaskStatus.NOT_STARTED else None
                completed = jitter(started + timedelta(days=RNG.randint(2, 10)), 4) if t_status == TaskStatus.COMPLETED and started else None
                due = ts(src_week + 3, day=RNG.randint(0, 6))

                task = PlanTask(
                    plan_id=plan.id, block_id=block_id,
                    title=f"{title} ({v.name.split()[-1]})",
                    status=t_status, order_index=ti,
                    effort_hours=round(effort * effort_mult, 1),
                    rationale=f"Addresses signals detected in week {src_week} assessment.",
                    dependencies=[], trace={"source_week": src_week},
                    notes=f"Assigned during plan {plan_idx + 1}." if t_status != TaskStatus.NOT_STARTED else None,
                    assigned_to=manager.full_name, assignee_user_id=manager.id,
                    assignee_name=manager.full_name,
                    layer="L1" if priority == "critical" else "L2" if priority == "high" else "L3",
                    timeline_label=f"Week {src_week + ti // 4 + 1}",
                    priority=priority,
                    sub_actions=sub_actions, deliverables=deliverables,
                    due_at=due, started_at=started, completed_at=completed,
                    created_at=jitter(ts(src_week, hour=11)),
                )
                session.add(task)
                session.flush()
                all_tasks[(slug, plan_idx, ti)] = task
    session.flush()
    print(f"[seed_showcase] Created {len(all_plans)} plans + {len(all_tasks)} tasks")

    # ── Layer 4: Progress Entries ──
    pe_count = 0
    for slug, v in venues.items():
        manager = venue_managers[slug]
        for day_offset in range(84):  # 12 weeks × 7 days
            if RNG.random() < 0.3:
                continue  # skip some days
            week = day_offset // 7
            etype = RNG.choices(
                [ProgressEntryType.NOTE, ProgressEntryType.UPDATE, ProgressEntryType.MILESTONE, ProgressEntryType.RISK, ProgressEntryType.DECISION],
                weights=[50, 20, 10 if week > 4 else 2, 10, 8],
            )[0]
            templates = PROGRESS_TEMPLATES[etype]
            entry = ProgressEntry(
                venue_id=v.id, entry_type=etype,
                summary=RNG.choice(templates),
                detail=f"Week {week + 1}, {v.name}",
                created_by=manager.id,
                created_at=jitter(ts(0, day=day_offset, hour=8), 10),
            )
            session.add(entry)
            pe_count += 1
    session.flush()
    print(f"[seed_showcase] Created {pe_count} progress entries")

    # ── Layer 5: Copilot Threads + Messages ──
    # Global thread
    gt = CopilotThread(organization_id=org.id, title="Portfolio operations pulse", scope=ThreadScope.GLOBAL, created_at=ts(0))
    session.add(gt)
    session.flush()
    for i, (role, content) in enumerate(COPILOT_GLOBAL_MESSAGES):
        session.add(CopilotMessage(
            thread_id=gt.id,
            author_role=CopilotAuthorRole.USER if role == "user" else CopilotAuthorRole.ASSISTANT,
            created_by=tomas.id if role == "user" else None,
            source_mode="manual_input" if role == "user" else "copilot_response",
            content=content, references=[],
            created_at=jitter(ts(i // 2, day=i % 7, hour=9), 2),
        ))

    msg_count = len(COPILOT_GLOBAL_MESSAGES)
    for slug, v in venues.items():
        vt = CopilotThread(organization_id=org.id, venue_id=v.id, title=f"{v.name} working thread", scope=ThreadScope.VENUE, created_at=ts(0))
        session.add(vt)
        session.flush()
        manager = venue_managers[slug]
        for i, (role, content) in enumerate(COPILOT_VENUE_MESSAGES):
            session.add(CopilotMessage(
                thread_id=vt.id,
                author_role=CopilotAuthorRole.USER if role == "user" else CopilotAuthorRole.ASSISTANT,
                created_by=manager.id if role == "user" else None,
                source_mode="manual_input" if role == "user" else "copilot_response",
                content=content, references=[],
                created_at=jitter(ts(i // 2, day=i % 5, hour=9), 3),
            ))
            msg_count += 1
    session.flush()
    print(f"[seed_showcase] Created copilot threads + {msg_count} messages")

    # ── Layer 6: Task Events + Comments ──
    te_count = 0
    tc_count = 0
    for key, task in all_tasks.items():
        slug = key[0]
        v = venues[slug]
        manager = venue_managers[slug]
        # Status changed event
        if task.status != TaskStatus.NOT_STARTED:
            if task.started_at:
                session.add(TaskEvent(task_id=task.id, event_type=TaskEventType.STATUS_CHANGED, status=TaskStatus.IN_PROGRESS, actor_user_id=manager.id, actor_name=manager.full_name, note="Started work on this task.", created_at=task.started_at))
                te_count += 1
            if task.completed_at:
                session.add(TaskEvent(task_id=task.id, event_type=TaskEventType.STATUS_CHANGED, status=TaskStatus.COMPLETED, actor_user_id=manager.id, actor_name=manager.full_name, note="Task completed successfully.", created_at=task.completed_at))
                te_count += 1
        # Comments on ~50% of tasks
        if RNG.random() < 0.5 and task.started_at:
            session.add(TaskComment(
                task_id=task.id, venue_id=v.id,
                author_user_id=manager.id, author_name=manager.full_name,
                body=RNG.choice([
                    "Making good progress on this. Should be done by end of week.",
                    "Team is engaged with this task. No blockers.",
                    "Completed the first two sub-actions. On track.",
                    "Discussed with Tomas — agreed on the approach.",
                    "This is having a visible impact already. Staff noticed.",
                ]),
                visibility=CommentVisibility.INTERNAL,
                created_at=jitter(task.started_at + timedelta(days=1), 8),
            ))
            tc_count += 1
    session.flush()
    print(f"[seed_showcase] Created {te_count} task events + {tc_count} task comments")

    # ── Layer 7: Follow-ups + Escalations ──
    fu_count = 0
    for slug, v in venues.items():
        manager = venue_managers[slug]
        active_plan = all_plans[(slug, 2)]
        active_tasks = [all_tasks[k] for k in all_tasks if k[0] == slug and k[1] == 2]
        for i, task in enumerate(active_tasks[:6]):
            st = FollowUpStatus.COMPLETED if i < 3 else FollowUpStatus.ACKNOWLEDGED if i < 5 else FollowUpStatus.PENDING
            fu = FollowUp(
                venue_id=v.id, task_id=task.id,
                title=f"Follow up: {task.title[:50]}",
                due_at=ts(10, day=i), assigned_to=manager.id, created_by=tomas.id,
                status=st,
                acknowledged_at=jitter(ts(9), 24) if st != FollowUpStatus.PENDING else None,
                completed_at=jitter(ts(10), 24) if st == FollowUpStatus.COMPLETED else None,
                notes="Checked in — on track." if st != FollowUpStatus.PENDING else None,
                created_at=jitter(ts(9), 4),
            )
            session.add(fu)
            fu_count += 1

    # Escalations — very few (professional team)
    esc_count = 0
    for slug in ["northside-riverside", "northside-market"]:
        v = venues[slug]
        manager = venue_managers[slug]
        session.add(Escalation(
            venue_id=v.id, reason="Supplier delivery delayed 3 days — risk to weekend service",
            created_by=manager.id, escalated_to=tomas.id,
            severity=EscalationSeverity.MEDIUM, status=EscalationStatus.RESOLVED,
            resolved_at=jitter(ts(6), 48),
            resolution_notes="Sourced backup from local roaster. Covered the gap.",
            created_at=jitter(ts(5, day=3), 4),
        ))
        esc_count += 1
    session.flush()
    print(f"[seed_showcase] Created {fu_count} follow-ups + {esc_count} escalations")

    # ── Layer 8: Help Requests ──
    hr_topics = [
        (users["lukas@northside.lt"], venues["northside-original"], "How to calibrate the new grinder", "The new Mahlkoenig has different settings. What's the recommended starting point?"),
        (users["lukas@northside.lt"], venues["northside-original"], "Temperature log question", "If the fridge reads 5.1C at morning check, do I need to escalate or just note it?"),
        (users["gabija@northside.lt"], venues["northside-riverside"], "Customer allergy question", "A customer asked about cross-contamination with nuts. What's our protocol?"),
        (users["gabija@northside.lt"], venues["northside-riverside"], "Register won't print receipts", "The receipt printer is jammed again. Tried the usual fix but no luck."),
        (users["lukas@northside.lt"], venues["northside-market"], "Peak hour station setup", "When helping at Market, what's their station layout during lunch peak?"),
    ]
    for i, (requester, v, title, prompt) in enumerate(hr_topics):
        hr_thread = CopilotThread(organization_id=org.id, venue_id=v.id, title=title, scope=ThreadScope.HELP_REQUEST, created_at=jitter(ts(3 + i), 4))
        session.add(hr_thread)
        session.flush()
        hr = HelpRequest(
            venue_id=v.id, title=title, prompt=prompt,
            requester_user_id=requester.id, channel="pocket",
            status=HelpRequestStatus.CLOSED,
            linked_thread_id=hr_thread.id,
            resolved_at=jitter(ts(3 + i, hour=14), 4),
            created_at=jitter(ts(3 + i, hour=10), 2),
        )
        session.add(hr)
        # Thread messages
        session.add(CopilotMessage(thread_id=hr_thread.id, author_role=CopilotAuthorRole.USER, created_by=requester.id, source_mode="manual_input", content=prompt, references=[], created_at=jitter(ts(3+i, hour=10), 1)))
        session.add(CopilotMessage(thread_id=hr_thread.id, author_role=CopilotAuthorRole.ASSISTANT, source_mode="copilot_response", content=f"Let me help with that. Based on the operational standards for {v.name}, here's what I'd recommend...", references=[], created_at=jitter(ts(3+i, hour=10, minute=5), 1)))
        session.add(CopilotMessage(thread_id=hr_thread.id, author_role=CopilotAuthorRole.USER, created_by=requester.id, source_mode="manual_input", content="Thanks, that's exactly what I needed!", references=[], created_at=jitter(ts(3+i, hour=10, minute=15), 1)))
    session.flush()
    print(f"[seed_showcase] Created {len(hr_topics)} help requests with threads")

    # ── Layer 9: Evidence ──
    ev_count = 0
    for slug, v in venues.items():
        manager = venue_managers[slug]
        for i, (title, etype) in enumerate([
            ("Temperature log — Week 1", "checklist"),
            ("Cleaning schedule sign-off", "document"),
            ("Station layout diagram", "document"),
            ("Customer feedback summary — January", "document"),
            ("Espresso calibration log", "checklist"),
            ("Team training attendance sheet", "document"),
            ("Morning prep photo", "photo"),
            ("Equipment maintenance receipt", "document"),
            ("Weekly sales dashboard screenshot", "photo"),
            ("Supplier delivery note", "document"),
            ("Customer comment card scan", "photo"),
            ("Health inspection certificate", "document"),
        ]):
            session.add(Evidence(
                venue_id=v.id, title=f"{title} — {v.name.split()[-1]}",
                evidence_type=etype, created_by=manager.id,
                description=f"Documentation for {v.name} operational improvement.",
                created_at=jitter(ts(i), 72),
            ))
            ev_count += 1
    session.flush()
    print(f"[seed_showcase] Created {ev_count} evidence items")

    # ── Layer 10: Notifications ──
    notif_count = 0
    all_users = list(users.values())
    for u in all_users:
        count = RNG.randint(30, 50)
        for i in range(count):
            week = i * 12 // count
            level = NotificationLevel.WARNING if RNG.random() < 0.15 else NotificationLevel.INFO
            read = jitter(ts(week, day=RNG.randint(0,6)), 24) if week < 10 else None
            session.add(NotificationEvent(
                organization_id=org.id, user_id=u.id,
                venue_id=RNG.choice(list(venues.values())).id,
                channel=NotificationChannel.IN_APP, level=level,
                title=RNG.choice([
                    "Assessment completed", "Plan task updated", "Follow-up acknowledged",
                    "New progress entry logged", "Engine run finished", "Team member commented",
                    "Help request resolved", "Weekly report ready", "Signal resolved",
                    "Milestone reached", "Task assigned to you", "Due date approaching",
                ]),
                body=f"Activity in the Northside Collective workspace.",
                entity_type="venue", entity_id=RNG.choice(list(venues.values())).id,
                read_at=read,
                created_at=jitter(ts(week, day=RNG.randint(0,6), hour=8), 10),
            ))
            notif_count += 1
    session.flush()
    print(f"[seed_showcase] Created {notif_count} notifications")

    # ── Layer 11: KB Reading State ──
    for email, u in users.items():
        blocks = [f"B{i:03d}" for i in range(1, 21)]
        if "tomas" in email:
            read = blocks[:16]
            bookmarked = blocks[:5]
            notes = {b: "Key operational block. Reviewed with team." for b in blocks[:8]}
            struggles = []
        elif u.role == Role.VENUE_MANAGER:
            read = blocks[:12]
            bookmarked = blocks[:3]
            notes = {b: "Applied in venue context." for b in blocks[:4]}
            struggles = [blocks[15]]
        else:
            read = blocks[:8]
            bookmarked = blocks[:2]
            notes = {blocks[0]: "Good reference for daily work."}
            struggles = [blocks[10], blocks[12]]
        session.add(KBReadingState(user_id=u.id, bookmarked_ids=bookmarked, read_ids=read, notes=notes, struggles=struggles))
    session.flush()
    print(f"[seed_showcase] Created 6 KB reading states")

    # ── Layer 12: Systemic Flags ──
    sf_count = 0
    for slug, v in venues.items():
        manager = venue_managers[slug]
        session.add(SystemicFlag(venue_id=v.id, signal_id="S085", signal_name="Single roaster dependency", flagged_by=manager.id, notes="Appears in every assessment. Portfolio-level risk.", created_at=ts(4)))
        session.add(SystemicFlag(venue_id=v.id, signal_id="S099", signal_name="Revenue per hour declining", flagged_by=tomas.id, notes="Persistent across venues. Needs strategic pricing review.", resolved_at=ts(10) if slug == "northside-original" else None, created_at=ts(5)))
        sf_count += 2
    session.flush()
    print(f"[seed_showcase] Created {sf_count} systemic flags")

    # ── Layer 13: Audit Entries ──
    ae_count = 0
    # Org creation
    session.add(AuditEntry(organization_id=org.id, actor_user_id=tomas.id, entity_type="organization", entity_id=org.id, action="created", payload={"name": org.name}, created_at=ts(0)))
    ae_count += 1
    # Venue creations
    for slug, v in venues.items():
        session.add(AuditEntry(organization_id=org.id, actor_user_id=tomas.id, entity_type="venue", entity_id=v.id, action="created", payload={"name": v.name}, created_at=ts(0, minute=ae_count)))
        ae_count += 1
    # User creations
    for email, u in users.items():
        session.add(AuditEntry(organization_id=org.id, actor_user_id=tomas.id, entity_type="user", entity_id=u.id, action="created", payload={"email": email}, created_at=ts(0, minute=ae_count)))
        ae_count += 1
    # Assessment submissions + plan activations
    for (slug, week), a in assessments_all.items():
        session.add(AuditEntry(organization_id=org.id, actor_user_id=venue_managers[slug].id, entity_type="assessment", entity_id=a.id, action="submitted", payload={"week": week}, created_at=a.created_at))
        ae_count += 1
    for key, plan in all_plans.items():
        session.add(AuditEntry(organization_id=org.id, actor_user_id=venue_managers[key[0]].id, entity_type="plan", entity_id=plan.id, action="activated" if plan.status == PlanStatus.ACTIVE else "archived", payload={"status": plan.status.value}, created_at=plan.created_at))
        ae_count += 1
    session.flush()
    print(f"[seed_showcase] Created {ae_count} audit entries")

    session.commit()
    print(f"[seed_showcase] Done. Northside Collective is live with 3 months of operational data.")


# ─── Narrative generators ─────────────────────────────────────────────────────

def _assessment_narrative(venue_name: str, week: int, signal_count: int) -> str:
    month = week // 4 + 1
    if month == 1:
        return (
            f"Week {week + 1} at {venue_name}. This is {'our first systematic review' if week == 0 else 'a follow-up assessment'}. "
            f"We identified {signal_count} active signals across food safety, service flow, and team readiness. "
            f"{'The team is motivated and ready to work through these systematically.' if week == 0 else 'Some early improvements are visible but most issues need sustained attention.'} "
            f"Management hours available: {'10' if 'Original' in venue_name else '8' if 'Riverside' in venue_name else '6'} per week."
        )
    elif month == 2:
        return (
            f"Week {week + 1} assessment for {venue_name}. Signal count is down to {signal_count} from our initial baseline. "
            f"Food safety protocols are now solid. Quality consistency has improved noticeably. "
            f"The team is proactively identifying issues before they become problems. "
            f"Focus this period: peak management and supplier diversification."
        )
    else:
        return (
            f"Week {week + 1} at {venue_name}. Only {signal_count} signal{'s' if signal_count != 1 else ''} remaining. "
            f"The operation is running smoothly. Most original issues have been resolved through disciplined execution. "
            f"Remaining signals are strategic (supply chain, cost optimization) rather than operational. "
            f"Team confidence is high and the culture of continuous improvement is well established."
        )


def _report_markdown(venue_name: str, week: int, signals: list[str], load: str) -> str:
    month = week // 4 + 1
    resolved = max(0, 18 - len(signals))
    return f"""# Operational Report — {venue_name}

**Assessment Week:** {week + 1} | **Load Classification:** {load} | **Active Signals:** {len(signals)}

## Executive Summary

{'This initial assessment reveals significant opportunities for operational improvement.' if week == 0 else f'The venue has resolved {resolved} signals since the initial assessment, demonstrating strong execution discipline.' if month > 1 else 'Continued progress on the operational improvement plan. The team is building momentum.'}

## Key Findings

- **Active signals:** {len(signals)} currently flagged
- **Priority areas:** {', '.join(signals[:3])} are the highest-impact items
- **Team engagement:** {'Building awareness and commitment' if month == 1 else 'High — proactive issue identification' if month == 2 else 'Excellent — system mastery achieved'}

## Operational Health

{'The venue needs focused attention on foundational standards before moving to optimization.' if load in ('overloaded', 'high') else 'Foundations are solid. The plan can now focus on refinement and strategic improvements.' if load == 'medium' else 'Operational health is strong. The remaining work is optimization, not remediation.'}

## Recommendation

{'Begin with food safety and cleaning protocols — these are non-negotiable foundations.' if month == 1 else 'Continue the current trajectory. Focus on the remaining strategic signals.' if month == 2 else 'Maintain current standards. Consider sharing successful practices across the portfolio.'}
"""


# ─── Entrypoint ───────────────────────────────────────────────────────────────

def main() -> None:
    from app.core.config import get_settings
    from app.db.session import get_session_factory

    settings = get_settings()
    session_factory = get_session_factory(settings.database_url)
    with session_factory() as session:
        seed_showcase(session)


if __name__ == "__main__":
    main()
