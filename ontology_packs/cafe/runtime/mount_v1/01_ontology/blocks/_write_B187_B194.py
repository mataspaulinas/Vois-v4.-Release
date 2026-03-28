import json, os
base_path = r"C:\Users\matas\Documents\00 vOIS 3+4 Merge\OIS_Cafe\01_ontology\blocks"
CHAIN_ONLY = ["chain_cafe", "franchise_cafe"]
def wb(block):
    path = os.path.join(base_path, block["block_id"] + ".json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(block, f, indent=2, ensure_ascii=False)
    print(block["block_id"] + " written")

wb({
  "block_id": "B187",
  "name": "Brand Consistency Audit & Mystery Shopper",
  "version": "v1.0",
  "domain": "D11_growth_strategy",
  "module": "M15: Multi-Site & Chain Management",
  "state": "enriched",
  "purpose": "Establishes a structured brand consistency audit programme complemented by mystery shopper visits to ensure every location delivers an identical customer experience \u2014 from drink quality and service speed to visual merchandising and brand tone. This block is the guardian of brand equity across multiple sites.",
  "purpose_extended": {
    "detailed_objectives": [
      "Define measurable brand standards covering product quality, service delivery, visual presentation, and customer experience",
      "Create a brand audit scorecard that can be applied consistently across all locations",
      "Implement a mystery shopper programme providing objective, unannounced assessments of each site",
      "Establish a remediation process for sites that fall below brand standards",
      "Build a continuous improvement loop where audit findings drive SOP updates and training"
    ],
    "secondary_objectives": [
      "Identify best practices at individual sites that can be replicated across the estate",
      "Provide objective data for area manager performance reviews",
      "Support franchise compliance monitoring where applicable",
      "Build customer confidence that every visit to any location will meet the same standard"
    ]
  },
  "why_this_matters": "Brand consistency is the single most valuable asset of a multi-site cafe operation. When a customer visits Location A and receives a perfectly crafted flat white with friendly service in a clean, well-presented space, they expect exactly the same at Location B. Any deviation \u2014 a poorly made drink, indifferent service, a dirty toilet, incorrect signage \u2014 does not just damage that location; it damages the entire brand. Research from Mintel and CGA consistently shows that consistency is the primary driver of repeat visits in branded hospitality. A single bad experience at one site reduces likelihood to visit any site by 40%. For franchise operations, brand inconsistency can trigger contractual disputes and ultimately franchise termination. Mystery shopping provides the only truly objective measure of customer experience because it captures what actually happens when no manager is watching. Internal audits are valuable but inherently biased \u2014 staff behave differently when they know they are being observed. A well-designed mystery shopper programme, combined with structured brand audits, creates a 360-degree view of brand delivery across every location.",
  "application_logic": {
    "L1": "IMMEDIATE (0\u20132 weeks). Week 1: Define the brand standards document \u2014 a comprehensive list of every element that must be consistent across sites. Organise into categories: product quality (drink specifications, food presentation, temperature), service standards (greeting, upselling, speed, farewell), visual presentation (signage, merchandising, cleanliness, uniform), and operational standards (opening/closing procedures, safety compliance). For each standard, define what good looks like, what acceptable looks like, and what unacceptable looks like. Week 2: Create a brand audit scorecard using T187-01 that translates these standards into a checkable, scorable format. Pilot the scorecard at one location with the area manager to test its practicality and identify any gaps. Refine based on feedback.",
    "L2": "SYSTEM BUILD (2\u20138 weeks). Commission or recruit mystery shoppers \u2014 either through a specialist agency or by using trusted individuals unknown to the staff. Design the mystery shopper brief: what to order, what to observe, what to assess, and how to score. Each mystery shop visit should generate a structured report covering all brand standard categories. Establish a quarterly audit cycle: each location receives at least one formal brand audit and one mystery shop visit per quarter. Create a remediation protocol: when a site scores below the acceptable threshold, the area manager has 14 days to submit a corrective action plan and 30 days to demonstrate improvement. Begin tracking scores by location over time to identify trends.",
    "L3": "CULTURE & EXCELLENCE (8+ weeks). Integrate brand audit and mystery shopper scores into area manager KPIs and bonus structures. Publish a quarterly brand consistency league table (anonymised or named, depending on culture) to create healthy competition. Use audit data to identify training needs and update SOPs in the SOP library (B188). Introduce peer audits where managers from different sites audit each other, building cross-site understanding and shared standards. Benchmark against competitor mystery shop programmes. Review and update brand standards annually to reflect evolving customer expectations and market positioning."
  },
  "execution_framework": {
    "L1_setup": {"title": "Immediate Actions", "actions": ["Define comprehensive brand standards document covering product, service, visual, and operational categories", "Create a brand audit scorecard with clear scoring criteria", "Pilot the scorecard at one location with the area manager", "Define what constitutes a pass, marginal, and fail score", "Brief all site managers on brand standards expectations", "Identify mystery shopper providers or recruit trusted individuals", "Set the quarterly audit and mystery shop schedule"], "responsible": "Operations Director, Area Manager"},
    "L2_build": {"title": "System Development", "actions": ["Commission and brief mystery shoppers with detailed visit scenarios", "Establish a quarterly audit cycle across all locations", "Create a remediation protocol for underperforming sites", "Build a tracking system for audit and mystery shop scores by location", "Train area managers on conducting brand audits consistently", "Develop a mystery shop report template", "Begin quarterly trend analysis of brand consistency scores"], "responsible": "Area Manager, Operations Director"},
    "L3_embed": {"title": "Culture Embedding", "actions": ["Integrate brand scores into area manager KPIs and bonus structures", "Publish quarterly brand consistency league tables", "Use audit data to drive SOP updates and training programmes", "Introduce peer audit exchanges between site managers", "Benchmark against competitor mystery shop programmes", "Review and update brand standards annually"], "responsible": "Operations Director, Senior Leadership"}
  },
  "deliverables": ["Brand Standards Document", "Brand Audit Scorecard", "Mystery Shopper Brief and Report Template", "Remediation Protocol for underperforming sites", "Quarterly Brand Consistency Report"],
  "embedded_tools": [],
  "tool_definitions": {"tools": [
    {"tool_id": "T187-01", "tool_name": "Brand Audit Scorecard", "level": "L1", "format": "checklist", "owner_role": "Area Manager", "description": "Structured scorecard covering product quality, service delivery, visual presentation, and operational standards with clear scoring criteria (pass/marginal/fail) for each element. Used during formal site audits."},
    {"tool_id": "T187-02", "tool_name": "Mystery Shopper Brief Template", "level": "L2", "format": "template", "owner_role": "Operations Director", "description": "Detailed brief for mystery shoppers defining the visit scenario, items to order, observations to make, service interactions to assess, and scoring methodology."},
    {"tool_id": "T187-03", "tool_name": "Mystery Shopper Report Template", "level": "L2", "format": "template", "owner_role": "Area Manager", "description": "Structured report template for mystery shop visits covering all brand standard categories, individual scores, narrative commentary, and photographic evidence where appropriate."},
    {"tool_id": "T187-04", "tool_name": "Remediation Action Plan Template", "level": "L2", "format": "template", "owner_role": "Site Manager", "description": "Template for documenting corrective actions when a site falls below brand standards: issues identified, root causes, actions to take, responsible persons, and deadlines for resolution."},
    {"tool_id": "T187-05", "tool_name": "Quarterly Brand Consistency Report", "level": "L3", "format": "dashboard", "owner_role": "Operations Director", "description": "Quarterly dashboard showing brand audit and mystery shop scores across all locations, trend analysis, best and worst performers, and actions arising."}
  ]},
  "failure_modes": ["Brand standards are defined but not enforced, making them aspirational rather than operational", "Mystery shoppers are identified by staff who then perform differently, defeating the purpose", "Audit scores are used punitively rather than developmentally, creating fear rather than improvement", "Brand standards are not updated to reflect evolving customer expectations, becoming outdated"],
  "kpis": ["All locations score above 85% on brand audits consistently", "Mystery shop scores within 10% variance across all locations", "Remediation plans submitted within 14 days for any site scoring below threshold", "Quarter-on-quarter improvement in lowest-performing sites"],
  "dependencies": ["B188"],
  "constraints": ["Mystery shoppers must be genuinely unknown to staff to provide valid assessments", "Brand audits require dedicated area manager time that must be protected in scheduling", "Franchise locations may have additional brand compliance requirements from the franchisor"],
  "time_load": {"L1": "6 hours (brand standards definition, scorecard creation, pilot)", "L2": "4 hours/quarter per site (audits, mystery shops, remediation)", "L3": "8 hours/quarter (analysis, reporting, SOP updates)"},
  "review_protocol": "Quarterly brand audits at every location. Quarterly mystery shop visits. Monthly review of remediation plans for underperforming sites. Annual review and update of brand standards document.",
  "meta": {"summary_for_humans": "This block establishes a brand consistency audit programme with mystery shopper visits to ensure every location delivers an identical customer experience across product quality, service, and visual presentation.", "implementation_risks": ["Mystery shopper programmes can be expensive \u2014 start with a small provider or trusted volunteers", "Staff may become demoralised if audits feel punitive rather than supportive", "Brand standards that are too rigid may stifle site-level innovation"], "notes_for_engine": "Chain-only block. Activate when a cafe operation has two or more sites. Pair with B188 (SOP Library) and B191 (Area Manager Framework). Flag if signals indicate inconsistent customer feedback across locations.", "tags": ["brand", "consistency", "mystery_shopper", "audit", "multi_site", "chain", "quality_assurance"]},
  "applicability": {"venue_types": CHAIN_ONLY, "team_size_min": 5, "team_size_max": 99},
  "enrichment_status": {"level": "gold", "enriched_at": "2026-03-04T12:00:00Z", "enriched_by": "claude_direct_v2", "source_quality": "ai_generated"}
})

wb({
  "block_id": "B188",
  "name": "SOP Library & Compliance Monitoring",
  "version": "v1.0",
  "domain": "D11_growth_strategy",
  "module": "M15: Multi-Site & Chain Management",
  "state": "enriched",
  "purpose": "Creates a centralised, version-controlled Standard Operating Procedure library that serves as the single source of truth for how every task is performed across all locations. This block ensures operational consistency, accelerates new site openings, simplifies staff training, and provides a compliance monitoring framework to verify that SOPs are being followed.",
  "purpose_extended": {
    "detailed_objectives": [
      "Build a comprehensive SOP library covering every repeatable process: opening, closing, drink preparation, food handling, cleaning, cash handling, customer service, and emergency procedures",
      "Implement version control so every site is always operating from the latest approved procedure",
      "Establish a compliance monitoring system that verifies SOP adherence through checklists, observations, and audits",
      "Create a feedback loop where site teams can suggest SOP improvements based on practical experience",
      "Ensure SOPs are accessible, searchable, and available at point of use for all staff"
    ],
    "secondary_objectives": [
      "Reduce training time for new staff by providing clear, step-by-step procedures",
      "Minimise operational variance between locations that leads to inconsistent customer experience",
      "Provide a foundation for brand audits (B187) and franchise compliance (B192)",
      "Support new site opening playbooks (B190) with ready-made operational procedures"
    ]
  },
  "why_this_matters": "Without centralised SOPs, every location develops its own way of doing things. The head barista at Location A tamps differently from Location B. The closing procedure at one site takes 45 minutes; at another, 90 minutes. One manager reconciles the till nightly; another does it weekly. This operational drift is invisible at first but compounds rapidly, leading to inconsistent quality, unpredictable costs, and a customer experience that varies wildly by location and shift. For chain and franchise operations, SOPs are the DNA of the business. They encode the knowledge, standards, and methods that make the brand what it is. When a new site opens, SOPs mean the team can be operational within days rather than weeks. When a key staff member leaves, SOPs mean the knowledge leaves with them to a much lesser degree. Compliance monitoring closes the loop: it is not enough to write SOPs if nobody checks whether they are being followed. Regular compliance checks, integrated into brand audits and area manager visits, ensure that the written standard and the actual practice remain aligned.",
  "application_logic": {
    "L1": "IMMEDIATE (0\u20132 weeks). Week 1: Audit existing SOPs across all locations. Collect every written procedure, checklist, and guide currently in use. Identify gaps where critical processes have no SOP and inconsistencies where different sites have different versions of the same procedure. Prioritise the top 10 SOPs that every site must have: opening procedure, closing procedure, espresso preparation, milk steaming, food safety checks, cleaning schedule, cash handling, customer complaint handling, emergency evacuation, and staff handover. Week 2: Begin standardising these top 10 SOPs into a consistent format using T188-01. Each SOP should include: title, version number, date, author, purpose, scope, step-by-step instructions, quality checkpoints, and sign-off.",
    "L2": "SYSTEM BUILD (2\u20138 weeks). Expand the SOP library to cover all operational areas: beverage preparation (every drink on the menu), food preparation and handling, equipment maintenance and cleaning, customer service standards, health and safety procedures, financial procedures, HR procedures, and marketing/promotions execution. Implement a digital SOP platform \u2014 a shared drive, intranet, or dedicated tool (Trainual, SweetProcess, or similar) \u2014 that provides version control and ensures all sites access the same current versions. Create a compliance monitoring checklist that area managers use during site visits to verify SOP adherence. Establish a quarterly SOP review cycle where each SOP is checked for accuracy and updated as needed.",
    "L3": "CULTURE & EXCELLENCE (8+ weeks). Integrate SOP compliance into brand audits (B187) and area manager KPIs (B191). Introduce a SOP improvement suggestion scheme where any staff member can propose changes based on practical experience. Track compliance rates by location and SOP category, identifying patterns that indicate training needs or SOP design issues. Create visual SOPs (photos, short videos) for complex procedures like latte art, equipment calibration, or food plating. Ensure all new SOPs go through a formal approval process before being published. Archive superseded versions for audit trail purposes."
  },
  "execution_framework": {
    "L1_setup": {"title": "Immediate Actions", "actions": ["Audit all existing SOPs across every location", "Identify the top 10 critical SOPs that every site must have", "Standardise these SOPs into a consistent format with version control", "Distribute standardised SOPs to all locations", "Brief site managers on the importance of SOP adherence", "Remove outdated or inconsistent local SOPs from circulation", "Assign SOP ownership to specific roles for ongoing maintenance"], "responsible": "Operations Director, Area Manager"},
    "L2_build": {"title": "System Development", "actions": ["Expand the SOP library to cover all operational areas", "Implement a digital SOP platform with version control", "Create a compliance monitoring checklist for area manager site visits", "Establish a quarterly SOP review and update cycle", "Train all site managers on SOP compliance monitoring", "Develop a SOP change request and approval process", "Begin tracking compliance rates by location"], "responsible": "Operations Director, Area Manager"},
    "L3_embed": {"title": "Culture Embedding", "actions": ["Integrate SOP compliance into brand audits and area manager KPIs", "Launch a SOP improvement suggestion scheme for all staff", "Track compliance rates by location and category", "Create visual SOPs (photos, videos) for complex procedures", "Establish a formal SOP approval and archival process", "Conduct annual comprehensive SOP library review"], "responsible": "Operations Director, Senior Leadership"}
  },
  "deliverables": ["SOP Library (complete set of standardised procedures)", "SOP Template with version control fields", "Compliance Monitoring Checklist", "SOP Change Request and Approval Form", "Quarterly SOP Review Schedule"],
  "embedded_tools": [],
  "tool_definitions": {"tools": [
    {"tool_id": "T188-01", "tool_name": "SOP Template", "level": "L1", "format": "template", "owner_role": "Operations Director", "description": "Standardised SOP template with fields for title, version, date, author, purpose, scope, step-by-step instructions, quality checkpoints, equipment needed, and sign-off. Ensures consistency across all procedures."},
    {"tool_id": "T188-02", "tool_name": "SOP Compliance Monitoring Checklist", "level": "L2", "format": "checklist", "owner_role": "Area Manager", "description": "Checklist for area managers to verify SOP adherence during site visits, covering key procedures with pass/fail scoring and space for corrective action notes."},
    {"tool_id": "T188-03", "tool_name": "SOP Change Request Form", "level": "L2", "format": "template", "owner_role": "Site Manager", "description": "Form for any team member to propose SOP changes: current procedure, proposed change, rationale, and expected impact. Routed through approval workflow before implementation."},
    {"tool_id": "T188-04", "tool_name": "SOP Library Index", "level": "L2", "format": "tracker", "owner_role": "Operations Director", "description": "Master index of all SOPs in the library with title, category, version number, last review date, next review date, owner, and status. The single reference point for the entire SOP estate."},
    {"tool_id": "T188-05", "tool_name": "Quarterly SOP Review Report", "level": "L3", "format": "template", "owner_role": "Operations Director", "description": "Quarterly report summarising SOP compliance rates across locations, changes made, new SOPs issued, and upcoming reviews. Used in operations leadership meetings."}
  ]},
  "failure_modes": ["SOPs are written but stored in a location staff cannot easily access, making them theoretical rather than practical", "Version control fails and different sites operate from different versions of the same SOP", "Compliance monitoring is not conducted regularly, allowing SOP drift to go undetected", "SOPs are written by headquarters without input from site teams, resulting in impractical procedures"],
  "kpis": ["100% of critical SOPs standardised and distributed to all locations", "SOP compliance rate above 90% across all locations as measured by area manager audits", "All SOPs reviewed at least once per year with version updates documented", "SOP improvement suggestions received from at least 3 different sites per quarter"],
  "dependencies": ["B187"],
  "constraints": ["SOPs must be written in clear, simple language accessible to all staff regardless of experience level", "Version control is essential \u2014 every SOP must have a version number and date", "Digital SOP platforms require reliable internet access at all sites"],
  "time_load": {"L1": "10 hours (audit, standardisation of top 10 SOPs)", "L2": "20 hours (full library build, platform setup, compliance system)", "L3": "4 hours/quarter (reviews, updates, compliance analysis)"},
  "review_protocol": "Quarterly review of all SOPs for accuracy and relevance. Monthly compliance monitoring during area manager site visits. Immediate review and update when any process changes. Annual comprehensive library audit.",
  "meta": {"summary_for_humans": "This block creates a centralised, version-controlled SOP library covering every operational procedure, with compliance monitoring to ensure all sites operate to the same standard.", "implementation_risks": ["Building a complete SOP library is a significant investment of time \u2014 prioritise the most critical procedures first", "Staff may resist standardisation if they feel their local methods are being devalued", "Digital platforms add cost and require training \u2014 start with simple shared documents if budget is limited"], "notes_for_engine": "Chain-only block. Core dependency for B187 (brand audits), B190 (new site opening), and B192 (franchise compliance). Activate early in multi-site development.", "tags": ["SOP", "procedures", "compliance", "standardisation", "multi_site", "chain", "version_control", "operations"]},
  "applicability": {"venue_types": CHAIN_ONLY, "team_size_min": 5, "team_size_max": 99},
  "enrichment_status": {"level": "gold", "enriched_at": "2026-03-04T12:00:00Z", "enriched_by": "claude_direct_v2", "source_quality": "ai_generated"}
})

wb({
  "block_id": "B189",
  "name": "Cross-Site Financial Benchmarking",
  "version": "v1.0",
  "domain": "D11_growth_strategy",
  "module": "M15: Multi-Site & Chain Management",
  "state": "enriched",
  "purpose": "Implements a structured financial benchmarking framework that compares key financial metrics across all locations, revealing underperformance, identifying best practices, and enabling data-driven resource allocation decisions. This block turns multi-site financial data from a collection of individual P&Ls into a strategic management tool.",
  "purpose_extended": {
    "detailed_objectives": [
      "Standardise financial reporting across all locations to enable like-for-like comparison",
      "Define and track key financial benchmarks: revenue per square foot, labour cost percentage, food cost percentage, gross margin, and net profit by site",
      "Identify outlier performance (both positive and negative) and investigate root causes",
      "Create a monthly cross-site financial dashboard accessible to the senior leadership team",
      "Use benchmarking data to inform investment decisions, site closures, and resource allocation"
    ],
    "secondary_objectives": [
      "Identify cost-saving opportunities by comparing supplier pricing and wastage across sites",
      "Support area manager performance management with objective financial data",
      "Provide early warning of financial deterioration at individual sites",
      "Benchmark against industry standards published by UK Hospitality and the BHA"
    ]
  },
  "why_this_matters": "In a multi-site operation, aggregated financial performance can mask significant variation between individual locations. A chain with an overall gross margin of 68% might have one site at 74% and another at 58% \u2014 but without cross-site benchmarking, the underperformer remains invisible, quietly eroding profitability. Cross-site financial benchmarking transforms financial reporting from a backward-looking compliance exercise into a forward-looking management tool. By comparing the same metrics across every location using standardised definitions, operators can quickly identify which sites are outperforming, which are struggling, and why. The why is critical: is Location B's higher labour cost percentage because of poor scheduling, higher local wages, or lower revenue that inflates the percentage? Benchmarking surfaces the questions; investigation provides the answers. For franchise operations, financial benchmarking also supports compliance \u2014 franchisees who consistently underperform on key metrics may require additional support or, ultimately, contract review.",
  "application_logic": {
    "L1": "IMMEDIATE (0\u20132 weeks). Week 1: Define the core financial benchmarks to track across all sites: (1) weekly revenue, (2) revenue per square foot, (3) average transaction value, (4) labour cost as percentage of revenue, (5) food and beverage cost as percentage of revenue, (6) gross profit margin, (7) net profit margin, and (8) waste cost as percentage of revenue. Ensure every site uses the same chart of accounts and categorisation for expenses. Week 2: Collect the most recent month's data from all sites and populate a comparison table. Identify the highest and lowest performer for each metric. Present the initial comparison to the leadership team and discuss key variances.",
    "L2": "SYSTEM BUILD (2\u20138 weeks). Build a monthly cross-site financial dashboard using a spreadsheet or business intelligence tool. Automate data collection from EPOS and accounting systems where possible. Create a variance analysis protocol: for any metric where a site deviates more than 5 percentage points from the estate average, the area manager must investigate and report root causes within two weeks. Introduce site-level financial targets based on benchmarking data rather than arbitrary budgets. Establish a monthly financial review meeting where the leadership team reviews the cross-site dashboard and agrees on actions.",
    "L3": "CULTURE & EXCELLENCE (8+ weeks). Integrate benchmarking into the strategic planning cycle. Use trailing 12-month data to identify structural trends rather than just monthly fluctuations. Benchmark against external industry data from UK Hospitality, the BHA, or the Allegra World Coffee Portal. Use benchmarking to build business cases for investment: a site with strong revenue density but poor margins may benefit from equipment investment; a site with low revenue but excellent margins may need marketing support. Share relevant benchmarks with site managers to build financial literacy and ownership."
  },
  "execution_framework": {
    "L1_setup": {"title": "Immediate Actions", "actions": ["Define core financial benchmarks with standardised definitions", "Ensure all sites use the same chart of accounts and expense categorisation", "Collect the most recent month's data from all sites", "Create an initial cross-site comparison table", "Identify highest and lowest performers for each metric", "Present initial findings to the leadership team", "Agree on the regular reporting frequency (monthly recommended)"], "responsible": "Finance Director, Operations Director"},
    "L2_build": {"title": "System Development", "actions": ["Build a monthly cross-site financial dashboard", "Automate data collection from EPOS and accounting systems", "Create a variance analysis protocol with investigation triggers", "Set site-level financial targets based on benchmarking data", "Establish a monthly financial review meeting", "Train area managers on financial benchmarking interpretation", "Begin quarterly trend analysis"], "responsible": "Finance Director, Area Manager"},
    "L3_embed": {"title": "Culture Embedding", "actions": ["Integrate benchmarking into strategic planning and budgeting cycles", "Analyse trailing 12-month data for structural performance trends", "Benchmark against external industry data sources", "Use benchmarking to build investment and resource allocation business cases", "Share relevant benchmarks with site managers to build financial literacy", "Review and refine benchmark definitions annually"], "responsible": "Finance Director, Operations Director, CEO"}
  },
  "deliverables": ["Cross-Site Financial Benchmark Definitions document", "Monthly Cross-Site Financial Dashboard", "Variance Analysis Protocol", "Quarterly Trend Report template", "Annual Benchmarking Review"],
  "embedded_tools": [],
  "tool_definitions": {"tools": [
    {"tool_id": "T189-01", "tool_name": "Cross-Site Financial Dashboard", "level": "L1", "format": "dashboard", "owner_role": "Finance Director", "description": "Monthly dashboard comparing all core financial metrics across every location, with estate averages, variance highlighting, and trend indicators."},
    {"tool_id": "T189-02", "tool_name": "Financial Benchmark Definitions Guide", "level": "L1", "format": "reference", "owner_role": "Finance Director", "description": "Reference document defining each financial benchmark, its calculation methodology, data sources, and the standardised chart of accounts to ensure consistency across sites."},
    {"tool_id": "T189-03", "tool_name": "Variance Investigation Report Template", "level": "L2", "format": "template", "owner_role": "Area Manager", "description": "Template for investigating and reporting on significant financial variances at individual sites: metric affected, size of variance, root cause analysis, and recommended actions."},
    {"tool_id": "T189-04", "tool_name": "Quarterly Financial Trend Report", "level": "L2", "format": "template", "owner_role": "Finance Director", "description": "Quarterly report showing rolling trends across all benchmarks, seasonal adjustments, and commentary on structural changes affecting performance."},
    {"tool_id": "T189-05", "tool_name": "Annual Benchmarking Review Template", "level": "L3", "format": "template", "owner_role": "CEO", "description": "Annual strategic review of cross-site financial performance including external benchmarking, investment recommendations, and target-setting for the coming year."}
  ]},
  "failure_modes": ["Sites use different accounting treatments for the same expenses, making comparisons misleading", "Benchmarking is conducted but findings are not acted upon, becoming an academic exercise", "Over-focus on lagging financial metrics without investigating the operational drivers behind them", "Site managers are not shared relevant data and therefore cannot contribute to improvement"],
  "kpis": ["Cross-site financial dashboard published monthly within 5 working days of month end", "Variance investigations completed within 14 days for any metric deviating more than 5 percentage points", "All sites trending towards estate-average performance on key metrics within 12 months", "Labour cost percentage variance between highest and lowest site below 5 percentage points"],
  "dependencies": ["B122"],
  "constraints": ["Requires standardised financial reporting across all sites", "Data collection depends on EPOS and accounting system capabilities at each location", "Franchise sites may have different financial reporting obligations that need reconciliation"],
  "time_load": {"L1": "4 hours (benchmark definition, initial data collection and comparison)", "L2": "6 hours/month (dashboard build, variance analysis, review meetings)", "L3": "8 hours/quarter (trend analysis, external benchmarking, strategic planning)"},
  "review_protocol": "Monthly cross-site financial dashboard review by leadership team. Quarterly trend analysis and deep-dive into persistent variances. Annual strategic benchmarking review including external comparisons.",
  "meta": {"summary_for_humans": "This block implements cross-site financial benchmarking to compare key metrics across all locations, revealing underperformance and enabling data-driven management decisions.", "implementation_risks": ["Inconsistent accounting practices across sites will produce misleading comparisons", "Financial benchmarking without operational context can lead to wrong conclusions", "Over-reliance on benchmarks can create a culture of fear rather than improvement"], "notes_for_engine": "Chain-only block. Requires B122 (financial management) as foundation. Feeds into B191 (area manager framework) for performance management. Flag if signals indicate significant financial performance gaps between locations.", "tags": ["finance", "benchmarking", "multi_site", "chain", "performance", "P&L", "margin", "cost_control"]},
  "applicability": {"venue_types": CHAIN_ONLY, "team_size_min": 5, "team_size_max": 99},
  "enrichment_status": {"level": "gold", "enriched_at": "2026-03-04T12:00:00Z", "enriched_by": "claude_direct_v2", "source_quality": "ai_generated"}
})

wb({
  "block_id": "B190",
  "name": "New Site Opening Playbook",
  "version": "v1.0",
  "domain": "D11_growth_strategy",
  "module": "M15: Multi-Site & Chain Management",
  "state": "enriched",
  "purpose": "Provides a comprehensive, step-by-step playbook for opening new cafe locations \u2014 from site identification and lease negotiation through fit-out, recruitment, training, and launch. This block ensures every new opening follows a proven process, minimises risk, hits target timelines, and delivers a first-day experience that matches the brand standard.",
  "purpose_extended": {
    "detailed_objectives": [
      "Create a phased project plan covering every stage of a new site opening from 12 weeks pre-launch to 4 weeks post-launch",
      "Define critical path activities, dependencies, and decision gates at each phase",
      "Establish checklists for legal, regulatory, fit-out, equipment, recruitment, training, and marketing readiness",
      "Build a launch week protocol that ensures the site opens at full operational standard",
      "Create a post-opening support framework for the first 90 days of trading"
    ],
    "secondary_objectives": [
      "Reduce time from lease signing to opening by codifying the process",
      "Minimise costly mistakes and delays through documented lessons from previous openings",
      "Ensure regulatory compliance from day one (food registration, fire safety, licensing)",
      "Accelerate team readiness through structured pre-opening training programmes"
    ]
  },
  "why_this_matters": "Opening a new cafe site is one of the highest-risk activities in the hospitality business. It involves significant capital investment (typically \u00a350,000\u2013\u00a3250,000 for a UK cafe fit-out), multiple parallel workstreams (legal, construction, recruitment, training, marketing), and a hard deadline \u2014 the opening date. Without a structured playbook, critical activities are missed, timelines slip, costs overrun, and the first day of trading becomes chaotic rather than celebratory. Every unsuccessful opening damages the brand and wastes capital that could have been deployed elsewhere. A well-executed playbook draws on the accumulated knowledge of previous openings, encoding what worked, what failed, and what was nearly forgotten into a reusable process. It ensures that food business registration is submitted 28 days before opening (a legal requirement), that fire safety equipment is installed and tested before staff arrive, that the team is trained on SOPs before the first customer walks in, and that the marketing launch creates maximum awareness in the local area.",
  "application_logic": {
    "L1": "IMMEDIATE (0\u20132 weeks). Week 1: Create a master project timeline for new site openings, broken into phases: Phase 1 (12\u20138 weeks pre-launch) \u2014 legal, lease, planning permissions, food business registration; Phase 2 (8\u20134 weeks) \u2014 fit-out, equipment procurement, utility connections; Phase 3 (4\u20132 weeks) \u2014 recruitment, staff training, SOP distribution; Phase 4 (2 weeks to launch) \u2014 soft launch, snagging, final compliance checks; Phase 5 (launch week and first 4 weeks) \u2014 opening event, daily reviews, post-opening support. Week 2: For each phase, list every task, assign ownership, and define completion criteria. Identify the critical path \u2014 the sequence of tasks that determines the earliest possible opening date.",
    "L2": "SYSTEM BUILD (2\u20138 weeks). Develop detailed checklists for each phase using T190-02. Create a pre-opening compliance checklist covering: food business registration, fire risk assessment, health and safety risk assessment, licensing (alcohol if applicable, music), insurance, EICR, gas safety certificate, water hygiene risk assessment, and employer liability insurance. Build a recruitment timeline ensuring the site manager is hired at least 6 weeks before opening and the full team at least 3 weeks before. Design a pre-opening training programme covering SOPs, brand standards, equipment operation, and local area knowledge. Plan the marketing launch: local press, social media, community engagement, and a soft opening for friends, family, and local influencers.",
    "L3": "CULTURE & EXCELLENCE (8+ weeks). After each new opening, conduct a lessons-learned review within 30 days, documenting what went well, what went badly, and what to change for the next opening. Update the playbook accordingly. Create a post-opening support protocol: the area manager or a senior team member should be present daily for the first two weeks and visit at least twice weekly for weeks 3\u20138. Track new site performance against established site benchmarks using B189. Build a library of opening templates that can be customised for different site types and sizes."
  },
  "execution_framework": {
    "L1_setup": {"title": "Immediate Actions", "actions": ["Create a master project timeline broken into five phases", "List every task for each phase with ownership and completion criteria", "Identify the critical path determining the opening date", "Define decision gates between phases", "Create a budget template for new site opening costs", "Build a risk register for common opening risks and mitigations", "Assign a project lead for each new site opening"], "responsible": "Operations Director, CEO"},
    "L2_build": {"title": "System Development", "actions": ["Develop detailed phase checklists for legal, fit-out, recruitment, training, and marketing", "Create a pre-opening compliance checklist covering all regulatory requirements", "Build a recruitment timeline and job description library for site teams", "Design a pre-opening training programme aligned with the SOP library", "Plan a marketing launch template for new site openings", "Create a soft opening protocol for testing operations before full launch", "Develop a snagging list template for fit-out quality assurance"], "responsible": "Operations Director, Marketing Manager, HR"},
    "L3_embed": {"title": "Culture Embedding", "actions": ["Conduct a lessons-learned review within 30 days of each opening", "Update the playbook after every opening based on lessons learned", "Create a post-opening support protocol for the first 90 days", "Track new site performance against established site benchmarks", "Build a library of reusable opening templates for different site types", "Review and refine the playbook annually"], "responsible": "Operations Director, CEO"}
  },
  "deliverables": ["New Site Opening Master Timeline", "Phase Checklists (legal, fit-out, recruitment, training, marketing)", "Pre-Opening Compliance Checklist", "Pre-Opening Training Programme outline", "Post-Opening Lessons Learned template"],
  "embedded_tools": [],
  "tool_definitions": {"tools": [
    {"tool_id": "T190-01", "tool_name": "New Site Opening Master Timeline", "level": "L1", "format": "tracker", "owner_role": "Operations Director", "description": "Gantt-style project timeline showing all five phases of a new site opening, with task dependencies, milestones, decision gates, and critical path highlighted."},
    {"tool_id": "T190-02", "tool_name": "Phase Checklists", "level": "L2", "format": "checklist", "owner_role": "Project Lead", "description": "Detailed checklists for each opening phase covering every task, responsible person, due date, and completion status. Ensures nothing is missed during the opening process."},
    {"tool_id": "T190-03", "tool_name": "Pre-Opening Compliance Checklist", "level": "L2", "format": "checklist", "owner_role": "Operations Director", "description": "Comprehensive compliance checklist covering all regulatory requirements that must be met before opening day: food registration, fire safety, H&S, licensing, insurance, and certificates."},
    {"tool_id": "T190-04", "tool_name": "New Site Budget Template", "level": "L1", "format": "template", "owner_role": "Finance Director", "description": "Detailed budget template covering all new site opening costs: lease, fit-out, equipment, recruitment, training, marketing, and working capital, with contingency allowances."},
    {"tool_id": "T190-05", "tool_name": "Post-Opening Lessons Learned Template", "level": "L3", "format": "template", "owner_role": "Operations Director", "description": "Structured template for the 30-day post-opening review: what went well, what went badly, what to change, timeline adherence, budget variance, and recommended playbook updates."}
  ]},
  "failure_modes": ["Food business registration is submitted late, forcing a delayed opening or illegal trading", "Recruitment starts too late and the site opens with an undertrained team", "Fit-out overruns absorb the contingency budget, leaving no marketing budget for launch", "No post-opening support plan is in place and the new site struggles through its critical first weeks alone"],
  "kpis": ["New sites open within 5 working days of target date", "Pre-opening compliance checklist 100% complete before first trading day", "New site reaches 80% of revenue target within first 8 weeks", "Post-opening lessons learned review completed within 30 days of opening"],
  "dependencies": ["B166"],
  "constraints": ["Food business registration requires minimum 28 days notice to the local authority", "Lease negotiations and planning permissions can introduce significant timeline uncertainty", "Recruitment timelines depend on local labour market conditions"],
  "time_load": {"L1": "8 hours (playbook creation, timeline development)", "L2": "40+ hours per site opening (execution of all phases)", "L3": "4 hours per opening (lessons learned review and playbook update)"},
  "review_protocol": "Post-opening lessons learned review within 30 days. Quarterly performance review of new sites against benchmarks. Annual playbook review and update based on accumulated experience.",
  "meta": {"summary_for_humans": "This block provides a comprehensive playbook for opening new cafe locations, covering every phase from site identification through fit-out, recruitment, training, and launch to post-opening support.", "implementation_risks": ["First-time playbook creation requires significant investment \u2014 it pays dividends from the second opening onwards", "Every site is different \u2014 the playbook must be flexible enough to accommodate local variations", "Underestimating fit-out timelines is the most common cause of delayed openings"], "notes_for_engine": "Chain-only block. Activate when a multi-site operator begins planning a new location. Depends on B166 (growth strategy). Links to B188 (SOPs) for training content and B189 (benchmarking) for performance targets.", "tags": ["new_site", "opening", "playbook", "project_management", "multi_site", "chain", "growth", "fit_out"]},
  "applicability": {"venue_types": CHAIN_ONLY, "team_size_min": 5, "team_size_max": 99},
  "enrichment_status": {"level": "gold", "enriched_at": "2026-03-04T12:00:00Z", "enriched_by": "claude_direct_v2", "source_quality": "ai_generated"}
})

wb({
  "block_id": "B191",
  "name": "Area Manager Framework",
  "version": "v1.0",
  "domain": "D11_growth_strategy",
  "module": "M15: Multi-Site & Chain Management",
  "state": "enriched",
  "purpose": "Defines the area manager role, responsibilities, KPIs, and operating rhythm for multi-site cafe operations. This block ensures that as the business grows beyond what one owner or operator can directly oversee, there is a structured management layer that maintains standards, develops site teams, and drives performance across all locations.",
  "purpose_extended": {
    "detailed_objectives": [
      "Define the area manager role with clear responsibilities covering operational standards, people management, financial performance, and brand compliance",
      "Establish a weekly and monthly operating rhythm for area manager site visits and reporting",
      "Create a KPI framework that holds area managers accountable for the performance of their sites",
      "Build area manager development pathways including training, coaching, and career progression",
      "Define the relationship between area managers, site managers, and central operations"
    ],
    "secondary_objectives": [
      "Ensure consistent management coverage across all sites as the estate grows",
      "Reduce owner dependency by delegating operational oversight to area managers",
      "Create a talent pipeline for future operations directors and senior leadership",
      "Standardise the area manager role across the organisation to ensure consistency"
    ]
  },
  "why_this_matters": "The area manager is the most critical role in a multi-site cafe operation. They are the bridge between central strategy and site-level execution. Without effective area management, the owner becomes the bottleneck \u2014 unable to oversee every site personally, yet not confident that standards are being maintained in their absence. The typical span of control for a cafe area manager is 4\u20138 sites, depending on geography and complexity. An area manager should spend 60\u201370% of their time in sites (not in the office) conducting structured visits that cover operational standards, team development, financial review, and customer experience. Their weekly rhythm should include at least one full visit to each site, with additional targeted visits for underperforming locations. The KPI framework must balance leading indicators (audit scores, training completion, compliance rates) with lagging indicators (revenue, margin, customer feedback) to give a complete picture of area performance.",
  "application_logic": {
    "L1": "IMMEDIATE (0\u20132 weeks). Week 1: Draft the area manager role description using T191-01, covering: operational standards oversight, brand audit execution, people management and development, financial performance management, and escalation responsibilities. Define the site visit structure: a standard visit should take 2\u20133 hours and follow a consistent format covering walk-through observation, team conversations, data review, and action planning. Week 2: Define the area manager KPI framework: (1) brand audit scores across their sites, (2) financial performance against targets, (3) staff turnover and engagement, (4) compliance completion rates, (5) customer satisfaction metrics. Brief existing area managers (or those being promoted into the role) on expectations and the operating rhythm.",
    "L2": "SYSTEM BUILD (2\u20138 weeks). Create a weekly site visit report template that the area manager completes after every visit. Build a monthly area performance dashboard that aggregates site-level data into an area view. Establish a fortnightly one-to-one between each area manager and the operations director. Develop an area manager induction programme covering: brand standards, SOP library, financial benchmarking, people management skills, and regulatory compliance. Create a site manager development programme that area managers deliver, building leadership capability at site level.",
    "L3": "CULTURE & EXCELLENCE (8+ weeks). Integrate area manager performance into the annual review and bonus cycle. Conduct 360-degree feedback reviews for area managers including input from site managers, central team, and the operations director. Create area manager peer learning forums where they share best practices and problem-solve together. Build career pathways from area manager to operations director. Review and adjust the span of control as the estate grows to ensure area managers are not overloaded."
  },
  "execution_framework": {
    "L1_setup": {"title": "Immediate Actions", "actions": ["Draft the area manager role description with clear responsibilities", "Define the standard site visit structure and format", "Create the area manager KPI framework with 5 core metrics", "Brief area managers on expectations and operating rhythm", "Define the span of control (sites per area manager)", "Establish the weekly site visit schedule", "Create a visit reporting format"], "responsible": "Operations Director, CEO"},
    "L2_build": {"title": "System Development", "actions": ["Create a weekly site visit report template", "Build a monthly area performance dashboard", "Establish fortnightly one-to-ones between area managers and operations director", "Develop an area manager induction programme", "Create a site manager development programme for area managers to deliver", "Implement a structured action tracking system for visit follow-ups", "Begin monthly area performance reviews"], "responsible": "Operations Director, HR"},
    "L3_embed": {"title": "Culture Embedding", "actions": ["Integrate area manager performance into annual review and bonus cycle", "Conduct 360-degree feedback reviews for area managers", "Create peer learning forums for area managers", "Build career pathways from area manager to operations director", "Review span of control as the estate grows", "Conduct annual area manager role review and update"], "responsible": "Operations Director, CEO, HR"}
  },
  "deliverables": ["Area Manager Role Description", "Site Visit Structure and Report Template", "Area Manager KPI Framework", "Monthly Area Performance Dashboard", "Area Manager Induction Programme outline"],
  "embedded_tools": [],
  "tool_definitions": {"tools": [
    {"tool_id": "T191-01", "tool_name": "Area Manager Role Description", "level": "L1", "format": "template", "owner_role": "Operations Director", "description": "Comprehensive role description covering responsibilities, KPIs, reporting lines, span of control, time allocation expectations, and key competencies required for the area manager position."},
    {"tool_id": "T191-02", "tool_name": "Site Visit Report Template", "level": "L2", "format": "template", "owner_role": "Area Manager", "description": "Structured report template completed after every site visit covering: walk-through observations, team conversations, data review findings, actions agreed, and follow-up deadlines."},
    {"tool_id": "T191-03", "tool_name": "Area Manager KPI Dashboard", "level": "L2", "format": "dashboard", "owner_role": "Operations Director", "description": "Monthly dashboard showing each area manager's performance across all KPIs: brand audit scores, financial performance, staff metrics, compliance rates, and customer satisfaction."},
    {"tool_id": "T191-04", "tool_name": "Area Manager Induction Checklist", "level": "L2", "format": "checklist", "owner_role": "Operations Director", "description": "Structured induction checklist for new area managers covering brand standards, SOP library, financial systems, people management processes, compliance requirements, and key contacts."},
    {"tool_id": "T191-05", "tool_name": "360-Degree Feedback Template", "level": "L3", "format": "template", "owner_role": "Operations Director", "description": "Annual 360-degree feedback form collecting structured input from site managers, peers, central team, and the operations director on the area manager's performance across key competencies."}
  ]},
  "failure_modes": ["Area managers spend too much time in the office and not enough time in sites, losing touch with operational reality", "KPIs focus only on financial metrics, ignoring leading indicators like audit scores and staff development", "Area managers are overloaded with too many sites, spreading their attention too thin to be effective", "Site visits become social calls rather than structured performance reviews"],
  "kpis": ["Each site receives at least one structured area manager visit per week", "Area manager KPI dashboard updated monthly with all metrics current", "Staff turnover in area manager's sites below industry average", "Brand audit scores across all sites in the area above 85%"],
  "dependencies": ["B187", "B189"],
  "constraints": ["Optimal span of control is 4\u20138 sites per area manager depending on geography", "Area managers must spend a minimum of 60% of their time in sites", "The role requires both operational expertise and people management skills"],
  "time_load": {"L1": "6 hours (role definition, KPI framework, visit structure)", "L2": "10 hours (dashboard build, induction programme, report templates)", "L3": "2 hours/month (performance reviews, framework refinement)"},
  "review_protocol": "Weekly site visit reports reviewed by operations director. Monthly area performance dashboard review. Quarterly one-to-one with operations director. Annual 360-degree feedback and performance review. Annual review of span of control and role description.",
  "meta": {"summary_for_humans": "This block defines the area manager role, responsibilities, KPIs, and operating rhythm, ensuring consistent management oversight and performance accountability across all sites.", "implementation_risks": ["Hiring the wrong area manager can damage multiple sites simultaneously", "Without structured visits, area managers default to firefighting rather than proactive management", "The transition from owner-managed to area-manager-managed requires the owner to genuinely delegate authority"], "notes_for_engine": "Chain-only block. Activate when the estate reaches 3+ sites. Depends on B187 (brand audits) and B189 (financial benchmarking) for the KPI framework. Critical for scalability.", "tags": ["area_manager", "management", "multi_site", "chain", "KPIs", "leadership", "operations", "scalability"]},
  "applicability": {"venue_types": CHAIN_ONLY, "team_size_min": 10, "team_size_max": 99},
  "enrichment_status": {"level": "gold", "enriched_at": "2026-03-04T12:00:00Z", "enriched_by": "claude_direct_v2", "source_quality": "ai_generated"}
})

wb({
  "block_id": "B192",
  "name": "Franchise Compliance Audit",
  "version": "v1.0",
  "domain": "D11_growth_strategy",
  "module": "M15: Multi-Site & Chain Management",
  "state": "enriched",
  "purpose": "Establishes a structured audit framework for monitoring franchise partner compliance with brand standards, operational procedures, financial reporting obligations, and contractual requirements. This block protects the brand, supports franchisees, and ensures the franchise model delivers consistent quality for customers and sustainable returns for both franchisor and franchisee.",
  "purpose_extended": {
    "detailed_objectives": [
      "Define franchise compliance standards covering brand, operations, financial reporting, and legal obligations",
      "Create a quarterly franchise audit programme with standardised scoring",
      "Establish a tiered response framework for non-compliance: support, warning, remediation, and ultimately contract review",
      "Build a constructive relationship with franchisees that positions audits as support rather than surveillance",
      "Maintain documentation that protects the franchisor in the event of disputes or contract termination"
    ],
    "secondary_objectives": [
      "Identify franchisees who need additional support before performance deteriorates to critical levels",
      "Share best practices from high-performing franchisees across the network",
      "Ensure franchisee financial reporting supports accurate royalty and fee calculations",
      "Verify that franchisees maintain all required licences, insurance, and regulatory compliance"
    ]
  },
  "why_this_matters": "A franchise model is only as strong as its weakest franchisee. Every location carrying the brand name makes a promise to the customer, and a single poorly operated franchise can damage the reputation of the entire network. The British Franchise Association reports that clear compliance frameworks are a hallmark of successful franchise systems. Without structured auditing, franchisors have no objective way to measure whether partners are meeting their contractual obligations. Compliance audits cover four key areas: brand standards (is the customer experience consistent?), operational procedures (are SOPs being followed?), financial reporting (are royalties correctly calculated and paid?), and legal compliance (are licences, insurance, and employment law requirements met?). The audit must be balanced between rigour and relationship \u2014 franchisees who feel surveilled rather than supported will disengage, but franchisees who are never held accountable will drift from standards.",
  "application_logic": {
    "L1": "IMMEDIATE (0\u20132 weeks). Week 1: Compile all franchise agreement requirements into a single compliance reference document. Extract every obligation the franchisee has agreed to: brand standards, operating hours, approved suppliers, financial reporting deadlines, insurance requirements, training obligations, and premises maintenance standards. Week 2: Create a franchise compliance audit scorecard using T192-01, organised into the four key areas. Define scoring criteria: what constitutes full compliance, partial compliance, and non-compliance for each item. Share the scorecard with all franchisees in advance so expectations are transparent.",
    "L2": "SYSTEM BUILD (2\u20138 weeks). Establish a quarterly audit cycle where every franchise location receives a formal compliance audit. Combine the audit with a brand audit (B187) to avoid audit fatigue. Create a tiered response framework: Tier 1 (minor non-compliance) = noted with corrective action deadline; Tier 2 (significant non-compliance) = formal warning with 30-day remediation plan; Tier 3 (critical non-compliance) = franchise agreement review meeting. Develop a franchisee support programme that provides additional training, mentoring, or operational assistance for struggling partners. Build a franchise performance dashboard tracking compliance scores, financial performance, and customer metrics across all franchise locations.",
    "L3": "CULTURE & EXCELLENCE (8+ weeks). Conduct annual franchise relationship reviews combining compliance data with financial performance and franchisee satisfaction. Create a franchisee advisory council where top-performing partners contribute to brand development and SOP improvement. Benchmark franchise performance against company-owned sites. Engage external auditors for annual independent franchise compliance reviews. Review and update the franchise agreement compliance requirements annually to reflect evolving standards."
  },
  "execution_framework": {
    "L1_setup": {"title": "Immediate Actions", "actions": ["Compile all franchise agreement obligations into a single reference document", "Create a franchise compliance audit scorecard covering brand, operations, finance, and legal", "Define scoring criteria for full, partial, and non-compliance", "Share the scorecard with all franchisees for transparency", "Schedule the first quarterly audit cycle", "Assign audit responsibilities to area managers or a dedicated compliance team", "Establish a secure system for storing audit records"], "responsible": "Franchise Director, Operations Director"},
    "L2_build": {"title": "System Development", "actions": ["Implement a quarterly franchise audit cycle", "Create a tiered response framework for non-compliance", "Develop a franchisee support programme for struggling partners", "Build a franchise performance dashboard", "Train auditors on consistent scoring methodology", "Create a formal warning and remediation plan template", "Integrate franchise audits with brand audits to reduce audit fatigue"], "responsible": "Franchise Director, Area Manager"},
    "L3_embed": {"title": "Culture Embedding", "actions": ["Conduct annual franchise relationship reviews", "Establish a franchisee advisory council", "Benchmark franchise performance against company-owned sites", "Engage external auditors for annual independent reviews", "Review and update compliance requirements annually", "Share best practices from top-performing franchisees across the network"], "responsible": "Franchise Director, CEO"}
  },
  "deliverables": ["Franchise Compliance Reference Document", "Franchise Compliance Audit Scorecard", "Tiered Non-Compliance Response Framework", "Franchise Performance Dashboard", "Annual Franchise Relationship Review template"],
  "embedded_tools": [],
  "tool_definitions": {"tools": [
    {"tool_id": "T192-01", "tool_name": "Franchise Compliance Audit Scorecard", "level": "L1", "format": "checklist", "owner_role": "Franchise Director", "description": "Comprehensive scorecard covering all franchise agreement obligations organised into brand, operations, financial, and legal categories with clear scoring criteria for each item."},
    {"tool_id": "T192-02", "tool_name": "Franchise Non-Compliance Response Template", "level": "L2", "format": "template", "owner_role": "Franchise Director", "description": "Template for documenting non-compliance findings, assigned tier level, required corrective actions, deadlines, and escalation pathway if issues are not resolved."},
    {"tool_id": "T192-03", "tool_name": "Franchise Performance Dashboard", "level": "L2", "format": "dashboard", "owner_role": "Franchise Director", "description": "Dashboard tracking compliance scores, financial performance, customer metrics, and trend data across all franchise locations."},
    {"tool_id": "T192-04", "tool_name": "Franchisee Support Plan Template", "level": "L2", "format": "template", "owner_role": "Area Manager", "description": "Structured support plan for franchisees who need additional assistance: areas of concern, support actions (training, mentoring, operational assistance), milestones, and review dates."},
    {"tool_id": "T192-05", "tool_name": "Annual Franchise Relationship Review Template", "level": "L3", "format": "template", "owner_role": "Franchise Director", "description": "Annual review template combining compliance data, financial performance, customer metrics, and franchisee satisfaction into a comprehensive relationship assessment."}
  ]},
  "failure_modes": ["Audits are conducted inconsistently, with some franchisees receiving more scrutiny than others", "Non-compliance is identified but never escalated, creating a culture of tolerance for poor standards", "The audit process is so adversarial that it damages the franchisor-franchisee relationship", "Financial compliance checks are superficial, allowing inaccurate royalty calculations to persist"],
  "kpis": ["All franchise locations audited at least quarterly with scores documented", "Average franchise compliance score above 85% across the network", "Non-compliance remediation plans completed within agreed timescales in 90% of cases", "Franchise partner satisfaction with support above 7 out of 10 in annual survey"],
  "dependencies": ["B187", "B188"],
  "constraints": ["Franchise agreement must clearly define audit rights and access for the franchisor", "Audit findings must be documented and stored securely for potential legal proceedings", "Franchisee data protection rights must be respected in audit processes"],
  "time_load": {"L1": "6 hours (compliance document compilation, scorecard creation)", "L2": "4 hours/quarter per franchise location (audit, reporting, follow-up)", "L3": "8 hours/year (annual reviews, advisory council, external audit coordination)"},
  "review_protocol": "Quarterly franchise compliance audits at every location. Monthly review of remediation plan progress for non-compliant sites. Annual franchise relationship review with each partner. Annual review of compliance standards and scorecard.",
  "meta": {"summary_for_humans": "This block establishes a structured audit framework for franchise compliance covering brand standards, operations, financial reporting, and legal obligations, with a tiered response system for non-compliance.", "implementation_risks": ["Overly aggressive auditing can alienate franchisees and damage the relationship", "Under-resourced audit programmes produce superficial assessments that miss real issues", "Franchise agreements that do not clearly define audit rights limit the franchisor's ability to enforce compliance"], "notes_for_engine": "Chain-only block, specifically for franchise operations. Depends on B187 (brand audits) and B188 (SOP library). Activate when a franchise model is in operation or being planned.", "tags": ["franchise", "compliance", "audit", "brand_standards", "multi_site", "chain", "governance", "franchise_management"]},
  "applicability": {"venue_types": CHAIN_ONLY, "team_size_min": 5, "team_size_max": 99},
  "enrichment_status": {"level": "gold", "enriched_at": "2026-03-04T12:00:00Z", "enriched_by": "claude_direct_v2", "source_quality": "ai_generated"}
})

wb({
  "block_id": "B193",
  "name": "Central Procurement Framework",
  "version": "v1.0",
  "domain": "D11_growth_strategy",
  "module": "M15: Multi-Site & Chain Management",
  "state": "enriched",
  "purpose": "Establishes a centralised procurement framework that leverages the buying power of multiple sites to negotiate better prices, ensure consistent product quality, streamline supplier management, and reduce the administrative burden on individual site managers. This block transforms purchasing from a fragmented, site-by-site activity into a strategic function.",
  "purpose_extended": {
    "detailed_objectives": [
      "Consolidate supplier relationships across all sites to negotiate volume-based pricing",
      "Establish an approved supplier list ensuring consistent product quality and brand standards",
      "Create a central ordering system or framework that simplifies procurement for site managers",
      "Negotiate improved payment terms, delivery schedules, and service level agreements",
      "Implement category management to optimise spend across key purchasing categories"
    ],
    "secondary_objectives": [
      "Reduce procurement cost as a percentage of revenue through consolidated buying power",
      "Minimise supply chain disruption by maintaining approved alternative suppliers",
      "Ensure food safety and quality standards are maintained through supplier vetting",
      "Build data visibility across the supply chain for better forecasting and waste reduction"
    ]
  },
  "why_this_matters": "Procurement is typically the second-largest cost category for a cafe after labour, accounting for 25\u201340% of revenue. In a multi-site operation where each site orders independently, the business is paying the small-buyer price at every location, missing volume discounts that could save 5\u201315% across key categories. A chain buying 500kg of coffee per month across 8 sites should pay significantly less per kilogram than each site ordering 60kg independently. Beyond price, centralised procurement ensures consistency: every site uses the same milk, the same syrups, the same takeaway cups, and the same cleaning products. This consistency is essential for brand standards (B187) and customer experience. Centralised procurement also simplifies supplier management, reducing the number of invoices, deliveries, and relationships that each site manager must handle, freeing them to focus on operations and customer service.",
  "application_logic": {
    "L1": "IMMEDIATE (0\u20132 weeks). Week 1: Audit current procurement across all sites. List every supplier used, what they supply, the price paid, payment terms, and delivery frequency. Identify where different sites use different suppliers for the same product and where pricing varies. Calculate total spend by category: coffee, milk, food ingredients, bakery, packaging, cleaning, equipment consumables. Week 2: Identify the top 5 categories by total spend and the top 5 suppliers by total value. For each, assess whether consolidation to a single supplier (or a reduced number) would unlock volume pricing. Begin conversations with key suppliers about multi-site pricing.",
    "L2": "SYSTEM BUILD (2\u20138 weeks). Negotiate central supply agreements for the top categories. Create an approved supplier list with clear criteria for approval: price competitiveness, product quality, delivery reliability, food safety accreditation, and sustainability credentials. Develop a central ordering framework \u2014 this could be a shared ordering portal, a consolidated order managed by head office, or a framework agreement that sites order against directly. Establish delivery schedules that optimise logistics and reduce per-delivery costs. Create a supplier performance review process with quarterly assessments.",
    "L3": "CULTURE & EXCELLENCE (8+ weeks). Implement category management across all procurement: assign a category owner for each major spend area. Negotiate annual supply agreements with built-in price review mechanisms. Develop alternative supplier relationships for business continuity. Use cross-site demand data to improve ordering accuracy and reduce waste. Explore cooperative purchasing with other independent cafe groups for even greater buying power."
  },
  "execution_framework": {
    "L1_setup": {"title": "Immediate Actions", "actions": ["Audit current procurement across all sites: suppliers, products, prices, terms", "Calculate total spend by category across the estate", "Identify consolidation opportunities where multiple suppliers serve the same need", "Begin multi-site pricing conversations with key suppliers", "Create a master supplier list with contact details and current terms", "Identify the top 5 categories for immediate consolidation", "Assess current delivery logistics for optimisation potential"], "responsible": "Operations Director, Finance Director"},
    "L2_build": {"title": "System Development", "actions": ["Negotiate central supply agreements for top categories", "Create an approved supplier list with clear approval criteria", "Develop a central ordering framework or portal", "Establish optimised delivery schedules across all sites", "Create a supplier performance review process", "Build a procurement cost tracking dashboard", "Develop a new supplier vetting and approval process"], "responsible": "Procurement Lead, Operations Director"},
    "L3_embed": {"title": "Culture Embedding", "actions": ["Implement category management with assigned category owners", "Negotiate annual supply agreements with price review mechanisms", "Develop alternative supplier relationships for business continuity", "Use cross-site demand data for improved forecasting", "Explore cooperative purchasing with other cafe groups", "Conduct annual procurement strategy review"], "responsible": "Procurement Lead, Finance Director, CEO"}
  },
  "deliverables": ["Procurement Audit Report (current state across all sites)", "Approved Supplier List with vetting criteria", "Central Supply Agreements for key categories", "Procurement Cost Dashboard", "Supplier Performance Review template"],
  "embedded_tools": [],
  "tool_definitions": {"tools": [
    {"tool_id": "T193-01", "tool_name": "Procurement Audit Template", "level": "L1", "format": "template", "owner_role": "Operations Director", "description": "Template for auditing current procurement across all sites: supplier details, products, prices, terms, delivery frequency, and total spend by category."},
    {"tool_id": "T193-02", "tool_name": "Approved Supplier List", "level": "L2", "format": "tracker", "owner_role": "Procurement Lead", "description": "Master list of approved suppliers with approval status, product categories, pricing, terms, food safety accreditation, and review dates."},
    {"tool_id": "T193-03", "tool_name": "Supplier Performance Scorecard", "level": "L2", "format": "checklist", "owner_role": "Procurement Lead", "description": "Quarterly scorecard assessing each key supplier on price competitiveness, product quality, delivery reliability, invoice accuracy, and responsiveness."},
    {"tool_id": "T193-04", "tool_name": "Procurement Cost Dashboard", "level": "L2", "format": "dashboard", "owner_role": "Finance Director", "description": "Dashboard tracking total procurement spend by category, price trends, savings versus pre-consolidation baseline, and cost as percentage of revenue across all sites."},
    {"tool_id": "T193-05", "tool_name": "Central Supply Agreement Template", "level": "L3", "format": "template", "owner_role": "Finance Director", "description": "Template for negotiating and documenting central supply agreements: volumes, pricing tiers, payment terms, delivery schedule, quality standards, and termination clauses."}
  ]},
  "failure_modes": ["Central agreements restrict site managers from sourcing locally, reducing quality or freshness for perishable items", "Volume commitments are overestimated, leading to contractual obligations the business cannot fulfil", "Supplier consolidation creates single points of failure with no backup suppliers in place", "Site managers circumvent central procurement by ordering independently, undermining negotiated prices"],
  "kpis": ["Procurement cost as percentage of revenue reduced by at least 2 percentage points within 12 months", "90% of procurement spend through approved suppliers", "Supplier performance reviews completed quarterly for all key suppliers", "Zero supply chain disruptions lasting more than 24 hours"],
  "dependencies": ["B104", "B107"],
  "constraints": ["Central agreements must allow for local sourcing of perishable items where quality demands it", "Volume commitments must be realistic and achievable across the estate", "Franchise sites may have existing supplier relationships that need to be transitioned gradually"],
  "time_load": {"L1": "8 hours (procurement audit across all sites)", "L2": "20 hours (supplier negotiations, agreement drafting, system setup)", "L3": "4 hours/quarter (performance reviews, strategy updates)"},
  "review_protocol": "Quarterly supplier performance reviews. Monthly procurement cost tracking. Annual central supply agreement reviews and renegotiations. Immediate review when supply disruptions occur.",
  "meta": {"summary_for_humans": "This block creates a centralised procurement framework that consolidates buying power across multiple sites to achieve better pricing, consistent quality, and streamlined supplier management.", "implementation_risks": ["Over-centralisation can alienate site managers who value local supplier relationships", "Volume commitments can become contractual liabilities if the estate contracts", "Transitioning from multiple suppliers to central agreements requires careful change management"], "notes_for_engine": "Chain-only block. Depends on B104 (supplier management) and B107 (cost management). Activate when the estate reaches 3+ sites. Significant cost-saving potential.", "tags": ["procurement", "purchasing", "suppliers", "multi_site", "chain", "cost_control", "volume_buying", "supply_chain"]},
  "applicability": {"venue_types": CHAIN_ONLY, "team_size_min": 5, "team_size_max": 99},
  "enrichment_status": {"level": "gold", "enriched_at": "2026-03-04T12:00:00Z", "enriched_by": "claude_direct_v2", "source_quality": "ai_generated"}
})

wb({
  "block_id": "B194",
  "name": "Cross-Site Best Practice Network",
  "version": "v1.0",
  "domain": "D11_growth_strategy",
  "module": "M15: Multi-Site & Chain Management",
  "state": "enriched",
  "purpose": "Creates a structured framework for identifying, documenting, sharing, and implementing best practices across all locations in a multi-site cafe operation. This block ensures that the innovation and problem-solving that happens at individual sites benefits the entire network rather than remaining siloed.",
  "purpose_extended": {
    "detailed_objectives": [
      "Establish a systematic process for capturing best practices from individual sites",
      "Create a sharing platform (physical or digital) where learnings are accessible to all site teams",
      "Build a culture where sharing knowledge is valued and recognised",
      "Implement a process for evaluating, validating, and rolling out best practices network-wide",
      "Connect site managers with peers for problem-solving and mutual support"
    ],
    "secondary_objectives": [
      "Reduce duplication of effort where multiple sites solve the same problem independently",
      "Accelerate improvement across the network by spreading innovations quickly",
      "Build stronger inter-site relationships and a sense of shared purpose",
      "Feed validated best practices into the SOP library (B188) for permanent adoption"
    ]
  },
  "why_this_matters": "In a multi-site operation, every location faces similar challenges: managing peak periods, reducing waste, improving speed of service, retaining staff, and maintaining quality under pressure. Without a best practice network, each site solves these problems independently, often arriving at different solutions of varying quality. The best ideas remain trapped at the site that created them, while other locations struggle with the same issues unnecessarily. A structured best practice network changes this by creating channels for ideas to flow across the organisation. When Location A discovers that pre-batching a popular syrup-based drink reduces service time by 20 seconds during peak, that knowledge should reach every other location within weeks, not months or never. The best multi-site operators in the UK treat knowledge sharing as a competitive advantage, recognising that the collective intelligence of 50 team members across 8 sites is far greater than any individual or central office.",
  "application_logic": {
    "L1": "IMMEDIATE (0\u20132 weeks). Week 1: Establish a simple best practice sharing mechanism. This can be as basic as a shared document, WhatsApp group, or a standing agenda item in area manager meetings where each site shares one thing that is working well. Create a best practice submission form (T194-01) that captures: the practice, the problem it solves, the results observed, and how other sites could implement it. Week 2: Ask each site manager to submit at least one best practice from their location. Compile these into a best practice bulletin and distribute to all sites. Identify the three most impactful practices for immediate network-wide adoption.",
    "L2": "SYSTEM BUILD (2\u20138 weeks). Create a quarterly best practice forum where site managers from across the network meet (in person or virtually) to share learnings, discuss challenges, and learn from each other. Establish a validation process: before a best practice is recommended for network-wide adoption, it should be tested at a second site to confirm the results are replicable. Build a best practice library organised by topic (speed of service, waste reduction, team management, customer experience, cleaning, etc.). Introduce a best practice ambassador role at each site \u2014 a team member who actively looks for improvements and shares them with the network.",
    "L3": "CULTURE & EXCELLENCE (8+ weeks). Integrate best practice sharing into the culture through recognition programmes: awards for the most impactful shared practice each quarter, mentions in company communications, and contribution to performance reviews. Create site exchange visits where team members spend a shift at another location to learn their methods firsthand. Feed validated best practices into the SOP library (B188) so they become permanent standard procedures. Track the financial or operational impact of adopted best practices to quantify the value of the network."
  },
  "execution_framework": {
    "L1_setup": {"title": "Immediate Actions", "actions": ["Establish a simple best practice sharing channel (shared document, messaging group, or meeting agenda)", "Create a best practice submission form", "Ask each site manager to submit at least one best practice", "Compile initial submissions into a best practice bulletin", "Distribute the bulletin to all sites", "Identify the top three practices for immediate network-wide adoption", "Celebrate early contributions to set the cultural tone"], "responsible": "Operations Director, Area Manager"},
    "L2_build": {"title": "System Development", "actions": ["Establish a quarterly best practice forum for site managers", "Create a validation process for testing practices at a second site", "Build a best practice library organised by topic", "Introduce a best practice ambassador role at each site", "Create a standard format for documenting and sharing practices", "Begin tracking adoption rates across sites", "Integrate best practice sharing into area manager visit agendas"], "responsible": "Operations Director, Area Manager"},
    "L3_embed": {"title": "Culture Embedding", "actions": ["Launch a quarterly best practice recognition programme", "Organise site exchange visits for cross-pollination of ideas", "Feed validated best practices into the SOP library", "Track and communicate the financial impact of adopted practices", "Conduct annual best practice network review and improvement", "Ensure best practice sharing is valued in performance reviews"], "responsible": "Operations Director, Senior Leadership"}
  },
  "deliverables": ["Best Practice Submission Form", "Quarterly Best Practice Bulletin", "Best Practice Library (organised by topic)", "Best Practice Forum agenda template", "Best Practice Impact Tracking template"],
  "embedded_tools": [],
  "tool_definitions": {"tools": [
    {"tool_id": "T194-01", "tool_name": "Best Practice Submission Form", "level": "L1", "format": "template", "owner_role": "All Staff", "description": "Simple form for submitting a best practice: what the practice is, what problem it solves, the results observed, how to implement it, and any resources needed."},
    {"tool_id": "T194-02", "tool_name": "Quarterly Best Practice Bulletin", "level": "L1", "format": "template", "owner_role": "Operations Director", "description": "Quarterly newsletter or document compiling the best shared practices from across the network, with implementation guidance and contact details for the originating site."},
    {"tool_id": "T194-03", "tool_name": "Best Practice Library Index", "level": "L2", "format": "tracker", "owner_role": "Operations Director", "description": "Master index of all validated best practices organised by topic, with status (submitted/validated/adopted), originating site, adoption rate, and measured impact."},
    {"tool_id": "T194-04", "tool_name": "Best Practice Forum Agenda Template", "level": "L2", "format": "template", "owner_role": "Area Manager", "description": "Structured agenda for quarterly best practice forums: featured practices, implementation updates, challenge discussions, and action planning."},
    {"tool_id": "T194-05", "tool_name": "Best Practice Impact Tracker", "level": "L3", "format": "dashboard", "owner_role": "Operations Director", "description": "Dashboard tracking the operational and financial impact of adopted best practices across the network: practices adopted, sites implementing, measured improvements, and estimated value created."}
  ]},
  "failure_modes": ["Best practice sharing is launched enthusiastically but fades within months due to lack of follow-up", "Practices are shared but never validated, leading to ineffective or harmful methods being adopted", "Site managers are too busy with daily operations to engage with the network", "The network becomes a top-down broadcast channel rather than a genuine peer-to-peer sharing platform"],
  "kpis": ["At least one best practice submitted per site per quarter", "Quarterly best practice forum attended by all site managers", "At least 3 validated best practices adopted network-wide per year", "Measurable improvement (time, cost, or quality) demonstrated for each adopted practice"],
  "dependencies": ["B187", "B191"],
  "constraints": ["Best practice sharing requires protected time for site managers to contribute", "Validation at a second site adds time before network-wide rollout", "Best practices must be documented clearly enough for any site to implement without the originator present"],
  "time_load": {"L1": "2 hours (sharing channel setup, initial submissions)", "L2": "4 hours/quarter (forums, validation, library management)", "L3": "2 hours/quarter (impact tracking, recognition, SOP integration)"},
  "review_protocol": "Quarterly best practice forums with all site managers. Monthly review of submissions and adoption progress by operations director. Annual review of best practice network effectiveness and programme refresh.",
  "meta": {"summary_for_humans": "This block creates a structured framework for identifying, sharing, and implementing best practices across all sites, ensuring that innovation at individual locations benefits the entire network.", "implementation_risks": ["Without ongoing energy and leadership support, best practice networks fizzle out quickly", "Forced participation creates resentment \u2014 the network should be valued, not mandated", "Best practices from one site may not transfer directly to another with different conditions"], "notes_for_engine": "Chain-only block. Depends on B187 (brand audits for identifying good practice) and B191 (area managers as facilitators). Activate when the estate reaches 3+ sites.", "tags": ["best_practice", "knowledge_sharing", "multi_site", "chain", "innovation", "learning", "collaboration", "network"]},
  "applicability": {"venue_types": CHAIN_ONLY, "team_size_min": 5, "team_size_max": 99},
  "enrichment_status": {"level": "gold", "enriched_at": "2026-03-04T12:00:00Z", "enriched_by": "claude_direct_v2", "source_quality": "ai_generated"}
})

print("=== B187-B194 complete ===")
