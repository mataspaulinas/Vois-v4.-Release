# Kavos Namai — Operational Intelligence Report

**Independent_Cafe** | **2026-03-04** | Round 1 — First Look

> **The Real Story:** Kavos Namai is a one-person show masquerading as a two-person café. Every critical failure — S070, S073, S083, S063, S166 — traces back to a single root cause: there is no operational structure whatsoever, just two individuals improvising side by side with no roles, no briefings, no standards. The coffee is genuinely good (reviews say so), which is the only thing keeping customers returning despite 5–8 minute waits, dirty tables, and staff who can't answer basic allergen questions. The danger is that the product quality is buying time for a venue that is one EHO visit or one viral bad review away from a serious crisis.

**Confidence:** PROVISIONAL
_This plan is based on partial data. Some areas may need verification before L2 implementation._

## At a Glance

| Metric | Value |
|--------|-------|
| Signals detected | 13 |
| Active issues | 22 |
| Operational areas affected | 9 |
| Critical issues | 0 |
| Root cause threads | 9 |
| Response strategies | 20 |

---
## Diagnostic Spine

8 operational dimensions. Confidence = data coverage, not venue quality.

| Dimension | Confidence | Signals | Issues | Coverage |
|-----------|------------|---------|--------|----------|
| Client Journey | █░░░░░░░░░ GAP | 0 | 0 | Booking → arrival → consultation → service → checkout → aftercare |
| Service Delivery | █░░░░░░░░░ GAP | 0 | 0 | Technical quality, timing, consistency, finishing |
| Technical Quality & Craft | █░░░░░░░░░ GAP | 0 | 0 | Colour, cut, treatment execution, results |
| Space Safety & Hygiene | ███░░░░░░░ WEAK | 1 | 0 | Cleanliness, sterilisation, chemical safety, ambiance |
| Team & Talent | ██████░░░░ MODERATE | 4 | 0 | Staffing, morale, skills, retention, leadership |
| Operational Discipline | █░░░░░░░░░ GAP | 0 | 0 | Opening, scheduling, stock, daily routines, cash |
| Brand & Reputation | █░░░░░░░░░ GAP | 0 | 0 | Reviews, social media, positioning, client perception |
| Risk & Growth | ███░░░░░░░ WEAK | 1 | 0 | Trajectory, dependencies, compliance, opportunities |

**Data gaps — collect on next visit:**
- **Client Journey** — GAP
- **Service Delivery** — GAP
- **Technical Quality & Craft** — GAP
- **Operational Discipline** — GAP
- **Brand & Reputation** — GAP

---
## What's Happening

22 issues grouped into 9 root cause threads:

### 🟡 Leadership, Training & People — 5 findings (HIGH)

- Ticket time and service speed failure
- Morning rush and peak management failure
- Operational discipline and daily routine failure
- Workflow layout and station design failure
- Seating management and turnover failure

**Evidence:** Queue Wait Times Excessive (S019), Morning Rush Management Poor (S070), Daily Huddle Absent (S071), Workflow Layout Inefficient (S073), Seating Turnover Not Managed (S080), Peak Staffing Not Calibrated (S083)

### 🟡 Service Delivery & Craft — 3 findings (HIGH)

- Barista skills and craft development failure
- Key person dependency and cover failure
- Team communication and meeting failure

**Evidence:** Recipe Cards Or Standards Absent (S051), Team Not Cross Trained (S063), Daily Huddle Absent (S071)

### 🟡 Hygiene, Sterilisation & Chemical Safety — 3 findings (HIGH)

- Allergen management and PPDS compliance failure
- Food safety management system (HACCP) failure
- EHO readiness and audit compliance failure

**Evidence:** Food Allergen Management Non Compliant (S002), Cleanliness Standards Inconsistent (S133)

### 🟡 Workplace Safety & Compliance — 3 findings (HIGH)

- Queue management and wait time failure
- Accessibility and inclusivity failure
- Customer retention and return visit failure

**Evidence:** Queue Wait Times Excessive (S019), Wifi And Amenities Expectations Not Met (S026)

### 🟡 Inventory, Supply Chain & Cost — 2 findings (HIGH)

- Cleanliness and hygiene presentation failure
- Seating layout and comfort failure

**Evidence:** Seating Turnover Not Managed (S080), Cleanliness Standards Inconsistent (S133)

### 🟡 Salon Environment & Housekeeping — 2 findings (HIGH)

- Payroll cost management failure
- Revenue per hour and sales productivity failure

**Evidence:** Peak Staffing Not Calibrated (S083), Revenue Concentration Risk (S160)

### ⚪ Pre-Opening & Project Setup — 2 findings (MEDIUM)

- Standards consistency and culture failure
- Values articulation and alignment failure

**Evidence:** Team Not Aligned On Standards (S166)

### ⚪ Service & Client Experience — 1 findings (MEDIUM)

- Recipe standardisation and portion control failure

**Evidence:** Recipe Cards Or Standards Absent (S051)

### ⚪ Governance & Management Systems — 1 findings (MEDIUM)

- Revenue diversification failure

**Evidence:** Revenue Concentration Risk (S160)

---

## Derived Insights

Patterns read between the lines:

