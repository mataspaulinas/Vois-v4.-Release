import json, os
base_path = r"C:\Users\matas\Documents\00 vOIS 3+4 Merge\OIS_Cafe\01_ontology\blocks"
ALL_8 = ["independent_cafe", "specialty_coffee", "chain_cafe", "franchise_cafe", "drive_through", "kiosk", "coffee_van", "bakery_cafe"]
def wb(block):
    path = os.path.join(base_path, block["block_id"] + ".json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(block, f, indent=2, ensure_ascii=False)
    print(block["block_id"] + " written")

wb({
  "block_id": "B195",
  "name": "Sustainability Strategy",
  "version": "v1.0",
  "domain": "D12_culture_identity",
  "module": "M06: Identity, Values & Community",
  "state": "enriched",
  "purpose": "Develops a comprehensive sustainability strategy covering environmental impact, ethical sourcing, waste reduction, energy efficiency, and community engagement. This block moves sustainability from occasional gestures to a structured, measurable programme that is embedded in the cafe's identity and operations.",
  "purpose_extended": {
    "detailed_objectives": [
      "Conduct a sustainability baseline audit covering energy use, water consumption, waste generation, packaging, and supply chain impact",
      "Set measurable sustainability targets aligned with the cafe's values and customer expectations",
      "Develop action plans across five pillars: energy, water, waste, sourcing, and community",
      "Create a customer-facing sustainability commitment that builds brand loyalty and differentiation",
      "Track and report on sustainability metrics quarterly to demonstrate progress"
    ],
    "secondary_objectives": [
      "Reduce operating costs through energy efficiency and waste reduction",
      "Attract environmentally conscious customers and staff who prioritise sustainability",
      "Prepare for tightening environmental regulations and reporting requirements",
      "Build partnerships with local environmental organisations and community groups"
    ]
  },
  "why_this_matters": "Sustainability has moved from a nice-to-have to a business imperative for UK cafes. The Allegra World Coffee Portal reports that 67% of UK coffee consumers consider a cafe's environmental practices when choosing where to spend their money. The Environment Act 2021 and Simpler Recycling requirements (effective from 2025 for businesses) are tightening regulations around waste separation and recycling. Energy costs have risen dramatically, making efficiency not just environmentally responsible but financially essential. A cafe's supply chain \u2014 coffee, milk, food, packaging \u2014 carries a significant carbon footprint, and customers increasingly want to know that their purchases are ethically sourced and sustainably produced. Beyond customer expectations, sustainability reduces costs: LED lighting saves 50\u201370% on lighting energy, reducing food waste by 30% can save thousands annually, and reusable cup programmes reduce packaging spend. A structured sustainability strategy ensures the cafe captures these benefits systematically rather than through ad-hoc initiatives.",
  "application_logic": {
    "L1": "IMMEDIATE (0\u20132 weeks). Week 1: Conduct a sustainability baseline audit. Walk through the cafe documenting: energy sources and consumption (electricity, gas), water use points, waste streams (general, recycling, food, coffee grounds, oils), packaging types (cups, lids, bags, containers), cleaning product types, and supply chain basics (coffee origin, milk supplier, food sourcing). Week 2: Identify the five quick wins \u2014 changes that can be made immediately with minimal cost: switching to LED bulbs, implementing proper recycling separation, offering a reusable cup discount, sourcing a local milk supplier, and composting coffee grounds. Communicate the sustainability commitment to the team and begin implementing quick wins.",
    "L2": "SYSTEM BUILD (2\u20138 weeks). Develop a structured sustainability action plan across five pillars: (1) Energy: audit energy usage, switch to renewable tariff, install smart meters, optimise equipment schedules; (2) Water: install flow restrictors, fix leaks, review dishwasher cycles; (3) Waste: implement B181 waste logging, partner with food redistribution charities, eliminate single-use where possible; (4) Sourcing: review supply chain for ethical and environmental credentials, prioritise local suppliers, assess coffee sourcing transparency; (5) Community: engage with local environmental initiatives, host sustainability events, educate customers. Set quarterly targets for each pillar and begin tracking progress.",
    "L3": "CULTURE & EXCELLENCE (8+ weeks). Publish an annual sustainability report showing progress against targets. Seek relevant certifications: Sustainable Restaurant Association membership, B Corp assessment, or local sustainability awards. Engage staff as sustainability champions with dedicated responsibilities. Explore carbon offsetting for unavoidable emissions. Build sustainability into the brand narrative through menu design, signage, and social media. Benchmark against industry leaders and continuously raise ambition. Review and update the strategy annually."
  },
  "execution_framework": {
    "L1_setup": {"title": "Immediate Actions", "actions": ["Conduct a sustainability baseline audit covering energy, water, waste, packaging, and sourcing", "Identify five quick-win sustainability improvements", "Switch to LED lighting throughout the premises", "Implement proper waste recycling separation", "Offer a reusable cup discount (minimum 25p)", "Communicate the sustainability commitment to the team", "Begin composting or recycling coffee grounds"], "responsible": "Cafe Owner, Manager"},
    "L2_build": {"title": "System Development", "actions": ["Develop a five-pillar sustainability action plan with quarterly targets", "Audit energy usage and switch to a renewable energy tariff", "Review and improve water efficiency at all use points", "Integrate sustainability into waste management (B181)", "Review supply chain for ethical and environmental credentials", "Engage with local environmental community initiatives", "Begin quarterly sustainability metrics tracking"], "responsible": "Manager, Sustainability Champion"},
    "L3_embed": {"title": "Culture Embedding", "actions": ["Publish an annual sustainability report", "Seek relevant sustainability certifications", "Appoint staff sustainability champions", "Explore carbon offsetting for unavoidable emissions", "Build sustainability into the brand narrative and marketing", "Benchmark against industry leaders", "Review and update the sustainability strategy annually"], "responsible": "Owner, Manager"}
  },
  "deliverables": ["Sustainability Baseline Audit report", "Five-Pillar Sustainability Action Plan", "Quarterly Sustainability Metrics Dashboard", "Customer-Facing Sustainability Commitment", "Annual Sustainability Report template"],
  "embedded_tools": [],
  "tool_definitions": {"tools": [
    {"tool_id": "T195-01", "tool_name": "Sustainability Baseline Audit Template", "level": "L1", "format": "template", "owner_role": "Owner", "description": "Comprehensive audit template covering energy, water, waste, packaging, and supply chain sustainability with current state assessment and improvement opportunities."},
    {"tool_id": "T195-02", "tool_name": "Five-Pillar Sustainability Action Plan", "level": "L2", "format": "template", "owner_role": "Manager", "description": "Structured action plan covering energy, water, waste, sourcing, and community with specific actions, targets, timelines, and progress tracking for each pillar."},
    {"tool_id": "T195-03", "tool_name": "Quarterly Sustainability Metrics Dashboard", "level": "L2", "format": "dashboard", "owner_role": "Manager", "description": "Dashboard tracking key sustainability metrics: energy consumption, waste diversion rate, single-use packaging reduction, and supply chain certifications."},
    {"tool_id": "T195-04", "tool_name": "Customer Sustainability Commitment Card", "level": "L1", "format": "reference", "owner_role": "Owner", "description": "Customer-facing document or signage communicating the cafe's sustainability commitments, current practices, and progress in clear, engaging language."},
    {"tool_id": "T195-05", "tool_name": "Annual Sustainability Report Template", "level": "L3", "format": "template", "owner_role": "Owner", "description": "Template for producing an annual sustainability report covering all five pillars, progress against targets, financial savings achieved, and targets for the coming year."}
  ]},
  "failure_modes": ["Sustainability becomes greenwashing \u2014 claims are made without measurable action or evidence", "Quick wins are implemented but the structured programme is never developed", "Staff are not engaged and sustainability practices are not maintained consistently", "The cost of sustainability initiatives deters the owner from progressing beyond the basics"],
  "kpis": ["Energy consumption reduced by 10% within 12 months of programme launch", "Food waste reduction of 20% within 12 months (linked to B181)", "Single-use cup usage reduced by 30% through reusable cup programme", "At least one sustainability certification obtained within 18 months"],
  "dependencies": ["B059", "B110"],
  "constraints": ["Some sustainability improvements require capital investment that may not be immediately affordable", "Supply chain sustainability depends on supplier willingness to provide transparency", "Simpler Recycling regulations require businesses to separate waste streams from 2025"],
  "time_load": {"L1": "3 hours (baseline audit, quick wins identification)", "L2": "8 hours (action plan development, target setting, system setup)", "L3": "4 hours/quarter (metrics tracking, reporting, strategy review)"},
  "review_protocol": "Monthly review of quick-win implementation. Quarterly sustainability metrics review. Annual sustainability strategy review and target update. Immediate review when regulations change.",
  "meta": {"summary_for_humans": "This block develops a comprehensive sustainability strategy across energy, water, waste, sourcing, and community, moving from ad-hoc green gestures to a measurable, structured programme.", "implementation_risks": ["Sustainability can feel overwhelming \u2014 start with quick wins and build momentum", "Customer-facing claims must be backed by genuine action to avoid greenwashing accusations", "Some initiatives require upfront investment before delivering savings"], "notes_for_engine": "Activate alongside B059 (environmental) and B110 (community). Relevant to all venue types. Flag if signals indicate customer concern about sustainability or regulatory pressure.", "tags": ["sustainability", "environment", "energy", "waste", "ethical_sourcing", "community", "green", "carbon"]},
  "applicability": {"venue_types": ALL_8, "team_size_min": 1, "team_size_max": 99},
  "enrichment_status": {"level": "gold", "enriched_at": "2026-03-04T12:00:00Z", "enriched_by": "claude_direct_v2", "source_quality": "ai_generated"}
})

wb({
  "block_id": "B196",
  "name": "Reusable Cup Programme",
  "version": "v1.0",
  "domain": "D03_product_quality",
  "module": "M03: Beverage Programme & Quality Standards",
  "state": "enriched",
  "purpose": "Designs and implements a reusable cup programme that incentivises customers to bring their own cups, reduces single-use packaging waste, lowers operational costs, and strengthens the cafe's sustainability credentials. This block covers programme design, pricing incentives, hygiene protocols, and marketing to drive adoption.",
  "purpose_extended": {
    "detailed_objectives": [
      "Design a reusable cup incentive structure that motivates behaviour change (discount for own cup, charge for disposable)",
      "Establish hygiene protocols for handling customer reusable cups safely",
      "Create or source branded reusable cups for sale as an additional revenue stream",
      "Set adoption targets and track reusable cup usage as a percentage of total takeaway drinks",
      "Market the programme to customers through in-store signage, social media, and loyalty integration"
    ],
    "secondary_objectives": [
      "Reduce spending on disposable cups, lids, and sleeves",
      "Strengthen the cafe's environmental brand positioning",
      "Generate additional revenue through branded reusable cup sales",
      "Contribute to industry-wide single-use reduction targets"
    ]
  },
  "why_this_matters": "The UK uses approximately 2.5 billion disposable coffee cups per year, with fewer than 1% being recycled due to their polyethylene lining. The Environmental Audit Committee has repeatedly called for action on coffee cup waste, and the introduction of a latte levy remains under discussion. Many local authorities now include cafe cup waste in their environmental strategies. For cafes, disposable cups represent a significant cost: a standard 12oz cup with lid and sleeve costs 8\u201312p per unit, amounting to thousands of pounds annually. A successful reusable cup programme can reduce this cost by 20\u201340% while differentiating the cafe from competitors. Major chains have set ambitious targets: most now offer at least a 25p discount for reusable cups, and some charge a premium for disposable cups. Independent cafes have an opportunity to lead on this, building genuine community engagement around sustainability.",
  "application_logic": {
    "L1": "IMMEDIATE (0\u20132 weeks). Week 1: Decide on the incentive structure. Options include: a discount for bringing a reusable cup (typically 25\u201350p), a charge for disposable cups (typically 10\u201325p added), or a loyalty scheme (every 10 reusable cup uses earns a free drink). Best practice is to combine a discount with visible in-store communication. Source or design branded reusable cups for sale \u2014 a good quality KeepCup or similar retails at \u00a38\u2013\u00a315 and serves as walking advertising for the cafe. Week 2: Establish hygiene protocols: staff should not handle the inside of customer cups, drinks should be prepared in the usual way and poured into the customer's cup, and visibly dirty cups should be politely declined. Train all staff on the programme, the hygiene protocol, and how to promote it positively. Put up in-store signage promoting the discount.",
    "L2": "SYSTEM BUILD (2\u20138 weeks). Configure the EPOS system to track reusable cup usage as a separate discount line so adoption can be measured. Set a target: aim for 15% of takeaway drinks served in reusable cups within 6 months. Launch a social media campaign promoting the programme. Consider a deposit-return scheme for branded cups: customers pay a deposit and can return the cup for a refund or keep it. Partner with local businesses or offices to promote the programme to their employees. Display the running count of disposable cups saved in a visible location.",
    "L3": "CULTURE & EXCELLENCE (8+ weeks). Integrate reusable cup metrics into the sustainability dashboard (B195). Explore cup-sharing schemes such as Again or CupClub where cups are borrowed and returned. Engage with local schools and community groups to promote reusable cup adoption. Review the incentive structure annually \u2014 if adoption plateaus, consider increasing the differential between reusable and disposable pricing. Share achievements with customers through an annual sustainability report."
  },
  "execution_framework": {
    "L1_setup": {"title": "Immediate Actions", "actions": ["Decide on the reusable cup incentive structure (discount, charge, or loyalty)", "Source or design branded reusable cups for sale", "Establish hygiene protocols for handling customer reusable cups", "Train all staff on the programme and hygiene protocol", "Install in-store signage promoting the reusable cup discount", "Update the menu board to show the reusable cup discount", "Begin offering the discount from day one"], "responsible": "Cafe Owner, Manager"},
    "L2_build": {"title": "System Development", "actions": ["Configure EPOS to track reusable cup usage separately", "Set a 6-month adoption target (15% of takeaway drinks)", "Launch a social media campaign promoting the programme", "Consider a deposit-return scheme for branded cups", "Partner with local businesses to promote reusable cup use", "Display a running count of disposable cups saved", "Review disposable cup purchasing volumes monthly"], "responsible": "Manager, Marketing Lead"},
    "L3_embed": {"title": "Culture Embedding", "actions": ["Integrate reusable cup metrics into the sustainability dashboard", "Explore cup-sharing or deposit-return scheme partnerships", "Engage local schools and community groups", "Review incentive structure annually to maintain adoption momentum", "Share achievements in the annual sustainability report", "Celebrate milestones with the team and customers"], "responsible": "Owner, Manager"}
  },
  "deliverables": ["Reusable Cup Programme Design document", "Hygiene Protocol for reusable cups", "In-Store Signage and Marketing materials", "EPOS configuration guide for tracking reusable cup usage", "Monthly Adoption Tracking report"],
  "embedded_tools": [],
  "tool_definitions": {"tools": [
    {"tool_id": "T196-01", "tool_name": "Reusable Cup Programme Design Template", "level": "L1", "format": "template", "owner_role": "Owner", "description": "Template for designing the reusable cup programme: incentive structure, pricing, branded cup specifications, hygiene protocol, and marketing plan."},
    {"tool_id": "T196-02", "tool_name": "Reusable Cup Hygiene Protocol", "level": "L1", "format": "SOP", "owner_role": "Manager", "description": "Standard Operating Procedure for handling customer reusable cups safely: what to accept, how to pour, when to decline, and cleaning considerations."},
    {"tool_id": "T196-03", "tool_name": "Reusable Cup Adoption Tracker", "level": "L2", "format": "tracker", "owner_role": "Manager", "description": "Monthly tracker showing reusable cup usage as a percentage of total takeaway drinks, disposable cups saved, cost savings, and progress against targets."},
    {"tool_id": "T196-04", "tool_name": "In-Store Signage Templates", "level": "L1", "format": "template", "owner_role": "Manager", "description": "Ready-to-print signage templates promoting the reusable cup discount, displayed at the counter, menu board, and entrance."},
    {"tool_id": "T196-05", "tool_name": "Reusable Cup Social Media Campaign Pack", "level": "L2", "format": "template", "owner_role": "Marketing Lead", "description": "Social media content pack with posts, images, and messaging for launching and maintaining awareness of the reusable cup programme."}
  ]},
  "failure_modes": ["The discount is too small to motivate behaviour change and adoption remains below 5%", "Hygiene protocols are not followed, creating food safety risks with customer cups", "Staff do not actively promote the programme and customers remain unaware", "Branded reusable cups are priced too high and do not sell"],
  "kpis": ["Reusable cup usage reaches 15% of takeaway drinks within 6 months", "Disposable cup spending reduced by 20% within 12 months", "At least 50 branded reusable cups sold within the first 3 months", "Zero hygiene incidents related to reusable cup handling"],
  "dependencies": ["B057"],
  "constraints": ["Hygiene protocols must comply with food safety legislation \u2014 staff must not handle the inside of customer cups", "EPOS system must be capable of tracking reusable cup transactions separately", "Branded cups require minimum order quantities from suppliers"],
  "time_load": {"L1": "2 hours (programme design, hygiene protocol, signage)", "L2": "3 hours (EPOS setup, marketing campaign, partnership outreach)", "L3": "1 hour/month (tracking, review, campaign refresh)"},
  "review_protocol": "Monthly review of adoption rates and cost savings. Quarterly review of programme effectiveness and marketing. Annual review of incentive structure and targets.",
  "meta": {"summary_for_humans": "This block designs and implements a reusable cup programme with pricing incentives, hygiene protocols, and marketing to reduce single-use waste and strengthen the cafe's sustainability credentials.", "implementation_risks": ["Customer adoption is slow without a compelling incentive and visible promotion", "Hygiene concerns around reusable cups need clear protocols to manage safely", "Programme momentum can fade without regular marketing refreshes"], "notes_for_engine": "Activate alongside B057 (stock management) and B195 (sustainability strategy). Relevant to all venue types. Flag if signals indicate customer demand for sustainability or high disposable cup costs.", "tags": ["reusable_cup", "sustainability", "waste_reduction", "packaging", "environment", "customer_engagement", "incentive"]},
  "applicability": {"venue_types": ALL_8, "team_size_min": 1, "team_size_max": 99},
  "enrichment_status": {"level": "gold", "enriched_at": "2026-03-04T12:00:00Z", "enriched_by": "claude_direct_v2", "source_quality": "ai_generated"}
})

wb({
  "block_id": "B197",
  "name": "Coffee Education & Training Curriculum",
  "version": "v1.0",
  "domain": "D04_team_development",
  "module": "M04: Team Development & Training",
  "state": "enriched",
  "purpose": "Creates a structured coffee education curriculum that takes staff from basic competency to deep product knowledge, covering coffee origins, processing methods, roasting science, sensory evaluation, and advanced brewing techniques. This block transforms baristas from drink makers into coffee professionals who can educate customers, improve quality, and drive premiumisation.",
  "purpose_extended": {
    "detailed_objectives": [
      "Design a tiered coffee education curriculum: Foundation (all staff), Intermediate (experienced baristas), Advanced (head baristas and trainers)",
      "Cover the full coffee journey: origin, farming, processing, roasting, grinding, brewing, and sensory evaluation",
      "Integrate SCA (Specialty Coffee Association) frameworks where appropriate to provide industry-recognised benchmarks",
      "Build internal training delivery capability so the curriculum can be sustained without external trainers",
      "Create customer-facing education opportunities that enhance the cafe experience and justify premium pricing"
    ],
    "secondary_objectives": [
      "Increase staff engagement and retention by investing in professional development",
      "Support menu development with staff who understand flavour profiles and brewing variables",
      "Differentiate the cafe from competitors through demonstrable coffee expertise",
      "Build relationships with roasters and origin producers through deeper knowledge"
    ]
  },
  "why_this_matters": "In the UK specialty coffee market, product knowledge is a genuine differentiator. Customers who pay a premium for specialty coffee expect staff who can explain the origin, processing method, and flavour profile of what they are drinking. A barista who can say 'this is a washed Ethiopian Yirgacheffe with notes of bergamot and stone fruit' creates a fundamentally different experience from one who simply hands over a flat white. The SCA reports that cafes with trained staff achieve higher average transaction values, stronger customer loyalty, and better online reviews. Beyond customer impact, coffee education drives internal quality: baristas who understand extraction science can diagnose and fix quality issues independently, reducing waste and improving consistency. Staff who are invested in through education programmes show higher retention rates \u2014 the SCAE found that baristas with formal training stay an average of 8 months longer. In an industry plagued by high turnover, this alone justifies the investment.",
  "application_logic": {
    "L1": "IMMEDIATE (0\u20132 weeks). Week 1: Define the three-tier curriculum structure. Foundation Level (all staff within first month): what is coffee (plant, cherry, bean), basic processing methods (washed, natural, honey), how roasting affects flavour, the core brewing variables (dose, grind, time, temperature, ratio), and how to taste coffee (sweetness, acidity, body, finish). Intermediate Level (3\u20136 months): deeper origin knowledge (key producing countries, regional flavour profiles), extraction theory, milk science, latte art progression, and customer education techniques. Advanced Level (12+ months): cupping methodology, green coffee grading, roast profiling basics, advanced sensory calibration, and training delivery skills. Week 2: Deliver the first Foundation session to all current staff \u2014 a 90-minute workshop covering the basics with hands-on tasting of 3 different coffees.",
    "L2": "SYSTEM BUILD (2\u20138 weeks). Build out the Foundation curriculum into 4 sessions of 60\u201390 minutes each, delivered fortnightly. Create supporting materials: tasting wheels, origin maps, extraction charts, and recipe cards. Develop the Intermediate curriculum as a series of 6 sessions, available to baristas who have completed Foundation and demonstrated consistent quality. Partner with the cafe's roaster for origin-specific education sessions and consider hosting roaster visits. Introduce a coffee knowledge assessment at each level to verify learning and maintain standards. Begin building a library of educational resources: books, online courses, and tasting samples.",
    "L3": "CULTURE & EXCELLENCE (8+ weeks). Develop the Advanced curriculum including SCA-aligned modules. Encourage and support staff to pursue formal SCA certifications (Barista Skills, Brewing, Sensory). Create customer-facing education events: cupping sessions, brew demonstrations, origin talks. Build a culture where continuous learning is celebrated \u2014 feature staff achievements on social media, display certifications in the cafe, and link education milestones to pay progression. Develop internal trainers who can deliver the curriculum independently. Review and update the curriculum annually to reflect new coffees, techniques, and industry developments."
  },
  "execution_framework": {
    "L1_setup": {"title": "Immediate Actions", "actions": ["Define the three-tier curriculum structure (Foundation, Intermediate, Advanced)", "Outline the Foundation Level content covering coffee basics and tasting", "Schedule and deliver the first Foundation workshop for all current staff", "Source tasting samples representing different origins and processing methods", "Create a simple coffee tasting wheel or flavour reference card", "Assess current team knowledge to identify starting points", "Set expectations that all staff complete Foundation within their first month"], "responsible": "Head Barista, Manager"},
    "L2_build": {"title": "System Development", "actions": ["Build out the full Foundation curriculum (4 sessions)", "Develop the Intermediate curriculum (6 sessions)", "Create supporting educational materials: origin maps, extraction charts, tasting wheels", "Partner with the roaster for origin-specific education content", "Introduce knowledge assessments at each curriculum level", "Begin building a library of educational resources", "Schedule regular education sessions in the staff rota"], "responsible": "Head Barista, Manager"},
    "L3_embed": {"title": "Culture Embedding", "actions": ["Develop the Advanced curriculum with SCA-aligned content", "Support staff pursuing formal SCA certifications", "Create customer-facing education events (cuppings, brew demos)", "Link education milestones to pay progression and recognition", "Develop internal trainers to sustain the curriculum long-term", "Review and update the curriculum annually", "Celebrate staff education achievements publicly"], "responsible": "Owner, Head Barista"}
  },
  "deliverables": ["Three-Tier Coffee Education Curriculum outline", "Foundation Level session plans and materials", "Intermediate Level session plans and materials", "Coffee Tasting and Sensory Reference materials", "Knowledge Assessment templates for each level"],
  "embedded_tools": [],
  "tool_definitions": {"tools": [
    {"tool_id": "T197-01", "tool_name": "Coffee Education Curriculum Framework", "level": "L1", "format": "template", "owner_role": "Head Barista", "description": "Complete curriculum framework defining the three tiers (Foundation, Intermediate, Advanced), learning objectives, session outlines, and assessment criteria for each level."},
    {"tool_id": "T197-02", "tool_name": "Foundation Level Session Plans", "level": "L1", "format": "SOP", "owner_role": "Head Barista", "description": "Four detailed session plans for Foundation Level education covering coffee basics, processing, brewing variables, and introductory tasting, with facilitator notes and material lists."},
    {"tool_id": "T197-03", "tool_name": "Coffee Tasting Reference Pack", "level": "L1", "format": "reference", "owner_role": "All Staff", "description": "Reference pack including a coffee tasting wheel, flavour descriptor glossary, origin map with regional flavour profiles, and extraction variable chart."},
    {"tool_id": "T197-04", "tool_name": "Knowledge Assessment Templates", "level": "L2", "format": "template", "owner_role": "Head Barista", "description": "Written and practical assessment templates for each curriculum level, testing both theoretical knowledge and practical skills."},
    {"tool_id": "T197-05", "tool_name": "Staff Education Progress Tracker", "level": "L2", "format": "tracker", "owner_role": "Manager", "description": "Tracker recording each staff member's education progress: sessions attended, assessments completed, certifications achieved, and next development milestones."}
  ]},
  "failure_modes": ["Education sessions are scheduled but repeatedly cancelled due to operational pressures", "The curriculum is delivered once but not sustained, with new starters missing out", "Education is theoretical with no practical application, failing to improve actual drink quality", "Staff view education as an obligation rather than an opportunity, reducing engagement"],
  "kpis": ["All staff complete Foundation Level within their first month of employment", "At least 50% of baristas with 6+ months tenure complete Intermediate Level", "Measurable improvement in drink quality scores after curriculum completion", "At least one staff member achieves an SCA certification within 18 months"],
  "dependencies": ["B068"],
  "constraints": ["Education sessions require dedicated time that must be protected in the rota", "Tasting samples have a cost that must be budgeted for", "SCA certifications involve external examination fees"],
  "time_load": {"L1": "4 hours (curriculum design, first Foundation session)", "L2": "12 hours (full Foundation and Intermediate build-out)", "L3": "2 hours/month (ongoing sessions, assessments, curriculum maintenance)"},
  "review_protocol": "Monthly review of education session completion rates. Quarterly review of staff progression through curriculum levels. Annual curriculum review and update. Assessment review after each cohort completes a level.",
  "meta": {"summary_for_humans": "This block creates a structured coffee education curriculum taking staff from basic knowledge to professional expertise, covering origins, processing, roasting, brewing, and sensory evaluation.", "implementation_risks": ["Curriculum development requires significant upfront time investment", "Without rota protection, education sessions will be consistently deprioritised", "The head barista must be competent and confident enough to deliver training"], "notes_for_engine": "Activate alongside B068 (barista training). Foundation for B198 (cupping) and B206 (competition programme). Flag if signals indicate poor coffee quality, low customer satisfaction with drinks, or staff disengagement.", "tags": ["coffee_education", "training", "curriculum", "SCA", "sensory", "origins", "barista_development", "specialty"]},
  "applicability": {"venue_types": ALL_8, "team_size_min": 1, "team_size_max": 99},
  "enrichment_status": {"level": "gold", "enriched_at": "2026-03-04T12:00:00Z", "enriched_by": "claude_direct_v2", "source_quality": "ai_generated"}
})

wb({
  "block_id": "B198",
  "name": "Cupping & Quality Benchmarking",
  "version": "v1.0",
  "domain": "D03_product_quality",
  "module": "M03: Beverage Programme & Quality Standards",
  "state": "enriched",
  "purpose": "Establishes a regular cupping programme for evaluating coffee quality, calibrating the team's palate, benchmarking against competitors, and making informed decisions about green coffee selection, roast profiles, and menu development. This block brings the professional quality assurance practices of specialty coffee into the cafe's daily operations.",
  "purpose_extended": {
    "detailed_objectives": [
      "Implement a weekly or fortnightly cupping session for the barista team",
      "Train staff on SCA cupping protocols to ensure consistent and objective evaluation",
      "Use cupping data to inform green coffee purchasing and roaster feedback",
      "Benchmark the cafe's coffee against local competitors and industry standards",
      "Build sensory calibration across the team so quality assessment is consistent regardless of who is tasting"
    ],
    "secondary_objectives": [
      "Strengthen the relationship with the roaster through structured quality feedback",
      "Identify seasonal flavour shifts and adjust brewing recipes accordingly",
      "Develop staff palates to improve real-time quality control during service",
      "Create customer engagement opportunities through public cupping events"
    ]
  },
  "why_this_matters": "Cupping is the universal language of coffee quality. It is the method used at every stage of the supply chain \u2014 from farm to roastery to cafe \u2014 to evaluate and communicate flavour. A cafe that cups regularly has an objective, repeatable way to assess whether the coffee it serves meets its quality standards. Without cupping, quality assessment is subjective and inconsistent: one barista might think today's espresso is perfect while another finds it under-extracted. Regular cupping calibrates the team's palate so that quality judgements are shared and reliable. It also provides structured feedback to the roaster, enabling collaborative quality improvement. Competitive benchmarking through cupping \u2014 tasting the cafe's coffee alongside what competitors serve \u2014 provides an objective view of market positioning. SCA protocols give the team a shared framework for describing flavour, making quality conversations precise rather than vague.",
  "application_logic": {
    "L1": "IMMEDIATE (0\u20132 weeks). Week 1: Set up a basic cupping station: cupping bowls (or wide cups), a kettle, a scale, a grinder, cupping spoons, and a tasting form. Download the SCA cupping form or use T198-01. Source 3 different coffees for the first session: the cafe's current house coffee, one alternative from the same roaster, and one competitor's coffee. Week 2: Conduct the first cupping session (45\u201360 minutes) with all available baristas. Follow basic SCA protocol: 8.25g of coarsely ground coffee per 150ml of water at 93\u00b0C, steep for 4 minutes, break the crust, skim, and begin tasting at approximately 70\u00b0C. Score each coffee on fragrance/aroma, flavour, aftertaste, acidity, body, balance, and overall. Discuss results as a group and note key observations.",
    "L2": "SYSTEM BUILD (2\u20138 weeks). Establish a regular cupping schedule: weekly is ideal for specialty cafes, fortnightly as a minimum. Create a cupping log that tracks scores over time for each coffee. Begin systematic competitor benchmarking: each month, source coffees from 2\u20133 local competitors and cup them blind alongside the cafe's offering. Use cupping feedback to provide structured reports to the roaster on roast consistency and quality. Introduce triangulation exercises to build sensory acuity: present three cups, two identical and one different, and ask the team to identify the odd one out. Train the team on the SCA Flavour Wheel and practice using consistent descriptors.",
    "L3": "CULTURE & EXCELLENCE (8+ weeks). Conduct quarterly deep-dive cupping sessions evaluating potential new coffees for the menu. Host public cupping events for customers, building community and education. Use cupping data to inform seasonal menu rotations. Pursue SCA Sensory Skills certification for key team members. Build relationships with green coffee importers through cupping events. Create a cupping database that allows historical comparison and trend analysis."
  },
  "execution_framework": {
    "L1_setup": {"title": "Immediate Actions", "actions": ["Set up a basic cupping station with required equipment", "Source 3 different coffees for the first cupping session", "Conduct the first team cupping session following SCA protocol", "Create or print cupping score sheets", "Discuss results as a team and agree on key observations", "Identify the current coffee's strengths and areas for improvement", "Schedule the next cupping session"], "responsible": "Head Barista"},
    "L2_build": {"title": "System Development", "actions": ["Establish a regular cupping schedule (weekly or fortnightly)", "Create a cupping log to track scores over time", "Begin monthly competitor benchmarking with blind tasting", "Provide structured cupping feedback to the roaster", "Introduce triangulation exercises for sensory calibration", "Train the team on SCA Flavour Wheel terminology", "Build a reference library of cupped coffees"], "responsible": "Head Barista, Manager"},
    "L3_embed": {"title": "Culture Embedding", "actions": ["Conduct quarterly deep-dive cupping for menu development", "Host public cupping events for customers", "Use cupping data to inform seasonal menu rotations", "Support SCA Sensory Skills certification for key team members", "Build relationships with green coffee importers", "Create a long-term cupping database for trend analysis"], "responsible": "Head Barista, Owner"}
  },
  "deliverables": ["Cupping Station Setup Guide", "Cupping Score Sheet (SCA-aligned)", "Monthly Cupping Log template", "Competitor Benchmarking Report template", "Roaster Feedback Report template"],
  "embedded_tools": [],
  "tool_definitions": {"tools": [
    {"tool_id": "T198-01", "tool_name": "Cafe Cupping Score Sheet", "level": "L1", "format": "checklist", "owner_role": "Head Barista", "description": "SCA-aligned cupping score sheet with fields for fragrance/aroma, flavour, aftertaste, acidity, body, balance, uniformity, clean cup, sweetness, and overall score. Includes space for flavour descriptors and notes."},
    {"tool_id": "T198-02", "tool_name": "Cupping Session Log", "level": "L2", "format": "tracker", "owner_role": "Head Barista", "description": "Ongoing log recording cupping session dates, coffees evaluated, scores, key observations, and actions taken (roaster feedback, recipe adjustments, menu changes)."},
    {"tool_id": "T198-03", "tool_name": "Competitor Benchmarking Template", "level": "L2", "format": "template", "owner_role": "Head Barista", "description": "Template for blind competitor benchmarking sessions: coffees sampled, blind scores, reveal results, comparative analysis, and positioning observations."},
    {"tool_id": "T198-04", "tool_name": "Roaster Quality Feedback Report", "level": "L2", "format": "template", "owner_role": "Head Barista", "description": "Structured feedback report for the roaster covering cupping scores, consistency observations, flavour profile changes, and suggestions for roast adjustments."},
    {"tool_id": "T198-05", "tool_name": "Public Cupping Event Planning Template", "level": "L3", "format": "template", "owner_role": "Manager", "description": "Planning template for customer-facing cupping events: event format, coffees to feature, facilitator guide, marketing materials, and customer feedback collection."}
  ]},
  "failure_modes": ["Cupping sessions are scheduled but cancelled when the cafe gets busy", "Scores are recorded but never analysed or acted upon, making the exercise academic", "Only the head barista participates, failing to calibrate the broader team", "Cupping becomes competitive rather than collaborative, discouraging less experienced staff"],
  "kpis": ["Cupping sessions conducted at least fortnightly with minimum 3 team members", "Score variance between team members reduces over time (within 2 points on SCA scale)", "At least one competitor benchmarking session conducted per month", "Cupping feedback provided to the roaster at least monthly"],
  "dependencies": ["B039", "B040"],
  "constraints": ["Cupping requires dedicated time away from the bar (45\u201360 minutes per session)", "Equipment costs are modest but must be budgeted (bowls, spoons, scale)", "SCA cupping protocol requires specific water temperature and coffee-to-water ratios"],
  "time_load": {"L1": "2 hours (setup, first session)", "L2": "1 hour/session fortnightly (ongoing cupping programme)", "L3": "2 hours/quarter (deep-dive sessions, events, database management)"},
  "review_protocol": "After every cupping session: review scores and agree actions. Monthly: review cupping log trends and competitor benchmarks. Quarterly: deep-dive cupping for menu development. Annually: review cupping programme effectiveness and calibration.",
  "meta": {"summary_for_humans": "This block establishes a regular cupping programme for quality evaluation, team palate calibration, competitor benchmarking, and informed coffee purchasing decisions.", "implementation_risks": ["Without rota protection, cupping will be consistently deprioritised during busy periods", "New or less experienced staff may feel intimidated by cupping \u2014 create a supportive environment", "Cupping without action (recipe changes, roaster feedback) is wasted effort"], "notes_for_engine": "Activate alongside B039/B040 (coffee quality blocks) and B197 (coffee education). Most relevant for specialty and independent cafes but valuable for all. Flag if signals indicate inconsistent coffee quality.", "tags": ["cupping", "quality", "sensory", "benchmarking", "SCA", "coffee_quality", "tasting", "calibration"]},
  "applicability": {"venue_types": ["independent_cafe", "specialty_coffee", "chain_cafe", "franchise_cafe", "bakery_cafe"], "team_size_min": 2, "team_size_max": 99},
  "enrichment_status": {"level": "gold", "enriched_at": "2026-03-04T12:00:00Z", "enriched_by": "claude_direct_v2", "source_quality": "ai_generated"}
})

wb({
  "block_id": "B199",
  "name": "Cold Drink Programme",
  "version": "v1.0",
  "domain": "D03_product_quality",
  "module": "M03: Beverage Programme & Quality Standards",
  "state": "enriched",
  "purpose": "Develops a comprehensive cold drink programme covering cold brew, iced coffee, iced lattes, and cold specialty beverages that maximises a growing revenue category, reduces hot drink dependency during warmer months, and positions the cafe to compete effectively in the rapidly expanding cold coffee market.",
  "purpose_extended": {
    "detailed_objectives": [
      "Design a cold drink menu that complements the hot beverage offering and appeals to evolving customer preferences",
      "Establish cold brew production protocols covering immersion and drip methods with consistent quality standards",
      "Develop iced coffee and iced latte recipes that maintain flavour integrity when served over ice",
      "Create seasonal cold drink specials that drive interest and footfall during summer months",
      "Set up the operational infrastructure for cold drink production: equipment, batch scheduling, and shelf life management"
    ],
    "secondary_objectives": [
      "Capture the growing cold coffee market (up 30% year-on-year in UK specialty cafes)",
      "Increase average transaction value through premium cold drink pricing",
      "Reduce revenue seasonality by offering compelling summer alternatives",
      "Differentiate from competitors with unique cold drink creations"
    ]
  },
  "why_this_matters": "The UK cold coffee market has grown by over 30% year-on-year, driven by younger consumers who see iced and cold brew coffees as everyday drinks rather than seasonal novelties. Mintel reports that 16\u201334 year olds are twice as likely to order a cold coffee as a hot one. Major chains have invested heavily in cold platforms, and independent cafes risk losing relevance if they cannot offer a compelling cold drink programme. Cold brew in particular offers attractive economics: it is batch-produced, has a shelf life of up to 14 days when refrigerated, uses coffee that is often cheaper per cup than espresso-based drinks, and commands a premium price. A 500ml cold brew that costs 30p in coffee and packaging can retail for \u00a33.50\u2013\u00a34.50. The operational challenge is different from hot drinks: cold brew requires advance preparation (12\u201324 hours steeping), dedicated fridge space, and careful shelf life management. Iced espresso-based drinks require understanding of how dilution affects flavour and how to extract espresso differently for cold service.",
  "application_logic": {
    "L1": "IMMEDIATE (0\u20132 weeks). Week 1: Define the core cold drink menu: cold brew (black), cold brew with milk, iced americano, iced latte, and one signature cold special. Establish a cold brew production recipe: start with a 1:8 coffee-to-water ratio (by weight) using a coarse grind, steeped for 18\u201324 hours at room temperature or in the fridge. Produce the first batch and taste-test with the team. Week 2: Set up the iced espresso programme: for iced lattes, pull a slightly shorter, stronger shot (18g in, 30g out in 25\u201328 seconds) to account for ice dilution. Test and finalise recipes for all core cold drinks. Price cold drinks appropriately \u2014 typically 20\u201340p higher than hot equivalents to reflect ice and additional preparation costs. Update the menu board.",
    "L2": "SYSTEM BUILD (2\u20138 weeks). Establish a cold brew production schedule: determine daily demand, batch size, and production frequency to ensure fresh stock without waste. Label all cold brew batches with production date and expiry (maximum 7 days for retail, 14 days if sealed and refrigerated). Source appropriate packaging: cold cups, clear cups for visual appeal, straws (paper or reusable), and lids. Develop 2\u20133 signature cold specials: consider flavoured cold brews (vanilla, chocolate), tonic espresso, or fruit-infused iced drinks. Train all staff on cold drink preparation standards and presentation. Begin tracking cold drink sales as a percentage of total beverage revenue.",
    "L3": "CULTURE & EXCELLENCE (8+ weeks). Introduce nitrogen-infused cold brew (nitro) if volume justifies the equipment investment. Develop seasonal cold drink specials that rotate quarterly. Create cold drink subscription or batch-sale options for offices and regular customers. Explore bottled cold brew as a retail product. Benchmark cold drink sales against industry trends and competitors. Use cold brew production as an educational opportunity \u2014 customers love watching the process."
  },
  "execution_framework": {
    "L1_setup": {"title": "Immediate Actions", "actions": ["Define the core cold drink menu (5 drinks minimum)", "Establish a cold brew production recipe and produce the first batch", "Taste-test cold brew with the team and refine the recipe", "Develop iced espresso recipes adjusted for ice dilution", "Price cold drinks appropriately (20\u201340p above hot equivalents)", "Update the menu board to feature cold drinks prominently", "Brief all staff on cold drink preparation standards"], "responsible": "Head Barista, Manager"},
    "L2_build": {"title": "System Development", "actions": ["Establish a cold brew production schedule with batch labelling", "Source appropriate cold drink packaging (clear cups, straws, lids)", "Develop 2\u20133 signature cold specials", "Train all staff on cold drink preparation and presentation", "Begin tracking cold drink sales as percentage of total revenue", "Create a cold drink preparation SOP", "Set up dedicated fridge space for cold brew storage"], "responsible": "Head Barista, Manager"},
    "L3_embed": {"title": "Culture Embedding", "actions": ["Evaluate nitro cold brew as a premium offering", "Develop seasonal cold drink specials that rotate quarterly", "Explore cold brew subscription or batch-sale options", "Consider bottled cold brew as a retail product", "Benchmark cold drink sales against industry trends", "Use cold brew production as a customer engagement tool"], "responsible": "Owner, Head Barista"}
  },
  "deliverables": ["Cold Drink Menu and Recipe Cards", "Cold Brew Production SOP", "Cold Drink Preparation Standards document", "Cold Brew Batch Labelling and Shelf Life Protocol", "Seasonal Cold Drink Specials Plan"],
  "embedded_tools": [],
  "tool_definitions": {"tools": [
    {"tool_id": "T199-01", "tool_name": "Cold Brew Production SOP", "level": "L1", "format": "SOP", "owner_role": "Head Barista", "description": "Standard Operating Procedure for cold brew production covering recipe, equipment, steeping time, filtration, storage, labelling, and shelf life management."},
    {"tool_id": "T199-02", "tool_name": "Cold Drink Recipe Cards", "level": "L1", "format": "reference", "owner_role": "All Staff", "description": "Laminated recipe cards for every cold drink on the menu, with exact measurements, preparation steps, and presentation standards."},
    {"tool_id": "T199-03", "tool_name": "Cold Brew Batch Log", "level": "L2", "format": "tracker", "owner_role": "Head Barista", "description": "Production log tracking each cold brew batch: production date, coffee used, batch size, expiry date, and waste (unused batches disposed of)."},
    {"tool_id": "T199-04", "tool_name": "Seasonal Cold Drink Development Template", "level": "L2", "format": "template", "owner_role": "Head Barista", "description": "Template for developing seasonal cold drink specials: concept, recipe testing notes, costing, target margin, and launch plan."},
    {"tool_id": "T199-05", "tool_name": "Cold Drink Sales Tracker", "level": "L2", "format": "tracker", "owner_role": "Manager", "description": "Monthly tracker showing cold drink sales by product, cold drinks as percentage of total beverage revenue, and seasonal trends."}
  ]},
  "failure_modes": ["Cold brew is produced in too-large batches and wasted, or too-small batches and unavailable during peak demand", "Iced espresso drinks taste weak because recipes are not adjusted for ice dilution", "Cold drinks are not promoted effectively and customers do not know they are available", "Shelf life management is poor, risking food safety issues with ageing cold brew"],
  "kpis": ["Cold drinks reach 20% of total beverage revenue during summer months", "Cold brew waste below 10% of production volume", "All cold drinks meet quality standards (taste-tested weekly)", "At least 2 seasonal cold specials launched per year"],
  "dependencies": ["B054"],
  "constraints": ["Cold brew production requires dedicated fridge space and advance planning", "Ice machine capacity must be sufficient for peak cold drink demand", "Shelf life labelling and management are essential food safety requirements"],
  "time_load": {"L1": "3 hours (recipe development, first batch, menu update)", "L2": "4 hours (SOP creation, staff training, production scheduling)", "L3": "2 hours/quarter (seasonal specials development, programme review)"},
  "review_protocol": "Weekly quality check of cold brew stock. Monthly review of cold drink sales and waste. Quarterly seasonal special development and menu review. Annual cold drink programme review.",
  "meta": {"summary_for_humans": "This block develops a comprehensive cold drink programme covering cold brew, iced coffee, iced lattes, and seasonal specials to capture the rapidly growing cold coffee market.", "implementation_risks": ["Cold brew requires advance production planning that is different from the immediate-preparation model of hot drinks", "Ice machine reliability becomes critical when cold drinks are a significant revenue category", "Cold drinks can cannibalise hot drink sales rather than growing total revenue if not positioned correctly"], "notes_for_engine": "Activate alongside B054 (beverage menu). Relevant to all venue types. Flag if signals indicate seasonal revenue dips or customer requests for cold options.", "tags": ["cold_brew", "iced_coffee", "cold_drinks", "beverage", "seasonal", "menu_development", "summer", "product"]},
  "applicability": {"venue_types": ALL_8, "team_size_min": 1, "team_size_max": 99},
  "enrichment_status": {"level": "gold", "enriched_at": "2026-03-04T12:00:00Z", "enriched_by": "claude_direct_v2", "source_quality": "ai_generated"}
})

wb({
  "block_id": "B200",
  "name": "Batch Brew & Filter Programme",
  "version": "v1.0",
  "domain": "D03_product_quality",
  "module": "M03: Beverage Programme & Quality Standards",
  "state": "enriched",
  "purpose": "Establishes a batch brew and filter coffee programme that offers customers a high-quality, quick-service alternative to espresso-based drinks, showcases single-origin coffees, increases speed of service during peak periods, and diversifies the beverage menu beyond the espresso machine.",
  "purpose_extended": {
    "detailed_objectives": [
      "Select and set up appropriate batch or filter brewing equipment (batch brewer, pour-over, Aeropress, or Chemex)",
      "Develop recipes and protocols for consistent batch brew production",
      "Use the filter programme to showcase rotating single-origin coffees",
      "Integrate batch brew into the speed-of-service strategy for peak periods",
      "Train staff on filter brewing techniques and the flavour differences from espresso"
    ],
    "secondary_objectives": [
      "Offer a lower price point option that still delivers specialty quality",
      "Reduce pressure on the espresso machine during peak trading",
      "Create a talking point that educates customers about coffee diversity",
      "Provide a platform for introducing seasonal and limited-edition coffees"
    ]
  },
  "why_this_matters": "Filter coffee is experiencing a renaissance in UK specialty cafes. Once dismissed as the cheap option, batch brew and pour-over are now recognised as the best way to showcase the nuanced flavours of single-origin specialty coffees. A well-made filter coffee reveals flavour complexity that espresso, with its intensity and milk, can mask. For operators, batch brew offers compelling benefits: it is fast to serve (pour and go), it can be pre-brewed in large volumes, it reduces queue times during peak periods, and it uses less coffee per cup than espresso while delivering perceived high value. A batch brew programme also positions the cafe as knowledgeable and adventurous, appealing to the growing segment of customers who seek diversity beyond the standard flat white. The challenge is quality: batch brew that sits on a hot plate for hours becomes stale and bitter. Modern batch brewers with vacuum flasks solve this, but protocols for freshness and rotation are essential.",
  "application_logic": {
    "L1": "IMMEDIATE (0\u20132 weeks). Week 1: Select the batch brew method. For volume service, a commercial batch brewer (Moccamaster, Fetco, Curtis) is ideal. For a more artisanal approach, pour-over (V60, Kalita Wave) or Aeropress can work at lower volumes. Develop a batch brew recipe: start with a 1:16 coffee-to-water ratio (e.g., 60g coffee per litre), medium grind, water at 93\u201396 degrees C, and adjust to taste. Brew the first batch and taste-test with the team. Week 2: Add batch brew to the menu board. Price it competitively \u2014 typically \u00a32.00\u2013\u00a33.00 for a standard cup, below espresso drinks but above mass-market filter. Decide on rotation: will you serve one batch brew all day, or rotate between a morning and afternoon coffee? Train staff on how to talk about filter coffee to customers: emphasise flavour notes, origin story, and the different experience from espresso.",
    "L2": "SYSTEM BUILD (2\u20138 weeks). Develop a batch brew production SOP covering: brew recipe, grind setting, batch size, maximum hold time (2 hours in a thermal flask, 30 minutes on a hot plate), waste protocol (discard and rebrew if exceeds hold time), and cleaning schedule. Source 2\u20133 rotating single-origin coffees for the filter programme. Create origin cards or chalkboard descriptions for each coffee, telling the story of where it comes from and what flavours to expect. Introduce a filter coffee flight option: 3 small cups of different coffees for customers who want to explore. Track filter coffee sales and waste to optimise batch size and frequency.",
    "L3": "CULTURE & EXCELLENCE (8+ weeks). Rotate the filter coffee offering weekly or fortnightly to maintain interest. Partner with the roaster for exclusive or limited-edition single-origin offerings. Host filter coffee tasting sessions for customers. Consider adding manual brew options (V60, Chemex) as a premium, made-to-order service for quieter periods. Use filter coffee as a training tool for staff to develop palate and brewing skills. Track customer feedback on different origins to inform purchasing."
  },
  "execution_framework": {
    "L1_setup": {"title": "Immediate Actions", "actions": ["Select batch brew equipment appropriate for the cafe's volume", "Develop a batch brew recipe starting with 1:16 ratio", "Brew the first batch and taste-test with the team", "Add batch brew to the menu board with appropriate pricing", "Decide on single-coffee or rotating-coffee format", "Train staff on how to describe and sell filter coffee", "Set a maximum hold time for brewed coffee"], "responsible": "Head Barista, Manager"},
    "L2_build": {"title": "System Development", "actions": ["Develop a batch brew production SOP with quality standards", "Source 2\u20133 rotating single-origin coffees for the programme", "Create origin cards or chalkboard descriptions for each coffee", "Introduce a filter coffee flight option for exploratory customers", "Track filter coffee sales and waste to optimise production", "Establish a cleaning and maintenance schedule for brew equipment", "Set up a rotation calendar for coffee offerings"], "responsible": "Head Barista, Manager"},
    "L3_embed": {"title": "Culture Embedding", "actions": ["Rotate filter coffee offerings weekly or fortnightly", "Partner with the roaster for exclusive single-origin releases", "Host filter coffee tasting sessions for customers", "Consider adding manual brew options as premium service", "Use filter brewing as a staff development training tool", "Track customer preferences to inform origin purchasing"], "responsible": "Head Barista, Owner"}
  },
  "deliverables": ["Batch Brew Recipe Cards", "Batch Brew Production SOP", "Origin Description Templates (cards or chalkboard)", "Filter Coffee Rotation Calendar", "Batch Brew Sales and Waste Tracker"],
  "embedded_tools": [],
  "tool_definitions": {"tools": [
    {"tool_id": "T200-01", "tool_name": "Batch Brew Production SOP", "level": "L1", "format": "SOP", "owner_role": "Head Barista", "description": "Standard Operating Procedure covering recipe, grind, batch size, water temperature, maximum hold time, waste protocol, and equipment cleaning for batch brew production."},
    {"tool_id": "T200-02", "tool_name": "Batch Brew Recipe Card", "level": "L1", "format": "reference", "owner_role": "All Staff", "description": "Laminated recipe card for the batch brew station with exact coffee dose, water volume, grind setting, brew time, and maximum hold time. Updated when the coffee offering rotates."},
    {"tool_id": "T200-03", "tool_name": "Coffee Origin Description Template", "level": "L1", "format": "template", "owner_role": "Head Barista", "description": "Template for creating customer-facing origin descriptions: country, region, producer, process, altitude, flavour notes, and suggested pairings."},
    {"tool_id": "T200-04", "tool_name": "Filter Coffee Rotation Calendar", "level": "L2", "format": "tracker", "owner_role": "Head Barista", "description": "Calendar planning the rotation of filter coffee offerings, tracking which coffees have been featured, customer feedback, and sales performance by origin."},
    {"tool_id": "T200-05", "tool_name": "Batch Brew Sales and Waste Log", "level": "L2", "format": "tracker", "owner_role": "Manager", "description": "Daily log tracking batch brew production volume, cups sold, waste disposed, and cost per cup to optimise batch size and production frequency."}
  ]},
  "failure_modes": ["Batch brew sits too long and becomes stale, creating a negative impression of filter coffee quality", "Staff cannot explain filter coffee to customers, leading to low uptake and confusion", "Batch sizes are wrong \u2014 too large creates waste, too small means frequent stockouts", "Filter coffee is positioned as the cheap option rather than a quality alternative, undermining its value"],
  "kpis": ["Batch brew represents at least 10% of total coffee sales within 6 months", "Batch brew waste below 15% of production volume", "Maximum hold time never exceeded (100% compliance)", "Customer awareness of filter offering above 70% (measured by staff observation or survey)"],
  "dependencies": ["B054"],
  "constraints": ["Batch brew equipment requires capital investment (commercial brewer: \u00a3300\u2013\u00a31,500)", "Rotating single-origin coffees require flexible ordering and possibly multiple grinders", "Hold time limits mean batch brew must be treated as a perishable product throughout the day"],
  "time_load": {"L1": "2 hours (equipment setup, recipe development, menu update)", "L2": "4 hours (SOP, origin descriptions, rotation planning, staff training)", "L3": "1 hour/month (rotation management, customer feedback, programme review)"},
  "review_protocol": "Daily hold time compliance check. Weekly sales and waste review. Monthly rotation review and origin selection. Quarterly programme review including customer feedback.",
  "meta": {"summary_for_humans": "This block establishes a batch brew and filter coffee programme that offers a high-quality, quick-service alternative to espresso, showcases single-origin coffees, and diversifies the beverage menu.", "implementation_risks": ["Filter coffee requires a cultural shift if customers associate it with low quality", "Equipment investment is needed for commercial-grade batch brewing", "Rotating origins require flexible supply chain management"], "notes_for_engine": "Activate alongside B054 (beverage menu). Enhances B197 (coffee education) by providing a practical showcase. Flag if signals indicate speed of service issues or customer demand for alternatives to espresso.", "tags": ["batch_brew", "filter", "pour_over", "single_origin", "beverage", "speed_of_service", "coffee_quality", "menu"]},
  "applicability": {"venue_types": ALL_8, "team_size_min": 1, "team_size_max": 99},
  "enrichment_status": {"level": "gold", "enriched_at": "2026-03-04T12:00:00Z", "enriched_by": "claude_direct_v2", "source_quality": "ai_generated"}
})

wb({
  "block_id": "B201",
  "name": "Seasonal Specials Playbook",
  "version": "v1.0",
  "domain": "D03_product_quality",
  "module": "M03: Beverage Programme & Quality Standards",
  "state": "enriched",
  "purpose": "Creates a structured approach to seasonal specials \u2014 limited-time drinks and food items that create excitement, drive footfall, increase average transaction value, and keep the menu feeling fresh and relevant throughout the year. This block moves seasonal offerings from improvised ideas to a planned, costed, and marketed programme.",
  "purpose_extended": {
    "detailed_objectives": [
      "Develop a seasonal calendar with 4\u20136 special launches per year aligned with seasons, holidays, and local events",
      "Create a standard process for developing, testing, costing, and launching seasonal specials",
      "Establish pricing strategies that position specials as premium, limited-time offerings",
      "Build a marketing and promotion framework that maximises awareness and urgency",
      "Track performance of each special to inform future development"
    ],
    "secondary_objectives": [
      "Keep regular customers engaged with new experiences throughout the year",
      "Attract new customers through social media buzz around unique seasonal offerings",
      "Test new flavour combinations and products with lower risk before permanent menu additions",
      "Create opportunities for staff creativity and involvement in menu development"
    ]
  },
  "why_this_matters": "Seasonal specials are one of the most effective marketing tools available to cafes. They create urgency (available for a limited time only), generate social media content (customers love photographing and sharing unique drinks), drive incremental visits (regular customers come specifically to try the new offering), and command premium pricing (customers accept paying more for something special). The pumpkin spice phenomenon, love it or loathe it, demonstrated that seasonal specials can become cultural events. For independent cafes, the advantage is creativity \u2014 where chains must develop specials that work across hundreds of locations, an independent can tailor offerings to local tastes, source unique ingredients, and tell authentic stories. However, without a structured approach, seasonal specials are often thrown together last minute, poorly costed, inconsistently prepared, and inadequately marketed. This block turns seasonal specials from an afterthought into a strategic programme.",
  "application_logic": {
    "L1": "IMMEDIATE (0\u20132 weeks). Week 1: Create a seasonal calendar for the year ahead, identifying 4\u20136 natural launch windows: early spring (lighter, floral flavours), summer (cold drinks, fruit-based specials), autumn (warm spices, caramel, apple), winter/Christmas (chocolate, gingerbread, mulled flavours), plus any local events or holidays. For each window, brainstorm 3\u20135 potential specials including both drinks and food items. Week 2: Select the next seasonal special to develop. Follow the development process: (1) concept and ingredient list, (2) recipe testing with the team, (3) costing and margin analysis (target 70%+ gross margin), (4) pricing decision, (5) preparation method and training, (6) marketing plan, (7) launch date.",
    "L2": "SYSTEM BUILD (2\u20138 weeks). Create a Seasonal Special Development Template (T201-01) that standardises the process from concept to launch. Build a marketing toolkit for seasonal specials: social media post templates, in-store signage, menu board integration, and countdown messaging. Establish a standard launch protocol: team training session one week before launch, social media teaser campaign starting 5 days before, launch day promotion (free tasters, social media competition), and mid-run assessment (adjust recipe, pricing, or marketing if needed). Create a post-special review template to capture performance data and learnings.",
    "L3": "CULTURE & EXCELLENCE (8+ weeks). Involve the team in seasonal special ideation \u2014 run quarterly brainstorming sessions and trial the best ideas. Create a seasonal special archive documenting every past special with recipes, sales data, and customer feedback. Build partnerships with local producers for unique seasonal ingredients (local honey, seasonal fruit, artisan chocolate). Develop a following for the seasonal programme \u2014 regular customers should anticipate and look forward to each new launch. Consider collaborating with other local businesses for co-branded seasonal specials."
  },
  "execution_framework": {
    "L1_setup": {"title": "Immediate Actions", "actions": ["Create a seasonal calendar with 4\u20136 launch windows per year", "Brainstorm 3\u20135 potential specials for each seasonal window", "Select the next special to develop and begin recipe testing", "Cost the special and confirm margin meets the 70% target", "Set the retail price and add to the menu board", "Create a preparation method card for all staff", "Plan the launch marketing (social media, signage)"], "responsible": "Head Barista, Manager"},
    "L2_build": {"title": "System Development", "actions": ["Create a standardised Seasonal Special Development Template", "Build a marketing toolkit with templates for social media and signage", "Establish a standard launch protocol with training and teaser campaign", "Create a post-special review template for performance analysis", "Track seasonal special sales as a percentage of total revenue", "Begin building a seasonal special archive", "Establish a timeline for development (minimum 4 weeks before launch)"], "responsible": "Manager, Head Barista, Marketing Lead"},
    "L3_embed": {"title": "Culture Embedding", "actions": ["Involve the full team in seasonal special brainstorming", "Build a comprehensive seasonal special archive with recipes and sales data", "Develop partnerships with local producers for unique ingredients", "Create anticipation and a following for the seasonal programme", "Collaborate with local businesses for co-branded specials", "Review and improve the seasonal programme annually"], "responsible": "Owner, Head Barista"}
  },
  "deliverables": ["Seasonal Calendar with launch windows", "Seasonal Special Development Template", "Marketing Toolkit for seasonal launches", "Launch Protocol document", "Post-Special Performance Review template"],
  "embedded_tools": [],
  "tool_definitions": {"tools": [
    {"tool_id": "T201-01", "tool_name": "Seasonal Special Development Template", "level": "L1", "format": "template", "owner_role": "Head Barista", "description": "Step-by-step template for developing a seasonal special from concept to launch: idea, recipe, costing, pricing, preparation method, marketing plan, launch date, and success criteria."},
    {"tool_id": "T201-02", "tool_name": "Seasonal Calendar Planner", "level": "L1", "format": "tracker", "owner_role": "Manager", "description": "Annual calendar showing all seasonal special launch windows, development timelines, and marketing campaign dates with responsible persons assigned."},
    {"tool_id": "T201-03", "tool_name": "Seasonal Special Costing Sheet", "level": "L2", "format": "template", "owner_role": "Manager", "description": "Detailed costing template for each seasonal special: ingredient costs, preparation labour, packaging, waste allowance, target margin, and recommended retail price."},
    {"tool_id": "T201-04", "tool_name": "Seasonal Launch Marketing Pack", "level": "L2", "format": "template", "owner_role": "Marketing Lead", "description": "Marketing toolkit with social media post templates, in-store signage templates, teaser campaign timeline, and launch day promotion ideas."},
    {"tool_id": "T201-05", "tool_name": "Post-Special Performance Review", "level": "L2", "format": "template", "owner_role": "Manager", "description": "Template for reviewing each seasonal special after completion: total units sold, revenue, margin achieved, customer feedback, social media engagement, and recommendations for future runs."}
  ]},
  "failure_modes": ["Seasonal specials are developed too late and launched without adequate marketing lead time", "Specials are over-complicated, requiring exotic ingredients that cannot be reliably sourced or adding excessive preparation time", "Pricing does not reflect the premium nature of the offering, resulting in poor margins", "The same specials are repeated year after year without innovation, losing their sense of excitement"],
  "kpis": ["At least 4 seasonal specials launched per year", "Each special achieves a gross margin of 70% or above", "Seasonal specials account for at least 10% of beverage revenue during their run", "Social media engagement increases by at least 20% during seasonal special launches"],
  "dependencies": ["B051"],
  "constraints": ["Seasonal ingredients must be available from reliable suppliers during the launch window", "Staff must be trained on new preparation methods before each launch", "Marketing materials must be prepared at least one week before launch"],
  "time_load": {"L1": "3 hours (calendar creation, first special development)", "L2": "4 hours per special (development, costing, marketing, training)", "L3": "2 hours/quarter (programme review, brainstorming, archive maintenance)"},
  "review_protocol": "Post-launch review within one week of each special launch. End-of-run performance review for every special. Quarterly seasonal programme review. Annual calendar planning for the year ahead.",
  "meta": {"summary_for_humans": "This block creates a structured seasonal specials programme with a development process, costing framework, marketing toolkit, and performance review cycle for 4\u20136 limited-time offerings per year.", "implementation_risks": ["Without a minimum 4-week development lead time, specials will feel rushed and poorly executed", "Over-reliance on seasonal specials can distract from core menu quality", "Specials that are too complex create operational stress during busy periods"], "notes_for_engine": "Activate alongside B051 (menu development). Enhances B199 (cold drinks) and B200 (batch brew) for seasonal variations. Flag if signals indicate menu staleness or declining regular customer frequency.", "tags": ["seasonal", "specials", "limited_time", "menu_development", "marketing", "innovation", "product", "creativity"]},
  "applicability": {"venue_types": ALL_8, "team_size_min": 1, "team_size_max": 99},
  "enrichment_status": {"level": "gold", "enriched_at": "2026-03-04T12:00:00Z", "enriched_by": "claude_direct_v2", "source_quality": "ai_generated"}
})

wb({
  "block_id": "B202",
  "name": "Bakery Partnership Assessment",
  "version": "v1.0",
  "domain": "D06_supply_chain",
  "module": "M06: Supply Chain & Supplier Management",
  "state": "enriched",
  "purpose": "Provides a structured framework for evaluating, selecting, and managing bakery partnerships that deliver consistent quality, reliable supply, competitive pricing, and brand alignment. This block ensures the cafe's food offering complements its coffee programme rather than undermining it with inconsistent or poor-quality baked goods.",
  "purpose_extended": {
    "detailed_objectives": [
      "Define the cafe's bakery requirements: product range, quality standards, delivery frequency, volume, and exclusivity expectations",
      "Create an evaluation scorecard for assessing potential bakery partners across quality, reliability, price, and alignment",
      "Establish a structured trial and onboarding process for new bakery partners",
      "Define service level expectations covering delivery windows, order lead times, minimum orders, and quality consistency",
      "Build a performance review process that maintains standards and addresses issues early"
    ],
    "secondary_objectives": [
      "Diversify bakery supply to reduce dependency on a single supplier",
      "Identify local artisan bakeries that enhance the cafe's brand positioning",
      "Negotiate pricing and terms that support the cafe's margin targets",
      "Explore co-branded or exclusive product development opportunities"
    ]
  },
  "why_this_matters": "For most cafes, baked goods are the highest-margin food category and the primary driver of food-with-coffee purchases. A customer who adds a croissant to their flat white increases the average transaction value by 40\u201360%. However, bakery quality is one of the most common complaints in UK cafe reviews: stale pastries, soggy sandwiches, and limited variety. The quality of baked goods directly impacts the cafe's overall reputation \u2014 a customer who receives a mediocre croissant will question the quality of everything else, including the coffee. Choosing the right bakery partner is therefore a strategic decision, not a transactional one. The assessment must consider quality (taste, appearance, freshness), reliability (consistent delivery, correct orders), pricing (cost per unit supporting target margins), range (variety that complements the coffee menu), and alignment (does the bakery's brand and values match the cafe's positioning?). For cafes in areas with strong local bakery options, a partnership with an artisan baker can become a genuine differentiator and a compelling part of the brand story.",
  "application_logic": {
    "L1": "IMMEDIATE (0\u20132 weeks). Week 1: Define the cafe's bakery requirements. List the products needed (croissants, pain au chocolat, muffins, cookies, sourdough, sandwiches, cakes), daily volumes, delivery windows, quality expectations, and budget per unit. Identify potential bakery partners: research local artisan bakeries, wholesale bakery suppliers, and existing connections. Week 2: Create an evaluation scorecard using T202-01 covering: product quality (taste, appearance, freshness on arrival), reliability (delivery track record, order accuracy), pricing (cost per unit, minimum order requirements), range (variety, ability to develop new products), and alignment (brand values, sustainability practices, local credentials). Contact 3\u20135 potential partners and request samples.",
    "L2": "SYSTEM BUILD (2\u20138 weeks). Conduct formal tastings of samples from shortlisted bakeries, scoring each against the evaluation criteria. Involve the team in tasting \u2014 baristas interact with customers and know what sells. Select a primary bakery partner and negotiate terms: pricing, delivery schedule, payment terms, minimum orders, and return policy for defective products. Establish a 4-week trial period with daily quality checks and delivery monitoring. Create a backup supplier relationship for continuity in case the primary partner cannot deliver. Develop a monthly performance review process tracking quality, reliability, and cost.",
    "L3": "CULTURE & EXCELLENCE (8+ weeks). Explore exclusive product development with the bakery partner: signature items that are only available at the cafe, seasonal specials co-developed to match the drink menu, and branded packaging. Build the bakery partnership into the cafe's story: display the bakery's name, share their process with customers, and co-promote on social media. Conduct quarterly deep-dive quality reviews including customer feedback analysis. Review and renegotiate terms annually. Maintain relationships with 2\u20133 alternative bakeries to ensure competitive tension and supply security."
  },
  "execution_framework": {
    "L1_setup": {"title": "Immediate Actions", "actions": ["Define bakery product requirements: range, volumes, quality, and budget", "Research and identify 3\u20135 potential bakery partners", "Create a bakery partner evaluation scorecard", "Request samples from shortlisted bakeries", "Conduct team tastings and score each potential partner", "Select the top 2 candidates for formal negotiation", "Begin discussions on pricing, delivery, and terms"], "responsible": "Owner, Manager"},
    "L2_build": {"title": "System Development", "actions": ["Negotiate terms with the selected primary bakery partner", "Establish a 4-week trial period with daily quality monitoring", "Create a delivery and quality check SOP for bakery arrivals", "Identify and engage a backup bakery supplier", "Develop a monthly performance review process", "Set up a cost tracking system for bakery purchases", "Formalise the supply agreement after successful trial"], "responsible": "Manager, Owner"},
    "L3_embed": {"title": "Culture Embedding", "actions": ["Explore exclusive product development with the bakery partner", "Build the bakery partnership into the cafe's brand story", "Conduct quarterly quality reviews including customer feedback", "Review and renegotiate terms annually", "Maintain relationships with alternative bakeries", "Co-develop seasonal specials aligned with the drink menu"], "responsible": "Owner, Manager"}
  },
  "deliverables": ["Bakery Requirements Specification", "Bakery Partner Evaluation Scorecard", "Bakery Supply Agreement template", "Monthly Bakery Performance Review template", "Bakery Quality Check SOP"],
  "embedded_tools": [],
  "tool_definitions": {"tools": [
    {"tool_id": "T202-01", "tool_name": "Bakery Partner Evaluation Scorecard", "level": "L1", "format": "checklist", "owner_role": "Owner", "description": "Structured scorecard for evaluating potential bakery partners across quality, reliability, pricing, range, and brand alignment, with weighted scoring and comparison matrix."},
    {"tool_id": "T202-02", "tool_name": "Bakery Requirements Specification", "level": "L1", "format": "template", "owner_role": "Manager", "description": "Document specifying the cafe's bakery needs: product list, daily volumes, quality standards, delivery window requirements, and budget parameters."},
    {"tool_id": "T202-03", "tool_name": "Bakery Delivery Quality Check SOP", "level": "L2", "format": "SOP", "owner_role": "All Staff", "description": "Standard Operating Procedure for checking bakery deliveries on arrival: visual inspection, temperature check, quantity verification, and defect reporting process."},
    {"tool_id": "T202-04", "tool_name": "Monthly Bakery Performance Review", "level": "L2", "format": "template", "owner_role": "Manager", "description": "Monthly review template tracking delivery reliability, quality consistency, defect rate, cost trends, and any issues raised or resolved with the bakery partner."},
    {"tool_id": "T202-05", "tool_name": "Bakery Supply Agreement Template", "level": "L2", "format": "template", "owner_role": "Owner", "description": "Template for formalising the bakery supply relationship: products, pricing, delivery schedule, payment terms, quality standards, returns policy, and termination provisions."}
  ]},
  "failure_modes": ["The cafe selects a bakery partner based on price alone, resulting in poor quality that damages the brand", "No backup supplier is in place and the primary bakery has a supply failure, leaving the cafe without food to sell", "Quality standards are defined but delivery checks are not conducted, allowing substandard products to reach customers", "The bakery partnership becomes stale with no product innovation, and the food offering loses relevance"],
  "kpis": ["Bakery delivery reliability at 98% or above (correct products, on time, correct quantity)", "Defect rate below 2% of delivered items", "Bakery cost of goods supporting a food margin of 65% or above", "At least one new or exclusive bakery product launched per quarter"],
  "dependencies": ["B109"],
  "constraints": ["Bakery partners must hold appropriate food safety certifications (minimum Level 2 Food Hygiene)", "Delivery windows must align with cafe opening preparation times", "Allergen information must be provided for every product in compliance with UK food labelling law"],
  "time_load": {"L1": "4 hours (requirements definition, research, sample requests)", "L2": "6 hours (tastings, negotiations, trial setup, SOP development)", "L3": "2 hours/month (performance reviews, relationship management)"},
  "review_protocol": "Daily delivery quality checks. Monthly performance review with the bakery partner. Quarterly deep-dive quality review including customer feedback. Annual terms renegotiation and market review.",
  "meta": {"summary_for_humans": "This block provides a structured framework for evaluating, selecting, and managing bakery partnerships to ensure consistent quality, reliable supply, and brand-aligned food offerings.", "implementation_risks": ["Changing bakery partners disrupts the food offering and requires customer communication", "Local artisan bakeries may have limited capacity or inconsistent production schedules", "Exclusive product development requires investment from both parties"], "notes_for_engine": "Activate alongside B109 (food supply chain). Relevant to all venue types. Flag if signals indicate poor food quality reviews, inconsistent bakery supply, or declining food sales.", "tags": ["bakery", "partnership", "supplier", "food_quality", "supply_chain", "assessment", "procurement"]},
  "applicability": {"venue_types": ALL_8, "team_size_min": 1, "team_size_max": 99},
  "enrichment_status": {"level": "gold", "enriched_at": "2026-03-04T12:00:00Z", "enriched_by": "claude_direct_v2", "source_quality": "ai_generated"}
})

print("=== B195-B202 complete ===")
