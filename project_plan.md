# DouseFire — AI-Powered Fire Inspection Platform

## 1. Project Description
An AI-assisted mobile inspection platform that replaces clipboards, PDFs, and manual forms for fire protection technicians. Technicians walk buildings with a guided NFPA-compliant checklist, capture photos/voice notes, and receive AI-suggested findings — then deliver compliant reports instantly instead of re-entering everything back at the office.

**Target Users**: Fire protection technicians (field), managers (oversight), administrators (system config), customers (portal)

**Brand Identity**: Deep navy (`#0a1628`), bright gold (`#F5C518`), and cyan (`#67C8D8`) accents. Montserrat font family.

## 2. Industry Scope — Inspection Types
| # | Type | NFPA Standard | Status |
|---|------|--------------|--------|
| 1 | Fire Alarm Systems | NFPA 72 | ✅ Built |
| 2 | Fire Sprinkler Systems | NFPA 25 | ✅ Built |
| 3 | Fire Extinguishers | NFPA 10 | ✅ Built |
| 4 | Standpipes & Hydrants | NFPA 25 | ✅ Built |
| 5 | Fire Hoses | NFPA 1962 | ✅ Built |
| 6 | Backflow Preventers | NFPA 25 | ✅ Built |
| 7 | Fire Pumps | NFPA 20 | ✅ Built |
| 8 | Kitchen Suppression Systems | NFPA 17A | ✅ Built |
| 9 | Emergency Lighting | NFPA 101 | ✅ Built |
| 10 | Smoke Control Systems | NFPA 92 | ✅ Built |
| 11 | Elevator Recall / Fire Interface | NFPA 72 | ✅ Built |
| 12 | Monitoring Systems | NFPA 72 | ✅ Built |

## 3. Core Inspection Workflow
Technician walks building → App guides the checklist → AI auto-fills common findings → Photos, video & voice notes attached → Deficiency report generated → NFPA-compliant report delivered instantly.

## 4. Software Architecture Modules
| Module | Purpose | Status |
|--------|---------|--------|
| Building / Customer | Property info & history | ✅ Built (customers table + page) |
| Inspection Types | Full NFPA coverage | ✅ All 12 built (checklists) |
| Dynamic Checklists | NFPA-compliant, rules-based | ✅ Built |
| Deficiency Tracking | Logged problems with severity | ✅ Built |
| Photo Uploads | Visual evidence per item | ✅ Built |
| Voice-to-Text | Faster field notes | 🔜 Future |
| AI Assistant | Suggest notes, grammar check, missing fields | ✅ Built |
| Auto Report Generator | Instant NFPA-compliant reports | ✅ Built (HTML + CSV) |
| Signatures | Technician & customer sign-off | ✅ Built |
| Scheduling | Recurring inspection management | ✅ Built |
| Compliance Tracking | Open & overdue deficiency monitoring | ✅ Built |
| Device Inventory | Every detector, head, valve tracked | ✅ Built (assets with customer assignment) |
| QR / Barcode Scanning | Instant device identification | 🔜 Future |
| Offline Mode | Critical — buildings frequently lose signal | ✅ Built |
| Customer Portal | Reports, invoices, and history | ✅ Built |
| Time & Materials | Work order cost tracking with price book | ✅ Built |
| Price Book | Standard parts/labor rates | ✅ Built |
| Phone System | Tech-to-customer calling | ✅ Built (SignalWire) |
| Proposals / Quotes | Deficiency → customer quote pipeline | ✅ Built |
| Proposals Templates | Pre-built branded proposal templates | ✅ Built |
| Work Orders | Track repair jobs, assign techs | ✅ Built |
| Invoicing | Line-item invoices with tax, status | ✅ Built |
| Dynamic Dispatching | Real-time tech workload balancing, drag-to-assign | ✅ Built |
| Map View | Google Maps embed with inspection site markers | ✅ Built |
| Automated Reminders | Edge function for due/overdue inspection notifications | ✅ Built |
| Offline Mode | PWA service worker + IndexedDB sync for field techs | ✅ Built |