- **S070 + S083: One person handling orders, drinks, clearing, and payments simultaneously during 10–12 person queues** → This isn't a staffing shortage — it's a role vacuum. Two people are present but neither owns a lane. The chaos isn't about headcount, it's about the absence of any agreed division of labour. Adding a third person without fixing this will just create three people getting in each other's way. (HIGH) — Verify: Stand in the venue for a 90-minute morning window and map exactly who does what, when. Count how many times a task switches hands mid-execution.
- **S002 + S051 + S071: FOH staff can't confirm vegan status of soup, specials not consistently communicated, Wi-Fi code forgotten** → There are no written standards anywhere in this operation — no recipe cards, no allergen matrix, no pre-shift checklist. The allergen gap is the most dangerous symptom: this is not a training failure, it's a documentation failure. Under PPDS regulations, 'let me check' is not a compliant response and exposes the owner to personal liability. (HIGH) — Verify: Ask to see the allergen information folder, recipe cards, and the last pre-shift briefing record. Expect to find none of these exist.
- **S063 + S166: 'Wait, is that your table or mine?' — no shift lead, role confusion during busy periods** → Neither barista has been designated as responsible for anything. This means every decision during a rush — who clears, who takes payment, who answers the allergen question — is being negotiated in real time under pressure. The owner is almost certainly not present during peak hours, or is present but hasn't assigned authority. (HIGH) — Verify: Ask each barista separately: 'What are you specifically responsible for during a busy morning?' If the answers differ or are vague, the diagnosis is confirmed.
- **S080 + S133: Tables dirty 6–10 minutes after guests leave, specifically in corners** → The corner table pattern is telling — this isn't random neglect, it's a sightline problem. The counter position likely doesn't give a clear view of corner seating, so dirty tables only get noticed when someone complains or walks past. Combined with the single-person bottleneck at the counter, clearing simply never gets prioritised. (MEDIUM) — Verify: Stand at the counter and check whether corner tables are visible from the primary work position. Time how long it takes for a cleared corner table to be noticed and wiped.
- **S160: 'Quiet Old Town alley', calm daytime-only observation window, no revenue diversification signals** → This venue is almost entirely dependent on morning footfall from a low-traffic location. There is no evidence of afternoon trade, events, retail coffee sales, or any secondary revenue stream. If the morning rush is already breaking the operation, there is no buffer if footfall drops — seasonal, weather-related, or competitive. (MEDIUM) — Verify: Pull the hourly sales data by day of week for the last 3 months. Look for whether revenue after 12pm is meaningful or effectively zero.

---

## Investigation Notes

Working theories grouped by root cause — not conclusions. Each needs verification on the next visit.

### 1. Leadership, Training & People (5 findings, HIGH)

5 issues detected in Leadership, Training & People. These findings point to systemic gaps that need investigation.

**Specific issues:**
- Ticket time and service speed failure
- Morning rush and peak management failure
- Operational discipline and daily routine failure
- Workflow layout and station design failure
- Seating management and turnover failure

**Evidence:** Queue Wait Times Excessive (S019), Morning Rush Management Poor (S070), Daily Huddle Absent (S071), Workflow Layout Inefficient (S073), Seating Turnover Not Managed (S080), Peak Staffing Not Calibrated (S083)

**Working Theories:**
1. Process exists on paper but isn't followed in practice
2. Knowledge gap — team doesn't know how to execute correctly
3. No accountability mechanism — nobody owns this area
4. Leadership bypasses the process, signaling it doesn't matter

**Verify:**
- [ ] Check: is there a written process? Where is it stored?
- [ ] Ask the team: 'How does this work here?' — compare answers
- [ ] Observe: does management follow the same rules?
- [ ] Who is accountable? Do they know it?

### 2. Service Delivery & Craft (3 findings, HIGH)

3 issues detected in Service Delivery & Craft. These findings point to systemic gaps that need investigation.

**Specific issues:**
- Barista skills and craft development failure
- Key person dependency and cover failure
- Team communication and meeting failure

**Evidence:** Recipe Cards Or Standards Absent (S051), Team Not Cross Trained (S063), Daily Huddle Absent (S071)

**Working Theories:**
1. Process exists on paper but isn't followed in practice
2. Knowledge gap — team doesn't know how to execute correctly
3. No accountability mechanism — nobody owns this area
4. Leadership bypasses the process, signaling it doesn't matter

**Verify:**
- [ ] Check: is there a written process? Where is it stored?
- [ ] Ask the team: 'How does this work here?' — compare answers
- [ ] Observe: does management follow the same rules?
- [ ] Who is accountable? Do they know it?

### 3. Hygiene, Sterilisation & Chemical Safety (3 findings, HIGH)

3 issues detected in Hygiene, Sterilisation & Chemical Safety. These findings point to systemic gaps that need investigation.

**Specific issues:**
- Allergen management and PPDS compliance failure
- Food safety management system (HACCP) failure
- EHO readiness and audit compliance failure

**Evidence:** Food Allergen Management Non Compliant (S002), Cleanliness Standards Inconsistent (S133)

**Working Theories:**
1. Process exists on paper but isn't followed in practice
2. Knowledge gap — team doesn't know how to execute correctly
3. No accountability mechanism — nobody owns this area
4. Leadership bypasses the process, signaling it doesn't matter

**Verify:**
- [ ] Check: is there a written process? Where is it stored?
- [ ] Ask the team: 'How does this work here?' — compare answers
- [ ] Observe: does management follow the same rules?
- [ ] Who is accountable? Do they know it?

### 4. Workplace Safety & Compliance (3 findings, HIGH)

3 issues detected in Workplace Safety & Compliance. These findings point to systemic gaps that need investigation.

**Specific issues:**
- Queue management and wait time failure
- Accessibility and inclusivity failure
- Customer retention and return visit failure

**Evidence:** Queue Wait Times Excessive (S019), Wifi And Amenities Expectations Not Met (S026)

**Working Theories:**
1. Process exists on paper but isn't followed in practice
2. Knowledge gap — team doesn't know how to execute correctly
3. No accountability mechanism — nobody owns this area
4. Leadership bypasses the process, signaling it doesn't matter

**Verify:**
- [ ] Check: is there a written process? Where is it stored?
- [ ] Ask the team: 'How does this work here?' — compare answers
- [ ] Observe: does management follow the same rules?
- [ ] Who is accountable? Do they know it?

### 5. Inventory, Supply Chain & Cost (2 findings, HIGH)

2 issues detected in Inventory, Supply Chain & Cost. These findings point to systemic gaps that need investigation.

**Specific issues:**
- Cleanliness and hygiene presentation failure
- Seating layout and comfort failure

**Evidence:** Seating Turnover Not Managed (S080), Cleanliness Standards Inconsistent (S133)

**Working Theories:**
1. Process exists on paper but isn't followed in practice
2. Knowledge gap — team doesn't know how to execute correctly
3. No accountability mechanism — nobody owns this area
4. Leadership bypasses the process, signaling it doesn't matter

