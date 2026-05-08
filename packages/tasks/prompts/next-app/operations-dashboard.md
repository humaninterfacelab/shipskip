Build a complex, information-dense operations dashboard for a modern software operations platform named **OpsCore**.

The dashboard should feel like a real internal operations tool used by technical operators during a busy shift. It should be dense, scannable, structured, and highly functional — not a marketing page, landing page, or simplified analytics mockup.

Do not describe the product as generic in the UI or visible copy. The interface should present **OpsCore** as a complete, named product with its own operational identity.

---

# Overall Design Direction

Create a high-quality operational dashboard with:

- strong information hierarchy
- compact layouts
- layered panels
- crisp borders
- sticky regions
- split panes
- compact controls
- tiny chart-like visuals
- dense tables
- nested status panels
- clear severity indicators
- refined hover, selected, disabled, and focus states

The interface should feel like a mature internal tool for monitoring systems, incidents, deployments, workflows, capacity, SLA risk, and operational activity.

Prioritize:

- density
- clarity
- scanability
- technical realism
- accessible status communication
- responsive behavior
- polished visual systems

Avoid:

- marketing-style hero sections
- oversized cards with little content
- generic SaaS dashboards
- decorative-only charts
- empty whitespace that reduces usefulness

---

# Theme & Color System

Support both **light mode** and **dark mode**.

Include a visible light/dark mode toggle in the header.

## Dark Mode Palette

Use an industrial olive and amber operations palette:

- Background: deep charcoal green
- Panels: black-olive
- Raised surfaces: dark olive graphite
- Borders: muted brass
- Primary text: warm off-white
- Secondary text: desaturated sage
- Active states: amber
- Success states: acid green
- Critical states: vermilion
- Warning states: amber / brass
- Info states: pale blue

## Light Mode Palette

Use a warm, utilitarian operations palette:

- Background: warm limestone
- Panels: bone
- Raised surfaces: ivory / pale stone
- Borders: olive-gray
- Primary text: deep forest
- Secondary text: muted moss
- Active states: amber
- Success states: rich green
- Critical states: clay red
- Warning states: amber / ochre
- Info states: steel blue

## Severity Rules

Use severity colors consistently across the dashboard.

Every severity state must pair color with:

- text label
- icon or shape
- badge treatment
- status wording

Color must never be the only signal.

---

# Layout Requirements

## Desktop

On desktop, prioritize density with:

- sticky top header
- sticky sidebar
- compact command strip
- multi-column dashboard grid
- split-pane detail layout
- scrollable tables
- nested panels
- right-side detail panel
- dense cards and compact controls

## Mobile

On mobile, preserve all information but restructure into:

- collapsible grouped sections
- horizontally scrollable cards
- scrollable tables
- stacked panels
- compact navigation
- usable touch targets
- readable typography

The dashboard must remain functional and understandable on smaller screens.

---

# Required Sections

## 1. Header

Include:

- Product name: **OpsCore**
- Workspace switcher set to: **Core Workspace**
- Search field placeholder: **Search systems, owners, or incidents**
- Date range control: **Last 24 hours**
- Notifications control
- Light/dark mode toggle
- Primary action button: **Create workflow**

Header should feel compact, sticky, and operational.

---

## 2. Sidebar Navigation

Create a sidebar with these groups:

### Monitor

- Overview
- Systems
- Incidents

### Operate

- Workflows
- Deployments

### Analyze

- Reports

### Settings

- Team
- Integrations

Include:

- active navigation state
- hover states
- compact icons or icon-like CSS shapes
- keyboard focus states
- collapsed/mobile behavior

---

## 3. Command Strip

Add a compact command strip directly under the header.

Include:

- Environment: **Production**
- Region filter: **All regions**
- Active filters
- Refresh status: **Updated 42s ago**
- On-call engineer
- Escalation policy

The command strip should feel like a live operational control bar.

---

# 4. Overview Metrics

Create a primary metrics row with these indicators:

| Metric          |  Value | Status        |
| --------------- | -----: | ------------- |
| System health   | 99.94% | Stable        |
| Open incidents  |      7 | 2 critical    |
| Queue depth     |  1,284 | Down 8%       |
| Avg response    | 184 ms | Within target |
| Automation runs |  42.8k | Today         |
| Error budget    |    71% | Remaining     |

Use compact cards with:

- status badges
- trend indicators
- severity-aware styling
- tiny supporting metadata
- hover/focus states

---

# 5. Secondary Metrics

Add smaller metric cards for:

- p95 latency: **412 ms**
- failed jobs: **38**
- retries: **612**
- active users: **18.6k**
- deployments: **4**
- SLA risk: **3 services**
- data lag: **2m 14s**
- runbook coverage: **86%**

These should be more compact than the primary metrics and arranged in a dense responsive grid.

---

# 6. Main Analytics Area

Create chart-like visuals using **HTML/CSS only**.

Do not use charting libraries.

Include visual panels for:

- throughput
- latency
- workflow completion
- error rate
- saturation
- retry volume
- regional traffic

Use:

- tiny bars
- sparklines made with CSS/SVG
- stacked indicators
- dot plots
- timeline strips
- mini heatmaps
- compact legends
- axis labels where useful

Charts should feel realistic and information-rich.

---

# 7. Service Health Grid

Create compact service cards for:

- API Gateway
- Auth Service
- Billing Jobs
- Worker Pool
- Database Cluster
- Notification Service
- Search Index
- File Processor

Each card should include:

- service name
- status badge
- small health indicator
- region or owner metadata
- latency/error/load snippet
- hover state
- selected state

---

# 8. Activity Feed

Include these events:

1. **Critical incident opened** for **Auth API latency spike**
2. **Workflow completed** for **Nightly reconciliation**
3. **Deployment finished** for **Frontend release 2.8.4**
4. **Warning threshold reached** for **Background job queue**
5. **Runbook attached** for **Database failover drill**
6. **Escalation acknowledged** by **Jordan Lee**

Design as a compact event feed with:

- timestamps
- severity markers
- event type labels
- linked entity names
- subtle timeline connector
- unread/high-priority states

---

# 9. Incident Queue Table

Create an incident queue table with columns:

- ID
- Severity
- Title
- Owner
- Impact
- Started
- SLA
- Status

Rows:

- **INC-1042** — Auth API latency spike
- **INC-1041** — Background job queue
- **INC-1040** — Webhook delivery failures
- **INC-1039** — Search freshness delay
- **INC-1038** — Notification retries

Use realistic placeholder values for owner, impact, started time, SLA, and status.

Include:

- severity badges
- row hover
- selected row state
- compact action affordances
- responsive horizontal scrolling

---

# 10. Resource / Status Table

Create a detailed resource status table.

Rows:

- API Gateway
- Auth Service
- Worker Pool
- Database Cluster
- Notification Service
- Search Index
- Cache Layer
- Webhook Dispatcher

Columns:

- System
- Owner
- Status
- Region
- Load
- Error rate
- p95
- Last deploy
- Last check
- Action

Use compact progress bars, status labels, and action buttons.

---

# 11. Workflow Runs Table

Create a workflow runs table.

Rows:

- Nightly reconciliation
- Usage aggregation
- Invoice sync
- Webhook replay
- Access review
- Search reindex

Columns:

- Workflow
- Schedule
- Last run
- Duration
- Success rate
- Retries
- Queue
- Owner

Use:

- compact status badges
- success-rate indicators
- queue indicators
- retry counts
- hover states

---

# 12. Deployment Panel

Create a deployment panel showing:

- Release: **Frontend release 2.8.4**
- Deployer: **Casey Park**
- Commit: **a8f42c1**
- Rollout: **72%**
- Checks
- Canary status
- Rollback action

Include:

- rollout progress bar
- check list
- canary status badge
- rollback button
- disabled/confirm-style state if appropriate

---

# 13. On-Call Panel

Create an on-call panel with:

- Primary: **Jordan Lee**
- Secondary: **Priya Shah**
- Current shift: **08:00–16:00**
- Escalation level
- Open pages
- Handoff notes

Design it as an operational readiness card.

---

# 14. Capacity Panel

Create a compact capacity panel with utilization bars for:

- CPU
- Memory
- Queue
- Connection pool
- Storage
- Worker utilization

Each bar should include:

- label
- value
- severity-aware visual state
- compact supporting metadata

---

# 15. SLA / Error Budget Panel

Create a panel with burn-rate indicators for:

- API
- Jobs
- Search
- Notifications

Include:

- remaining budget
- burn rate
- risk state
- compact visualization
- severity labels

---

# 16. Regional Status Panel

Create a regional status panel for:

- US-East
- US-West
- EU-Central
- AP-South

Each region should show:

- traffic
- latency
- incident count
- status badge

---

# 17. Detail Panel

Create a persistent detail panel for the selected item:

## Selected item

**Auth API latency spike**

Include:

- Owner: **Platform Team**
- Status: **Investigating**
- Priority: **Critical**
- Impacted systems
- Timeline
- Notes
- Linked alerts
- Related deploys

Actions:

- Assign owner
- Open runbook
- Mute alert
- Create follow-up
- Mark resolved

The detail panel should feel like a working incident command pane.

---

# 18. Notes Section

Include these notes:

- Latency began after traffic shifted to v2 auth middleware
- No data loss detected
- Customer-facing errors remain below threshold
- Rollback path validated

Design as compact operator notes with:

- timestamps or author metadata
- pin/priority affordances
- subtle separators

---

# 19. Footer / Status Bar

Add a footer or bottom status bar with:

- keyboard shortcuts
- connection status
- current user
- audit log link

It should feel like part of a real internal operations product.

---

# Interaction Requirements

Include states for:

- hover
- selected
- disabled
- active
- alert
- focus-visible
- loading/refreshing where appropriate

These states must work in both light and dark modes.

Include:

- accessible labels for controls
- semantic tables and lists
- meaningful button labels
- keyboard navigability
- visible focus rings
- non-color severity cues

---

# Technical Requirements

- Use semantic HTML
- Use CSS-driven visuals
- Support light and dark modes
- Make the layout fully responsive
- No external image dependencies
- Do not use charting libraries
- Do not use icon libraries unless already available in the template
- Use CSS, SVG, or simple inline shapes for charts and icons
- Keep the product generic and industry-neutral

---

# Final Quality Bar

The finished dashboard should feel:

- operationally realistic
- dense but readable
- polished but not decorative
- technical but approachable
- information-packed but scannable
- suitable for a real internal software operations team

It should look like a serious production monitoring and operations surface used by experienced technical operators.