## 5. Page Structure
- `/login` - Login page (role-based: technician, manager, admin)
- `/` - Main dashboard (key stats, upcoming inspections, alerts, recent activity)
- `/inspections` - Inspection list with filters and search
- `/inspections/new` - Create new inspection (asset picker + customer picker)
- `/inspections/:id` - Inspection detail view (with customer info + call button)
- `/inspections/:id/perform` - Technician's field checklist workspace
- `/schedule` - Weekly calendar view
- `/assets` - Asset/inventory management
- `/assets/:id` - Asset detail with inspection history
- `/customers` - Customer/building management (CRUD)
- `/customers/:id` - Customer detail with inspection history, assets overview
- `/customers/:id/schedule` - Batch inspection scheduling (auto-recommend due items, multi-select assets, manual add)
- `/reports` - Report generation (templates + history + download)
- `/compliance` - Compliance standards tracking
- `/deficiencies` - Deficiency tracking & management (severity, status, cost, inspector actions)
- `/proposals` - Proposal/quote management (draft → send → approve, line-items, tax)
- `/work-orders` - Work order tracking (priority, assign, start → complete, costs)
- `/invoices` - Invoice management (draft → send → pay, line-items, tax, overdue tracking)
- `/users` - User management (admin: create, edit, delete, change password)

## 6. Data Model

### inspections (expanded)
| Field | Type | Description |
|-------|------|-------------|
| batch_id | uuid | Groups inspections created together in one scheduling session |
| checklist_data | jsonb | Full checklist items with results, values, notes |
| deficiency_ids | uuid[] | Linked deficiencies (future) |
| photo_urls | jsonb | Photos per checklist item (future) |
| signature_tech | text | Technician signature (future) |
| signature_customer | text | Customer signature (future) |

### deficiencies (planned)
| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Primary key |
| inspection_id | uuid | FK → inspections |
| asset_id | uuid | FK → assets |
| checklist_item_id | text | Which item failed |
| severity | text | low / medium / high / critical |
| description | text | Deficiency description |
| corrective_action | text | Recommended fix |
| status | text | open / in_progress / resolved |
| photo_urls | jsonb | Visual evidence |
| created_at | timestamptz | When logged |

## 7. Backend / Third-party Integration Plan
- Supabase: Needed for authentication, database, and storage (connected)
- Shopify: Not needed
- Stripe: Connected for payments via edge function. Supports payment intents, setup intents (card saving), saved card charging, and card management.
- **Edge Function Security (2026-06-16)**: All edge functions now require JWT authentication.
  - `manage-users`: JWT + admin role check
  - `stripe-payments`: JWT required
  - `signalwire-call`: JWT required (IVR webhook bypasses auth — called by SignalWire)
  - `send-payment-link`: JWT required
  - `send-inspector-notifications`: JWT required
  - `automated-reminders`: JWT required for `trigger`/`stats`; `scan` bypasses auth (cron-triggered)
  - `audit-log`: JWT required (already had it)
  - `recurring-inspections`: JWT required (already had it)

## 8. Development Phase Plan

### Phase 1: Authentication + Dashboard Shell ✅ COMPLETE
- Goal: Set up login page and main dashboard with sidebar navigation
- Deliverable: `/login` page, `/` dashboard with stats, sidebar nav, responsive layout
- Status: Complete with DouseFire branding (navy, gold, cyan)

### Phase 2: Inspection Management ✅ COMPLETE
- Goal: Full inspection CRUD with list and detail views
- Deliverable: `/inspections` list with search/filters/table, `/inspections/:id` detail with findings/actions
- Status: Complete with status badges, rating badges, asset sidebar

### Phase 3: Schedule & Calendar ✅ COMPLETE
- Goal: Visual calendar for inspection scheduling
- Deliverable: `/schedule` page with weekly calendar grid showing inspections by day
- Status: Complete with color-coded status blocks and week/day view toggle

### Phase 4: Asset Management ✅ COMPLETE
- Goal: Asset inventory with history tracking
- Deliverable: `/assets` list with filters, `/assets/:id` detail with inspection history table and stats
- Status: Complete with overdue highlighting and pass rate calculation

### Phase 5: Reports & Compliance ✅ COMPLETE
- Goal: Report generation and compliance tracking
- Deliverable: `/reports` with templates + history tabs, `/compliance` with overview/standards/issues tabs
- Status: Complete with NFPA standards table, open issues tracker, compliance progress bars

### Phase 6: Backend Integration ✅ COMPLETE
- Goal: Connect to Supabase for real data, user auth, and persistence
- Deliverable: Full database schema, RLS policies, Supabase client, live data queries across all pages, Supabase Auth integration
- Status: Complete

### Phase 7: User Management ✅ COMPLETE
- Goal: Admin can create, manage, and delete user accounts
- Deliverable: `/users` page with full CRUD, role filter, search, access control
- Status: Complete with admin-only sidebar link, create/delete modals, role-based visibility

### Phase 8: New Inspection Form ✅ COMPLETE
- Goal: Create new inspection workflow for technicians
- Deliverable: `/inspections/new` form with asset picker (searchable dropdown), inspection type selector, scheduled date picker, status toggle, rating selector, findings textarea
- Status: Complete with validation, Supabase insert, and redirect to inspections list on success