**Verify:**
- [ ] Check: is there a written process? Where is it stored?
- [ ] Ask the team: 'How does this work here?' — compare answers
- [ ] Observe: does management follow the same rules?
- [ ] Who is accountable? Do they know it?

### 6. Salon Environment & Housekeeping (2 findings, HIGH)

2 issues detected in Salon Environment & Housekeeping. These findings point to systemic gaps that need investigation.

**Specific issues:**
- Payroll cost management failure
- Revenue per hour and sales productivity failure

**Evidence:** Peak Staffing Not Calibrated (S083), Revenue Concentration Risk (S160)

**Working Theories:**
1. Process exists on paper but isn't followed in practice
2. Knowledge gap — team doesn't know how to execute correctly
3. No accountability mechanism — nobody owns this area
4. Leadership bypasses the process, signaling it doesn't matter

**Verify:**
- [ ] Check: is there a written process? Where is it stored?
- [ ] Ask the team: 'How does this work here?' — compare answers
- [ ] Observe: does management follow the same rules?
- [ ] Who is accountable? Do they know it?

### 7. Pre-Opening & Project Setup (2 findings, MEDIUM)

2 issues detected in Pre-Opening & Project Setup. These findings point to systemic gaps that need investigation.

**Specific issues:**
- Standards consistency and culture failure
- Values articulation and alignment failure

**Evidence:** Team Not Aligned On Standards (S166)

**Working Theories:**
1. Process exists on paper but isn't followed in practice
2. Knowledge gap — team doesn't know how to execute correctly
3. No accountability mechanism — nobody owns this area
4. Leadership bypasses the process, signaling it doesn't matter

**Verify:**
- [ ] Check: is there a written process? Where is it stored?
- [ ] Ask the team: 'How does this work here?' — compare answers
- [ ] Observe: does management follow the same rules?
- [ ] Who is accountable? Do they know it?

### 8. Service & Client Experience (1 findings, MEDIUM)

1 issues detected in Service & Client Experience. These findings point to systemic gaps that need investigation.

**Specific issues:**
- Recipe standardisation and portion control failure

**Evidence:** Recipe Cards Or Standards Absent (S051)

**Working Theories:**
1. Process exists on paper but isn't followed in practice
2. Knowledge gap — team doesn't know how to execute correctly
3. No accountability mechanism — nobody owns this area
4. Leadership bypasses the process, signaling it doesn't matter

**Verify:**
- [ ] Check: is there a written process? Where is it stored?
- [ ] Ask the team: 'How does this work here?' — compare answers
- [ ] Observe: does management follow the same rules?
- [ ] Who is accountable? Do they know it?

### 9. Governance & Management Systems (1 findings, MEDIUM)

1 issues detected in Governance & Management Systems. These findings point to systemic gaps that need investigation.

**Specific issues:**
- Revenue diversification failure

**Evidence:** Revenue Concentration Risk (S160)

**Working Theories:**
1. Process exists on paper but isn't followed in practice
2. Knowledge gap — team doesn't know how to execute correctly
3. No accountability mechanism — nobody owns this area
4. Leadership bypasses the process, signaling it doesn't matter

**Verify:**
- [ ] Check: is there a written process? Where is it stored?
- [ ] Ask the team: 'How does this work here?' — compare answers
- [ ] Observe: does management follow the same rules?
- [ ] Who is accountable? Do they know it?

---

### Cross-Validation

- S063 (no cross-training) confirms S166 (no standards alignment) — together they confirm there is no designated shift lead and no one person accountable for service quality at any given moment, which directly causes S070 and S073's single-person bottleneck
- S051 (no recipe cards) confirms S002 (allergen non-compliance) — the allergen gap is not a knowledge problem, it's a documentation problem; the staff member who said 'let me check' was doing the right thing given that no written reference exists, which makes this a systemic failure not an individual one
- S071 (no daily huddle) confirms S051 and S026 — specials not communicated and Wi-Fi code forgotten are both things a 5-minute pre-shift briefing would solve; their simultaneous presence confirms no structured handover or briefing process exists at all
- S080 (dirty tables 6–10 min) confirms S083 (understaffed at peak) — but the corner-specific pattern suggests this is also a layout and sightline issue per S073, meaning the fix is not just more staff but repositioning the clearing responsibility to someone with floor visibility

---

## Suspicion Patterns

When the data says one thing, suspect the layer underneath:

| Surface Signal | Actually Suspect | Ask |
|----------------|-----------------|-----|
| Treatment didn't last | Not product quality — application technique or consultation gap | Was a patch test done? Was the consultation thorough? Who mixed/applied? |
| Staff were rude | Not attitude — overwhelm/understaffing | How many clients were booked? How many stylists on the floor? |
| Services unavailable | Not supply chain — no stock system or scheduling discipline | Is there a stock checklist? Who orders? How often? |
| Salon looked messy | Not lazy staff — no station reset protocol | Is there a defined station reset sequence between clients? Who's responsible? |
| Long wait at checkout | Not forgetfulness — no checkout trigger in service flow | Is POS at reception? Is there a handoff from stylist to reception? |
| Great results, won't return | Service/environment killed the experience | What's the experience score relative to technical score? |
| High staff turnover | Not pay — culture/leadership gap | How often does the owner sit with the team? Is there a progression path or education budget? |
| Inconsistent colour results | Not stylist skill — no formulation records or consultation process | Are colour formulas recorded? Is there a consultation checklist? Who checks results before client leaves? |

---
## Response Strategy

### Peak Staffing & Rush Management
Priority: 2.0 | D05

| Phase | Focus | When |
|-------|-------|------|
| L1 — Immediate Control | Review your staffing levels against your transaction data for the past four weeks. Are you adequately staffed during peak hours (typically 7-10am and 12-2pm)? If ticket times exceed 5 minutes during peak you are either understaffed or your workflow is broken. Observe your team during the next morning rush and identify every point of delay or confusion. | Days 1–30 |
| L2 — Structural Integration | Create a data-driven staffing model showing the optimal number of team members for each hour based on historical transaction volumes. Design role assignments for peak periods — dedicated till barista food prep and runner positions. Develop a mise-en-place checklist ensuring everything is prepared before the rush begins. Implement pre-rush routines that start 30 minutes before peak. | Days 31–60 |
| L3 — Leadership Maintenance | Master the morning rush. Your peak period should feel like a well-rehearsed performance — fast energised and controlled. Track peak period metrics daily and continuously optimise. Study the best high-volume cafes and learn from their workflows. Your team should anticipate demand not react to it. | Days 61–90 |

### Values Alignment & Standards Culture
Priority: 1.5 | D12

| Phase | Focus | When |
|-------|-------|------|
| L1 — Immediate Control | Can every team member articulate your cafe's values and standards? Ask them today. If responses are vague or inconsistent your values exist in your head but not in your culture. Check whether you have a staff handbook that documents expectations standards and policies. If not the gap between your intentions and your team's understanding is growing daily. | Days 1–30 |
| L2 — Structural Integration | Define and document your cafe's core values in clear specific terms that guide daily behaviour. Create a staff handbook covering values standards policies and procedures. Implement a values-based onboarding process where new starters learn what matters to your cafe not just what tasks to perform. Address any toxic dynamics or cultural issues directly — they will not resolve themselves. | Days 31–60 |
| L3 — Leadership Maintenance | Build a culture where your values are lived not laminated. Your standards should be maintained through shared commitment not surveillance. Celebrate team members who embody your values and address those who do not. Your culture is what happens when you are not watching — make it strong enough to sustain itself. | Days 61–90 |

### Onboarding & Barista Training
Priority: 1.0 | D04

| Phase | Focus | When |
|-------|-------|------|
| L1 — Immediate Control | Review your current induction process. Does a new starter receive a structured first week covering food safety coffee training till operation and customer service standards? Or are they thrown in and expected to learn on the job? If there is no written induction plan create one this week. Ensure every new starter is paired with an experienced barista for their first five shifts. | Days 1–30 |
| L2 — Structural Integration | Build a structured barista training programme with clear milestones and assessment criteria. Create a training manual covering all core skills from espresso extraction to food preparation to customer interaction. Implement a mentorship system where experienced baristas guide new starters. Develop a barista certification system with levels that link to pay progression. | Days 31–60 |
| L3 — Leadership Maintenance | Create a learning culture where continuous skill development is valued and supported. Offer advanced training opportunities including external courses competitions and supplier-led sessions. Your training programme should be thorough enough that your baristas could work at any specialty cafe. Make training investment a retention tool and a recruitment attraction. | Days 61–90 |

### Allergen Management & PPDS Compliance
Priority: 0.8 | D01

| Phase | Focus | When |
|-------|-------|------|
| L1 — Immediate Control | Audit your allergen information immediately. Every menu item must have the 14 declarable allergens documented and available to customers on request. If you sell any pre-packed for direct sale items check Natasha's Law PPDS compliance now — every wrapped sandwich cake or salad must carry a full ingredient list with allergens emphasised. Fix any gaps today. | Days 1–30 |
| L2 — Structural Integration | Create an allergen matrix covering every item on your menu including specials and seasonal items. Implement a system for updating allergen information when recipes or suppliers change. Train every team member to handle allergen enquiries confidently and to escalate when uncertain. Develop a customer allergen dialogue script and ensure it is used consistently. | Days 31–60 |
| L3 — Leadership Maintenance | Establish allergen management as a non-negotiable part of your food safety culture. Conduct quarterly allergen audits including mystery customer tests. Your allergen processes should be thorough enough that a customer with a severe allergy feels genuinely safe eating with you. Track allergen near-misses and use them to strengthen your system. | Days 61–90 |

### Queue Management & Service Speed
Priority: 0.8 | D02

| Phase | Focus | When |
|-------|-------|------|
| L1 — Immediate Control | Measure your peak queue times this week. Time how long customers wait from joining the queue to receiving their order during morning rush (7-10am) and lunchtime peak. If any customer waits more than 5 minutes to order or more than 8 minutes for a coffee something is wrong. Identify the bottleneck immediately — is it the till the espresso machine the food prep or the team capacity? | Days 1–30 |
| L2 — Structural Integration | Design a peak period workflow that assigns specific roles: dedicated till operator barista food runner and floor support. Create a peak staffing model based on transaction data showing exactly how many team members you need for each hour of the day. Implement a queue management communication strategy where team members acknowledge waiting customers and provide time estimates. | Days 31–60 |
| L3 — Leadership Maintenance | Build a service speed culture where the team takes pride in fast smooth service without sacrificing quality. Track average service times daily and display them to the team. Study your workflow during peak and continuously optimise. Your morning rush should feel energised and efficient not chaotic. Customers should never feel ignored even when you are busy. | Days 61–90 |

### Customer Journey & Accessibility
Priority: 0.8 | D02

| Phase | Focus | When |
|-------|-------|------|
| L1 — Immediate Control | Walk through your cafe as a customer today. Enter through the front door and experience the full journey: signage queueing ordering waiting collecting and seating. Note every friction point. Then consider accessibility: can a wheelchair user access the counter? Are there accessible toilets? Is your menu readable for someone with visual impairment? Fix any immediate barriers. | Days 1–30 |
| L2 — Structural Integration | Map your complete customer journey and define quality standards for each touchpoint. Develop specific standards for takeaway versus dine-in experiences. Conduct an accessibility audit covering physical access menu accessibility toilet facilities and communication. Create processes for handling customers with children elderly customers and those with disabilities. | Days 31–60 |
| L3 — Leadership Maintenance | Design a customer experience that is genuinely inclusive and consistently excellent regardless of how the customer interacts with you — walk-in takeaway delivery or pre-order. Your cafe should be known for making everyone feel welcome. Use customer journey mapping data to innovate and differentiate your experience from competitors. | Days 61–90 |

### Recipe Standards & Portion Control
Priority: 0.8 | D03

| Phase | Focus | When |
|-------|-------|------|
| L1 — Immediate Control | Check whether you have written recipe cards for every drink and food item on your menu. If a new barista started tomorrow could they make every drink to your standard without asking? Verify that portion sizes are consistent — weigh a few items and compare to your intended standard. Inconsistent portions erode margins and customer trust. | Days 1–30 |
| L2 — Structural Integration | Create a comprehensive recipe card system covering every drink and food item on your menu. Include exact measurements pour weights ingredient lists and visual references. Implement a portion control system with scales scoops and measures at every station. Train all team members on recipe standards and conduct quarterly consistency audits. Track cost per serve for your top 20 items. | Days 31–60 |
| L3 — Leadership Maintenance | Standardisation should not kill creativity but it must ensure consistency. Your recipe system should be thorough enough that any trained barista can produce your drinks to standard while still allowing skilled baristas to express their craft. Update recipe cards whenever ingredients or methods change and review them quarterly. | Days 61–90 |

### Workflow Layout & Station Design
Priority: 0.8 | D05

| Phase | Focus | When |
|-------|-------|------|
| L1 — Immediate Control | Stand behind your counter during a busy period and watch the workflow. Where do people collide? Where do they wait? Where do they walk unnecessarily? Map the physical journey of a cup from order to handoff and count the steps. If your barista is taking more than three steps to complete a drink your layout needs attention. Check that all frequently used items are within arm's reach. | Days 1–30 |
| L2 — Structural Integration | Conduct a formal workflow audit mapping movement patterns during peak service. Redesign station layouts to minimise movement and eliminate crossover. Implement the 3-step rule: every item needed for a drink should be within three steps of the espresso machine. Ensure equipment placement supports a logical left-to-right workflow. Address equipment reliability issues that cause workflow disruption. | Days 31–60 |
| L3 — Leadership Maintenance | Optimise your workspace like a kitchen brigade — every station designed for efficiency and every tool placed for speed. Review and refine your layout seasonally as your menu and service patterns evolve. Invest in equipment and layout changes that measurably improve throughput. Your workflow should be smooth enough that a new team member can follow it intuitively. | Days 61–90 |

### Seating & Capacity Management
Priority: 0.8 | D05

| Phase | Focus | When |
|-------|-------|------|
| L1 — Immediate Control | Observe your seating area during peak periods. Are customers struggling to find seats? Are tables occupied by single customers with laptops during your busiest lunch hour? Count your covers and compare to your transaction data — are you turning tables or are they static? If seating is a bottleneck during peak it is costing you revenue. | Days 1–30 |
| L2 — Structural Integration | Develop a seating strategy that balances dine-in comfort with turnover efficiency. Create different zones — quick coffee seats community tables laptop-friendly areas and group seating. Implement a table-clearing protocol that maintains flow without rushing customers. Consider a peak-period policy for laptop users. Optimise your outdoor seating area if you have one. | Days 31–60 |
| L3 — Leadership Maintenance | Design your seating experience to support your brand and your revenue goals. Your layout should encourage the behaviour you want — quick visits during peak comfortable lingering during quiet periods. Review seating data seasonally and adjust layouts accordingly. Your seating should be a competitive advantage not an afterthought. | Days 61–90 |

### Exterior Presentation & Cleanliness
Priority: 0.8 | D09

| Phase | Focus | When |
|-------|-------|------|
| L1 — Immediate Control | Walk past your cafe from across the street. What does a potential customer see? Is your signage clear and inviting? Is the exterior clean — windows washed pavement swept A-board presentable? Step inside and look with fresh eyes: are surfaces clean tables cleared and floors spotless? First impressions are made in seconds and cannot be undone. | Days 1–30 |
| L2 — Structural Integration | Develop presentation standards for your exterior and front-of-house covering signage window displays A-boards lighting and cleanliness. Create a front-of-house cleaning checklist with hourly touch-points during service. Implement a deep-clean schedule for floors walls and fixtures. Ensure back-of-house organisation does not spill into customer areas. Maintain toilet facilities to hotel standard. | Days 31–60 |
| L3 — Leadership Maintenance | Your cafe should look its best at every moment of every day. Cleanliness and presentation should be instinctive not instructed. Build a culture where every team member notices and corrects presentation issues without being asked. Your exterior should draw people in and your interior should make them want to stay. | Days 61–90 |

### Revenue Diversification & Expansion
Priority: 0.8 | D11

| Phase | Focus | When |
|-------|-------|------|
| L1 — Immediate Control | Identify revenue opportunities you are not currently pursuing. Could you offer catering for local offices? Sell retail coffee beans or merchandise? Develop an evening trade? Host events? Launch a subscription model? List five potential revenue streams and assess each for feasibility and margin. Start with the one that requires the least investment. | Days 1–30 |
| L2 — Structural Integration | Develop a revenue diversification plan evaluating each opportunity against investment required margin potential and operational impact. Create a pilot programme for your most promising new revenue stream. Assess expansion readiness — do your systems team and finances support a second location? If considering expansion ensure your first site runs independently before opening a second. | Days 31–60 |
| L3 — Leadership Maintenance | Build a diversified revenue model that reduces dependence on walk-in coffee sales. Each new revenue stream should be tested with a minimum viable approach before full commitment. If pursuing expansion create a site-opening playbook that captures everything you have learned. Growth should be strategic not opportunistic. | Days 61–90 |

### Operational Rhythm & Daily Discipline
Priority: 0.8 | D05

| Phase | Focus | When |
|-------|-------|------|
| L1 — Immediate Control | Review your daily operational discipline. Are prep lists being used? Is the waste log completed every day? Is the maintenance log up to date? Are daily targets communicated to the team? If any of these basic disciplines have lapsed recommit to them this week. Operational discipline is the foundation everything else is built on. | Days 1–30 |
| L2 — Structural Integration | Create a comprehensive daily discipline framework covering prep lists waste logs maintenance logs cash reconciliation temperature checks and target tracking. Implement an operational rhythm dashboard that gives you a daily snapshot of compliance. Train all shift-capable team members on the full discipline framework. Conduct weekly discipline audits and address gaps immediately. | Days 31–60 |
| L3 — Leadership Maintenance | Operational discipline should be invisible because it is automatic. Your daily routines should be so embedded that they happen without thinking. Build a culture where discipline is respected and lapses are noticed by the team not just by management. Your operational rhythm should be the heartbeat of your cafe. | Days 61–90 |

### HACCP & Food Safety Management System
Priority: 0.7 | D01

| Phase | Focus | When |
|-------|-------|------|
| L1 — Immediate Control | Check whether you have a documented HACCP-based food safety management system. If you are using Safer Food Better Business or an equivalent it must be current and actively used not filed away. Identify your critical control points — cooking temperatures cooling times hot holding — and confirm they are being monitored and recorded. Any gaps must be addressed this week. | Days 1–30 |
| L2 — Structural Integration | Build or update your HACCP system to cover all food processes in your cafe from goods receipt through storage preparation cooking display and service. Document each critical control point with target parameters monitoring frequency corrective actions and responsible person. Train all kitchen and food preparation staff on the HACCP system and their specific responsibilities within it. | Days 31–60 |
| L3 — Leadership Maintenance | Your food safety management system should be a living document that evolves with your menu and operations. Conduct internal food safety audits quarterly and use findings to update procedures. Maintain supplier due diligence records and traceability systems. Aim for consistent EHO rating of 5 and use food safety excellence as a customer trust signal. | Days 61–90 |

### Food Safety Training & EHO Readiness
Priority: 0.7 | D01

| Phase | Focus | When |
|-------|-------|------|
| L1 — Immediate Control | Check every team member's food safety certification status today. All food handlers must hold a minimum Level 2 Food Hygiene certificate. If any certificates have expired or were never obtained arrange training within the next 14 days. Review your most recent EHO inspection report and confirm all recommendations have been actioned. | Days 1–30 |
| L2 — Structural Integration | Create a food safety training matrix showing every team member's certification status expiry date and next renewal. Schedule refresher training before certificates expire. Develop an internal food safety induction that covers your specific procedures not just generic training. Conduct a mock EHO inspection quarterly using the official scoring criteria. | Days 31–60 |
| L3 — Leadership Maintenance | Embed food safety training into your cafe's identity. Every new starter should complete food safety induction before handling food. Build an internal food safety champion role with responsibility for standards compliance and continuous improvement. Your EHO readiness should be permanent not a last-minute preparation exercise. | Days 61–90 |

### Customer Retention & Loyalty
Priority: 0.7 | D02

| Phase | Focus | When |
|-------|-------|------|
| L1 — Immediate Control | Pull your sales data and identify your return visit patterns. How many unique customers visit weekly? What is your ratio of regulars to new customers? If you cannot answer these questions you have no retention visibility. Start tracking return visits immediately through your POS system loyalty cards or simple observation. Identify your top 20 regulars and confirm your team knows them by name. | Days 1–30 |
| L2 — Structural Integration | Design and implement a loyalty programme that rewards return visits — whether digital stamp card or app-based. Create a regular customer recognition system where baristas greet regulars by name and remember their usual order. Implement a lapsed customer re-engagement process for customers who have not visited in 30 days. Track customer lifetime value not just daily transaction counts. | Days 31–60 |
| L3 — Leadership Maintenance | Build a community of loyal customers who feel genuine belonging at your cafe. Your regulars should feel like valued members not just repeat transactions. Track retention metrics monthly and use them to shape your customer experience strategy. The strongest independent cafes have return visit rates above 60% — aim to be among them. | Days 61–90 |

### Team Communication & Meetings
Priority: 0.7 | D04

| Phase | Focus | When |
|-------|-------|------|
| L1 — Immediate Control | Are you holding daily team briefings before each shift? If not start tomorrow. A 5-minute huddle covering the day's targets any specials or changes and any issues from yesterday transforms team alignment. Check whether you have a weekly team meeting — if not schedule one. Communication gaps create errors waste and frustration. | Days 1–30 |
| L2 — Structural Integration | Implement a structured communication framework: daily pre-shift briefings weekly team meetings and monthly all-hands sessions. Create agenda templates for each format. Establish a digital communication channel (WhatsApp group or similar) for operational updates. Develop a rota publication policy ensuring at least two weeks advance notice. Track meeting attendance and action completion. | Days 31–60 |
| L3 — Leadership Maintenance | Build a communication culture where information flows freely and everyone feels heard. Your team should understand the cafe's goals challenges and successes. Use meetings as opportunities for recognition and skill sharing not just task allocation. Excellent communication is the foundation of team performance. | Days 61–90 |

### Key Person Risk & Cross-Training
Priority: 0.7 | D04

| Phase | Focus | When |
|-------|-------|------|
| L1 — Immediate Control | Identify your key person dependencies today. Who is the only person who can do the banking the ordering the espresso machine maintenance or the rota? What happens if they are ill for two weeks or resign? If the answer is chaos you have a critical vulnerability. Start documenting their knowledge this week. | Days 1–30 |
| L2 — Structural Integration | Implement a cross-training programme ensuring at least two people can perform every critical function. Create a skills coverage matrix showing who can cover what and identifying gaps. Develop an absence cover protocol with emergency contact procedures and minimum staffing requirements. Document all key processes in a simple operations manual accessible to the whole team. | Days 31–60 |
| L3 — Leadership Maintenance | Build organisational resilience through deep cross-training and knowledge sharing. No single person's departure should threaten your cafe's operation. Create a knowledge capture system where processes are documented and regularly updated. Your team's collective capability should exceed any individual's contribution. | Days 61–90 |

### Revenue Growth & Pricing Strategy
Priority: 0.7 | D07

| Phase | Focus | When |
|-------|-------|------|
| L1 — Immediate Control | Pull your revenue per hour data for the past four weeks. Identify your most and least productive hours. Is your average transaction value (ATV) growing or stagnant? When did you last review your prices? If it has been more than 12 months your prices are almost certainly too low given ingredient and wage inflation. Compare your prices to three local competitors this week. | Days 1–30 |
| L2 — Structural Integration | Implement a structured pricing review process conducted every 6-12 months. Develop an upselling programme training baristas to suggest add-ons naturally — extra shot cake with coffee larger size. Track ATV daily and set improvement targets. Create revenue targets for each shift and share them with the team. Analyse your highest-margin items and position them prominently. | Days 31–60 |
| L3 — Leadership Maintenance | Build a revenue growth culture where the team understands the connection between their service and the cafe's financial health. Your pricing should reflect your value not just your costs. Develop premium offerings that increase ATV without alienating core customers. Track revenue per hour as your primary productivity metric. | Days 61–90 |

### Cost Structure & Payroll Control
Priority: 0.7 | D07

| Phase | Focus | When |
|-------|-------|------|
| L1 — Immediate Control | Calculate your payroll percentage — total staff costs divided by revenue. For cafes this should be between 30-40%. If it is above 40% you are either overstaffed during quiet periods or your revenue is too low. Review your cost structure: rent utilities insurance supplies. Identify your top three cost-reduction opportunities without compromising quality. | Days 1–30 |
| L2 — Structural Integration | Implement a labour scheduling system that matches staffing levels to demand patterns. Create a cost structure dashboard tracking rent payroll cost-of-goods and utilities as percentages of revenue. Develop a payroll optimisation strategy using flexible scheduling split shifts and cross-training. Review all fixed costs annually and negotiate where possible. | Days 31–60 |
| L3 — Leadership Maintenance | Master your cost structure so that margin is protected without sacrificing the customer or team experience. Your payroll model should be responsive to demand while providing team members with stable predictable hours. Build a cost-conscious culture where waste in any form is identified and addressed. | Days 61–90 |

### Interior Design & Atmosphere
Priority: 0.7 | D09

| Phase | Focus | When |
|-------|-------|------|
| L1 — Immediate Control | Assess your cafe atmosphere critically. Is the lighting appropriate for the time of day? Is the temperature comfortable? Is the music at the right volume and genre? Sit in every seating position and experience the cafe from the customer's perspective. Identify the three things that most detract from the atmosphere and prioritise fixing them. | Days 1–30 |
| L2 — Structural Integration | Conduct a comprehensive atmosphere audit covering lighting sound temperature scent and visual design. Create a music and ambiance programme with playlists curated for different times of day. Optimise your seating layout for both comfort and capacity. Review your interior design with fresh eyes and invest in updates where the space looks tired or dated. Consider seasonal atmosphere changes. | Days 31–60 |
| L3 — Leadership Maintenance | Design an atmosphere that becomes a signature part of your cafe experience. Your space should have a distinct personality that customers associate with your brand. Invest in lighting and sound design that creates genuine warmth. Your cafe should be a place people want to spend time in not just grab a coffee from. | Days 61–90 |

---
## Execution Plan

### L1 — Immediate Control (Days 1–30)

_Visibility, clarity, and stabilising the present moment. Executable within 7 days using current staff and existing resources. Short, tactical actions with clear owners and fast tracking._

| Block | Strategy | Priority |
|-------|----------|----------|
| **B085** | Peak Staffing & Rush Management | HIGH |
| **B086** | Peak Staffing & Rush Management | HIGH |

**B085 -- Peak Staffing Model**
*Creates a data-driven staffing model that matches team deployment to customer demand patterns throughout the day, ensuring the right number of people with the right skills are on the floor at the right times — particularly during peak trading periods.*

IMMEDIATE (0-2 weeks). Week 1: Extract hourly transaction data from the EPOS system for the past four to six weeks. If the EPOS does not provide this data, manually count transactions per hour for one full week using a tally sheet. Create a simple chart showing average transactions per hour across the trading day for each day of the week. Identify the clear peaks (typically 7:30-9:00 and 12:00-13:30), moderate periods, and quiet periods. Note how patterns differ between weekdays and weekends. Week 2: Define minimum staffing levels for each period. As a rule of thumb: one barista can handle ...

**Key deliverables:** Hourly Transaction Analysis chart by day of week; Daily Staffing Template by role and hour; Staffing Matrix for each day type with optimal and minimum levels; Labour Cost Tracking template (weekly revenue vs labour cost)

**B086 -- Morning Rush Workflow**
*Designs and optimises the workflow for the morning rush period — typically 7:30 to 9:30am — defining roles, positions, task sequences, and communication protocols that enable the team to serve the maximum number of customers at speed without sacrificing drink quality or customer experience.*

IMMEDIATE (0-2 weeks). Week 1: Observe the current morning rush from start to finish without intervening. Stand in a position where you can see the entire service flow — till, espresso machine, milk station, food counter, and handoff point. Time three key intervals: (1) Queue join to order placed. (2) Order placed to drink started. (3) Drink started to handoff. Note every bottleneck: where do people wait, where do team members collide, where does the workflow stall? Identify the three biggest time-wasters. Common culprits: having to walk to the fridge for milk mid-service, searching for a c...

**Key deliverables:** Morning Rush Workflow SOP (roles, positions, communication, sequencing); Floor Plan Workflow Map showing movement paths for each role; Rush Communication Protocol card (standardised drink calling format); Morning Rush Service Time Tracker

### L2 — Structural Integration (Days 31–60)

_Embedding corrected behaviour into daily and weekly routines. Build repeatable systems, checklists, and verifiable standards. SOPs, weekly cadence, scoreboards, and verification methods._

| Block | Strategy | Priority |
|-------|----------|----------|
| **B085** | Peak Staffing & Rush Management | HIGH |
| **B086** | Peak Staffing & Rush Management | HIGH |
| **B087** | Peak Staffing & Rush Management | HIGH |
| **B088** | Peak Staffing & Rush Management | HIGH |

**B085 -- Peak Staffing Model**
*Creates a data-driven staffing model that matches team deployment to customer demand patterns throughout the day, ensuring the right number of people with the right skills are on the floor at the right times — particularly during peak trading periods.*

SYSTEM BUILD (2-8 weeks). Refine the staffing model by incorporating additional variables: day of the week (Saturdays are typically 30-50% higher than midweek), seasonal patterns (summer versus winter, school holidays), weather impact (sunny weekend afternoons can double garden cafe footfall), and local events (markets, festivals, school activities). Build a Staffing Matrix that shows optimal staffing by role and hour for each day type: quiet weekday, busy weekday, standard Saturday, and peak Saturday. Factor in non-service labour requirements: opening prep time, closing clean-down time, mi...

**Key deliverables:** Hourly Transaction Analysis chart by day of week; Daily Staffing Template by role and hour; Staffing Matrix for each day type with optimal and minimum levels; Labour Cost Tracking template (weekly revenue vs labour cost)

**B086 -- Morning Rush Workflow**
*Designs and optimises the workflow for the morning rush period — typically 7:30 to 9:30am — defining roles, positions, task sequences, and communication protocols that enable the team to serve the maximum number of customers at speed without sacrificing drink quality or customer experience.*

SYSTEM BUILD (2-8 weeks). Create a Morning Rush Workflow SOP documenting every element: pre-rush preparation checklist (linked to B087), station assignments, communication protocols (how orders are called), drink sequencing (first in first out versus batch steaming), food service integration, and handoff procedure. Map the physical workflow on a floor plan — draw the path each role takes during service and identify any crossing points where team members' paths conflict. Redesign movements to eliminate unnecessary crossing, reaching, or walking. Establish a 'rush mode' communication protocol...

**Key deliverables:** Morning Rush Workflow SOP (roles, positions, communication, sequencing); Floor Plan Workflow Map showing movement paths for each role; Rush Communication Protocol card (standardised drink calling format); Morning Rush Service Time Tracker

**B087 -- Pre-Rush Mise-en-Place**
*Establishes a comprehensive pre-rush preparation protocol — the cafe equivalent of culinary mise en place — ensuring that every supply, tool, and station element is in position and ready before peak service begins, so the team can focus entirely on speed and quality during the rush.*

SYSTEM BUILD (2-8 weeks). Develop a Pre-Rush Mise en Place SOP that standardises the preparation process, including par levels (how much stock to have at the bar before rush), timing (what must be done by what time), and quality checks (test shots, milk freshness, food temperature). Create visual guides for each station showing exactly where each item should be positioned — laminated photos of a perfectly set bar, till station, and food counter serve as powerful reference tools. Establish a prep quality check: ten minutes before the rush is expected to begin, the shift lead walks the prep c...

**Key deliverables:** Pre-Rush Preparation Checklist by station (printable A4); Pre-Rush Mise en Place SOP with par levels and timing; Visual Station Setup Guides (laminated photos); Closing-for-Opening Prep Protocol

**B088 -- Peak Performance Analysis**
SYSTEM BUILD (2-8 weeks). Create a Peak Performance Dashboard that consolidates all four metrics on a single weekly view with trend lines. Add secondary metrics as data collection matures: revenue per labour hour during peak, average transaction value during peak versus non-peak, waste during peak (coffee, milk, food), and staff feedback on rush difficulty (a simple 1-5 rating from each team member after the rush). Conduct a binding constraint analysis: time each step of the drink production process (order taking, payment processing, espresso extraction, milk steaming, assembly, handoff) an...

**Key deliverables:** Peak Performance Metrics Definition document; Daily Peak Data Collection Sheet (tally and observation template); Weekly Peak Performance Dashboard; Binding Constraint Analysis template

### L3 — Leadership Maintenance (Days 61–90)

_Turning standards into leadership behaviour and accountability. Monthly leadership routines, quarterly system audits, KPI ownership, escalation rules, and corrective action pathways._

| Block | Strategy | Priority |
|-------|----------|----------|
| **B085** | Peak Staffing & Rush Management | STANDARD |
| **B088** | Peak Staffing & Rush Management | STANDARD |

**B085 -- Peak Staffing Model**
*Creates a data-driven staffing model that matches team deployment to customer demand patterns throughout the day, ensuring the right number of people with the right skills are on the floor at the right times — particularly during peak trading periods.*

CULTURE & EXCELLENCE (8+ weeks). Implement real-time staffing adjustments: if Monday morning transaction data shows a 20% dip compared to the model, consider sending a team member home early (with their agreement) to protect margins. Conversely, if an unexpected event drives higher-than-modelled demand, activate the call-out list from B079 to bring in additional cover. Analyse the relationship between staffing levels and customer metrics: does a third barista during the morning rush measurably improve average wait time and customer satisfaction? Use this data to justify staffing investments...

**Key deliverables:** Hourly Transaction Analysis chart by day of week; Daily Staffing Template by role and hour; Staffing Matrix for each day type with optimal and minimum levels; Labour Cost Tracking template (weekly revenue vs labour cost)

**B088 -- Peak Performance Analysis**
CULTURE & EXCELLENCE (8+ weeks). Introduce advanced analytics: track performance by day of the week, by season, by weather condition, and by staffing configuration to build a predictive model of rush performance. Calculate the revenue impact of service speed improvements — if reducing average service time by 30 seconds prevents two customer walkaways per rush, what is the annual revenue gain? Use this to build the business case for operational investments. Benchmark peak performance against specialty coffee industry standards and other venues in the local area if data is available through o...

**Key deliverables:** Peak Performance Metrics Definition document; Daily Peak Data Collection Sheet (tally and observation template); Weekly Peak Performance Dashboard; Binding Constraint Analysis template

---
## Verification Brief — Next Visit

**Kavos Namai** | Generated from Round 1 analysis

**Recommended visit timing:** Thursday-Saturday, 10:00-14:00 (peak appointments)

### Confirm or Deny

**Standard:**
- [ ] Check: is there a written process? Where is it stored?
- [ ] Ask the team: 'How does this work here?' — compare answers
- [ ] Observe: does management follow the same rules?
- [ ] Who is accountable? Do they know it?

### Photo Shot List

- [ ] Styling stations during peak appointments
- [ ] Staff positioning at midday peak
- [ ] Station reset between clients (before/after)
- [ ] Colour mixing / back bar area
- [ ] Staff notice board / communication area
- [ ] Washroom and basin area condition during peak

---

> **6-Month Trajectory:** If nothing changes in 6 months, Kavos Namai will either receive an EHO improvement notice triggered by the allergen non-compliance (S002), lose its core regulars to accumulated frustration with wait times and dirty tables, or both — and because there is no operational structure to absorb either crisis, the owner will have no documented systems to show an inspector or no trained team capable of holding service quality while they deal with the fallout.

This plan is progress, not perfection. Start with L1. Let it settle. Then build.

*OIS v3 — MPCM Operational Intelligence System | 2026-03-04 | Round 1*