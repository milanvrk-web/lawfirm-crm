
## User Login & Team Accounts (cancelled — user chose access code approach instead)

- [x] ~~Add login page with Manus OAuth sign-in button~~ (cancelled)
- [x] ~~Gate all app routes behind authentication~~ (cancelled)
- [x] ~~Show logged-in user name and avatar in sidebar footer~~ (cancelled)
- [x] ~~Add logout button in sidebar~~ (cancelled)
- [x] ~~Protect all tRPC procedures with protectedProcedure~~ (cancelled)
- [x] ~~Add Team Members page (admin only)~~ (cancelled)
- [x] ~~Show role badge (Admin / Staff) in sidebar~~ (cancelled)

## Access Code Lock Screen

- [x] Add ACCESS_CODE secret (server-side env variable)
- [x] Add tRPC procedure to verify the access code server-side
- [x] Build lock screen UI (logo, code input, submit button)
- [x] Store verified session in sessionStorage so users don't re-enter on every visit
- [x] Gate all app routes behind the lock screen

## Case Type Revenue Breakdown

- [x] Compute revenue per case type for the selected month from payments
- [x] Add horizontal bar chart (Recharts) showing revenue by case type
- [x] Add summary table with case type, payment count, total revenue, % of total
- [x] Place section below the Weekly Revenue chart on the Dashboard

## Calendar Revenue Heatmap

- [x] Compute daily revenue totals from monthPayments
- [x] Build calendar grid component (Sun–Sat, correct day offsets)
- [x] Color-code each day cell by revenue amount (none/low/mid/high)
- [x] Show day's total revenue on hover/click with payment breakdown popover
- [x] Add "Calendar View" toggle button on the Dashboard below the month selector

## Installment Plan Tracker

- [x] Add installment_plans and installment_items tables to schema
- [x] Create DB migration for new tables
- [x] Add tRPC procedures: create/get/update/delete plan, mark installment paid/unpaid
- [x] Build installment plan tab in Lead Detail panel with schedule grid
- [x] Show collected vs outstanding progress bar per plan
- [x] Auto-generate installment schedule from total + count + start date

## Auto-Link Installment Payments

- [x] When a payment is created for a lead with an active plan, auto-mark the earliest unpaid installment as paid
- [x] When a payment is deleted, unmark the linked installment (if any) back to unpaid
- [x] Add linkedInstallmentId column to payments table to track the link
- [x] Show a "Linked to installment #N" badge on the payment row in the Payments tab
- [x] Write tests covering auto-link and auto-unlink logic

## Overdue Installment Alert Card

- [x] Add tRPC query to fetch all overdue installment items with lead info
- [x] Add alert card to Dashboard showing overdue count and per-lead breakdown
- [x] Clicking a lead name in the alert opens the Lead Detail panel on the Payments tab
- [x] Card is hidden when there are no overdue installments

## Bulk Reschedule Overdue Installments

- [x] Add bulkRescheduleOverdueInstallments tRPC mutation (updates all overdue items to today's date)
- [x] Add "Reschedule All to Today" button in the overdue installment alert strip on Dashboard
- [x] Show loading spinner on button while mutation is in progress
- [x] Refresh overdue installments query after mutation completes
- [x] Add test for bulk reschedule mutation

## CEO Morning Briefing Widget

- [x] Add collapsible "Morning Briefing" card at top of Dashboard showing yesterday's revenue, overdue follow-ups count, overdue payments count, and leads added yesterday
- [x] Show a color-coded status (green/yellow/red) for each metric based on thresholds
- [x] Persist collapsed/expanded state in localStorage

## Lead Age Indicator

- [x] Add age badge to each lead card showing days since creation (green <7d, yellow 7–14d, red >14d)
- [x] Add age column/badge to Leads page list view
- [x] Add "Stale Leads" count to Dashboard stat cards (leads with no activity >14 days)

## Lost Lead Reason Tracking

- [x] Add lostReason field to leads table (DB migration)
- [x] When marking a lead as Lost, show a modal requiring a reason (price, competitor, not qualified, no response, other)
- [x] Show lost reason on lead detail Info tab
- [x] Add Lost Reasons breakdown chart to Dashboard (pie or bar)

## Kanban Board View

- [x] Add a "Pipeline" page with a Kanban board layout (columns: New Lead, Consulted, Retained, Closed/Lost)
- [x] Each card shows lead name, case type, days old, retainer booked amount
- [x] Drag-and-drop between columns updates lead stage in DB
- [x] Add Pipeline page to sidebar navigation
- [x] Show total pipeline value (sum of retainerBooked) per column footer

## Installments Due This Week

- [x] Add tRPC query getInstallmentsDueThisWeek (unpaid items with dueDate within next 7 days)
- [x] Add a "Due This Week" amber alert strip on Dashboard above the overdue strip
- [x] Show lead name, amount, and due date for each item
- [x] Clicking a lead name opens Lead Detail panel on Installments tab

## Retainer Balance Tracker

- [x] In Lead Detail panel Payments tab, show retainer booked vs. total collected vs. outstanding balance
- [x] Color-code outstanding balance (green = fully paid, yellow = partially paid, red = nothing collected)
- [x] Add "Outstanding Balance" column to Payments page table

## Revenue Velocity Chart

- [x] Compute cumulative daily revenue for the selected month
- [x] Add a line chart showing actual cumulative revenue vs. ideal pace line (target/days × day number)
- [x] Place below the existing weekly bar chart on Dashboard

## Month-over-Month Comparison

- [x] Add a comparison row below the stat cards showing this month vs. last month for: revenue, leads, conversions
- [x] Show % change with up/down arrow and color (green = improvement, red = decline)

## Lead Source ROI

- [x] Add a "Lead Sources" section to Dashboard showing: source name, lead count, conversion count, conversion %, total revenue
- [x] Sort by total revenue descending
- [x] Show for the selected month

## Pipeline Value Summary

- [x] Add a "Pipeline Value" stat card showing total retainerBooked across all active (non-lost, non-closed) leads
- [x] Show breakdown by stage in a small table below the card

## Weekly Follow-Up Digest

- [x] Add a "This Week's Follow-Ups" section to the Follow-Ups page showing all tasks due Mon–Sun of current week grouped by day
- [x] Highlight today's tasks with a gold border
- [x] Show completion count vs. total per day (e.g., "3 / 5 done")

## Overdue Follow-Up Escalation

- [x] Add a red escalation badge on follow-up tasks that are >24h overdue (not just past due date)
- [x] Add overdue count badge to the Follow-Ups sidebar nav item
- [x] Show escalated tasks at the top of the Follow-Ups list

## Stale Leads Drawer

- [x] Build StaleLeadsDrawer component showing all stale leads with last activity date and days since last activity
- [x] Each stale lead row shows: name, case type, stage, days stale, last activity date
- [x] Inline "Assign Follow-Up" form per lead: title, due date, note fields with a Save button
- [x] Saving creates a follow-up task via addFollowUp and shows a success toast
- [x] Make Stale Leads stat card on Dashboard clickable to open the drawer
- [x] Drawer closes on overlay click or Escape key

## Bug Fixes

- [x] Fix lead notes: notes save successfully but do not display in the Lead Detail panel notes tab

## Delete Note Feature

- [x] Add deleteLeadNote DB helper in server/db.ts
- [x] Add leads.deleteNote tRPC mutation in server/routers.ts
- [x] Add trash icon button on each note row in LeadDetailPanel (visible on hover)
- [x] Clicking trash shows inline confirmation ("Delete?" Yes/Cancel) to prevent accidental deletion
- [x] On confirm, call deleteNote mutation, invalidate getNotes query, show toast

## Team Members Feature

- [x] Add crmMembers table to drizzle/schema.ts (id, name, role, color, createdAt)
- [x] Run pnpm db:push to migrate the new table
- [x] Add getCrmMembers, createCrmMember, deleteCrmMember DB helpers in server/db.ts
- [x] Add members tRPC router (list, add, remove) in server/routers.ts
- [x] Build Members page (list members, add form, remove button)
- [x] Add Members nav item to sidebar
- [x] Add active member selector in sidebar footer (persisted in localStorage)
- [x] Show "Who are you?" prompt on first load if no active member is set
- [x] Add authorName field to lead_notes table (DB migration)
- [x] When saving a note, attach the active member's name as authorName
- [x] Show author name badge on each note row in LeadDetailPanel
- [x] Add authorName to follow-up tasks table and show it on task cards

## Team Members — Gap Fixes

- [x] Show assignedTo badge on follow-up task cards in the main Follow-Ups page
- [x] Pass active member name in StaleLeadsDrawer addFollowUp calls

## Daily Close Attribution

- [x] Add closedBy column to daily_closes table in schema.ts
- [x] Run DB migration to add closedBy column (via SQL)
- [x] Update upsertDayClose DB helper to include closedBy in upsert set
- [x] Update dayCloses.close tRPC input schema to accept optional closedBy
- [x] Add closedBy to DayClose type in store.ts and normalizeDayClose in CRMContext
- [x] Pass active member name when submitting a daily close in CloseDay.tsx
- [x] Show closedBy badge (user icon + name) in the Day Closed confirmation strip
- [x] Update toast message to include member name when closing

## Follow-Up Bucket

- [x] Build FollowUpBucket page showing all Consulted/post-consultation leads with their pending follow-up task
- [x] Each row shows: lead name, case type, days since consultation, current follow-up due date, status badge
- [x] Inline quick-push buttons: +1 Day, +3 Days, +7 Days, and a custom date picker
- [x] Pushing a date updates the follow-up task due date in the DB and refreshes the row immediately
- [x] If a lead has no follow-up task yet, show an "Add Follow-Up" button that creates one inline
- [x] Sort by most overdue / soonest due first
- [x] Add "Bucket" nav item to sidebar with a badge count of overdue/due-today items
- [x] Auto-create a follow-up task when a lead's stage changes to "Consulted" (if none exists)
- [x] Show a "Retained" green badge on leads that have been retained so they can be dismissed from the bucket
- [x] Add a "Mark as Retained" quick action button per row

## Close History Table

- [x] Add Close History table at the bottom of CloseDay page showing last 30 closes
- [x] Columns: Date, New, Existing, Total, Closed By, Time
- [x] Highlight the currently selected date row in gold
- [x] Show Closed By as a green badge with user icon
- [x] Hidden when no closes have been recorded yet

## Follow-Up Stage UX Improvements

- [x] Replace +1d/+3d/+7d push buttons on Follow-Up Kanban cards with an inline date picker input
- [x] Auto-create a follow-up task when a lead is dragged/moved to the Follow-Up stage (same as Consultation stage)
- [x] If a follow-up task already exists for the lead, update its due date when the date picker changes

## Drag-to-Retained Conversion

- [x] When a lead is dragged to the Retained column, open the Convert modal instead of silently moving the stage
- [x] Convert modal pre-fills case number from the lead and shows retainer/downpayment/notes fields
- [x] On confirm, update stage to Retained and log the downpayment payment (same as clicking Convert button)
- [x] On cancel, do not move the lead

## Consultation Fee Lifecycle Tracking

- [x] Add consultationFee field to Lead type in store.ts (optional number)
- [x] Add consultationFee column to leads table in drizzle/schema.ts and run DB migration
- [x] Add "Consultation Fee" input to Add Lead form (optional, defaults to 0)
- [x] When a lead is moved to Consultation stage (drag or edit), auto-log the consultation fee as a payment (receivedFor: "Consultation Fee") if consultationFee > 0 and not already logged
- [x] Show consultation fee badge on Consultation and Follow-Up stage Kanban cards
- [x] Show quoted amount on Consultation and Follow-Up stage cards
- [x] In the Lost Reason modal, show a summary: consultation fee collected and quoted retainer amount
- [x] In the Lead Detail panel Info tab, show consultation fee and quoted amount clearly

## Onboarding Stage

- [x] Add "Onboarding" to LeadStage enum in store.ts (between Retained and Lost)
- [x] Add "Onboarding" to leads.stage MySQL enum in drizzle/schema.ts and run DB migration
- [x] Add "Onboarding" to LeadStageEnum in routers.ts
- [x] Add "Onboarding" to all stage arrays/maps in Leads.tsx (STAGES, byStage, stageValue, columns)
- [x] Add onboarding_checklist table to schema: id, leadId, step (enum), completedAt, completedBy
- [x] Add tRPC procedures: onboarding.getByLead, onboarding.toggleStep
- [x] Add CRMContext handlers: onboardingSteps, toggleOnboardingStep
- [x] Onboarding Kanban card shows mini checklist with 4 steps: Consultation Booked, Case Notes Created, Task Added in Cerenade, Task Added in Planner
- [x] Each step shows a checkbox; clicking toggles completion and records who completed it and when
- [x] Progress ring or bar on card showing X/4 steps done
- [x] Lead Detail panel Onboarding tab shows the same checklist with timestamps and completed-by info
- [x] When all 4 steps are done, card shows a green "Onboarding Complete" badge
- [x] Dragging a lead to Onboarding from Retained does NOT open Convert modal (already retained)

## Pipeline Editor (Self-Service Stage Management)

- [x] Add pipeline_stages table: id, name, color, order, isDefault (bool), createdAt
- [x] Add stage_checklist_templates table: id, stageId, label, description, order
- [x] Seed default stages (New Lead, Consultation, Follow-Up, Retained, Onboarding, Lost) on first load if table is empty
- [x] Add DB helpers: getPipelineStages, createStage, updateStage, deleteStage, reorderStages
- [x] Add DB helpers: getStageChecklistTemplates, createChecklistTemplate, updateChecklistTemplate, deleteChecklistTemplate, reorderChecklistTemplates
- [x] Add tRPC router: pipeline.getStages, pipeline.createStage, pipeline.updateStage, pipeline.deleteStage, pipeline.reorderStages
- [x] Add tRPC router: pipeline.getChecklistTemplates, pipeline.createChecklistTemplate, pipeline.updateChecklistTemplate, pipeline.deleteChecklistTemplate
- [x] Build Pipeline Editor page accessible from sidebar Settings or a gear icon on the Leads page
- [x] Stage list: show all stages in order with drag-to-reorder, edit name/color, delete (with confirmation if leads exist in that stage)
- [x] Add Stage form: name, color picker (preset palette), position
- [x] Per-stage checklist section: show sub-task templates for that stage, add/edit/delete/reorder
- [x] Wire Kanban board to load stages dynamically from DB (replace hardcoded STAGES array)
- [x] Wire LeadCard checklist to use dynamic templates from DB (replace hardcoded ONBOARDING_STEPS)
- [x] Wire LeadDetailPanel Onboarding tab to show checklist for any stage that has templates
- [x] Preserve Onboarding-specific checklist behavior for the built-in Onboarding stage
- [x] Add Pipeline Editor link to sidebar navigation

## Inline Pipeline Management on Kanban Board

- [x] Add left/right reorder arrows on each Kanban column header to move stages
- [x] Add inline rename on column header (click name → input field → save on Enter/blur)
- [x] Add gear/settings popover on each column header with: color picker, add checklist item, manage checklist items, delete stage
- [x] Checklist items in popover: add new, edit label, delete
- [x] Add new stage button at the end of the Kanban columns (+ Add Stage)
- [x] Remove Pipeline Editor from sidebar nav (or hide it)

## Lead Card Checklist Progress Bar

- [x] Add a compact progress bar to every lead card showing X/N checklist steps completed for the current stage
- [x] Bar fills with the stage color; shows "X/N steps" label; hidden when stage has no checklist templates

## Delete Options for Clients and Day Closes

- [x] Add clients.delete tRPC procedure in routers.ts
- [x] Add dayCloses.delete tRPC procedure in routers.ts
- [x] Add delete DB helper for clients in server/db.ts
- [x] Add delete DB helper for day_closes in server/db.ts
- [x] Add delete button + confirmation dialog to Clients page
- [x] Add delete button + confirmation dialog to CloseDay history table

## Branding & Timezone
- [x] Rename app title to "Graham Immigration Law, PC"
- [x] Update subtitle to "Leads · Payments · Revenue"
- [x] Set PST (America/Los_Angeles) as default timezone for all date/time display throughout the app

## LeadDetailPanel Redesign

- [x] Remove tab navigation from LeadDetailPanel
- [x] Add Case Notes section at top (always visible, inline editable)
- [x] Add Follow-Ups & Activity section below notes (always visible)
- [x] Add collapsible Client Info section (collapsed by default)
- [x] Add collapsible Payment Plans section (collapsed by default)
- [x] Add collapsible Onboarding Checklist section (only for Onboarding stage, expanded by default)

## LeadDetailPanel Layout v2 — Client Info + Notes Combined

- [x] Merge Client Info and Case Notes into a single top section (always visible, no collapsible)
- [x] Show all lead fields (name, phone, case type, source, referred by, quoted amount, stage, date added, email) inline with the case notes textarea
- [x] Remove the separate Follow-Up task management from the panel (Add Follow-Up button, task list) — keep only activity/comments log
- [x] Activity/comments section below the combined info+notes section
- [x] Keep collapsible Payment Plans and Onboarding Checklist at the bottom

## Follow-Up System Redesign — One Thread Per Lead

- [x] Add `followUpDate` field to leads table (nullable date string) for the next follow-up due date
- [x] Add `leadNotes` table for the running comment thread (leadId, text, authorName, timestamp) — already existed as lead_notes
- [x] Remove multi-task follow-up model from the UI — replace with single thread per lead
- [x] Follow-Ups page: show leads with a followUpDate set, sorted by date (overdue first, then today, then upcoming)
- [x] Each lead row on Follow-Ups page: client name, phone, case type, stage, due date, latest comment preview
- [x] Inline expand on Follow-Ups page: full comment thread + add comment + push due date forward (via panel)
- [x] Lead Detail Panel activity section: replace follow-up task list with the single comment thread + set follow-up date
- [x] Auto-create thread when a lead is created (no manual task creation needed) — thread is implicit via lead_notes

## Complete Follow-Up Form (Mandatory)
- [x] Replace simple closing note prompt with a "Complete Follow-Up" modal requiring both: (1) closing note and (2) next follow-up date
- [x] Both fields are mandatory — cannot submit without filling both
- [x] On submit: save closing note to activity log, set new followUpDate on lead, auto-log "Follow-up completed on [date] by [name]" entry
- [x] Quick-pick date buttons (Tomorrow, 3 Days, 1 Week, 2 Weeks, 1 Month) in the modal
- [x] Apply to Follow-Ups page mark-done button

## Activity Timeline Improvements (May 2026)
- [x] Add activity type icons to the timeline in LeadDetailPanel (red alert for missed, green check for completed, blue note for regular)
- [x] Auto-generate "Follow-up missed" virtual entries when followUpDate is in the past with no completion note
- [x] Fix stale lead detection in StaleLeadsDrawer and Layout sidebar badge to use followUpDate and latest note timestamp instead of legacy followUps task system

## Member Select Screen on App Open
- [x] Build MemberSelectScreen component showing all team members as selectable cards
- [x] Show screen after access code unlock when no active member is set in localStorage
- [x] Each card shows member avatar (initials + color), name, and role
- [x] Clicking a card sets the active member and enters the app
- [x] Add "Switch Account" option in the sidebar footer to return to this screen

## Mandatory Note on Follow-Up Date Changes (Accountability)
- [x] Follow-Ups page: replace silent date picker with a Reschedule modal requiring a reason note before saving the new date
- [x] Lead Detail Panel: require a reason note when changing the follow-up date via the date picker (not on first-time set)
- [x] Kanban card date picker: require a reason note when changing an existing follow-up date
- [x] StaleLeadsDrawer: make the note field mandatory (not optional) when scheduling a follow-up date
- [x] Auto-log a system activity entry "Rescheduled to [date] by [member]: [reason]" in the lead's thread on every date change

## Reschedule Warning Badge on Kanban Cards
- [x] Add DB helper getRescheduleCountsForAllLeads — SQL COUNT of notes containing __RESCHEDULE__ grouped by leadId
- [x] Add tRPC procedure leads.getRescheduleCounts returning a map of leadId → count
- [x] In LeadCard, fetch reschedule count and show an amber warning badge when count > 2
- [x] Badge shows count and tooltip "Rescheduled N times — review this lead"

## PST Timezone Fix — Dates Showing One Day Behind for Non-PST Users

- [x] Audit all date display code — find every place that converts YYYY-MM-DD to a JS Date object causing local timezone shift
- [x] Create `formatDatePST(dateStr)` utility in timezone.ts that formats a YYYY-MM-DD string for display without local timezone conversion
- [x] Fix FollowUps.tsx — all follow-up date display calls
- [x] Fix LeadDetailPanel.tsx — follow-up date display and overdue check
- [x] Fix Leads.tsx (Kanban cards) — follow-up date display
- [x] Fix Payments.tsx — payment date display
- [x] Fix DailyClose.tsx — date display
- [x] Fix Dashboard.tsx — any date display in stats or charts
- [x] Verify all overdue/today comparisons use todayPST() not new Date()

## PST Date Picker Fix — Replace Native date Input (India Team Timezone Bug)
- [x] Build PSTDatePicker reusable component — pure YYYY-MM-DD string, no Date object, custom calendar grid
- [x] Replace all native <input type="date"> in FollowUps.tsx
- [x] Replace all native <input type="date"> in LeadDetailPanel.tsx
- [x] Replace all native <input type="date"> in Leads.tsx (Kanban card + KanbanRescheduleModal)
- [x] Replace all native <input type="date"> in Payments.tsx
- [x] Replace all native <input type="date"> in Dashboard.tsx
- [x] Replace all native <input type="date"> in CloseDay.tsx

## PST Time in Activity Log Entries
- [x] Add exact PST time to __RESCHEDULE__ and __DONE__ audit entries in LeadDetailPanel, FollowUps, and Leads
- [x] Update activity thread renderer to display the time alongside the date in reschedule and done badges

## Full PST Timezone Enforcement Audit
- [x] Audit every date display, comparison, and input across all pages for local-timezone leakage
- [x] Fix any remaining bare new Date(dateStr) calls without T12:00:00 anchor or PST timeZone option
- [x] Add PST clock display to sidebar so all users can see the current PST time/date at a glance
- [x] Update timezone stress tests to cover all fixed locations

## Contact Info Vanishing Bug Investigation
- [x] Audit drizzle schema for all contact fields (phone, email, address, etc.)
- [x] Audit tRPC leads.add and leads.update procedures for missing field mappings
- [x] Audit Add Lead form and Edit Lead form for missing field bindings
- [x] Audit CRM context optimistic update for field preservation
- [x] Fix CRMContext handleAddLead — add missing lostReason field
- [x] Add inline phone/email editing to LeadDetailPanel Info tab (Edit / + Add buttons)
- [x] Fix all identified bugs causing contact info to be dropped or overwritten

## Full App Stress Test & Bug Fix
- [x] Audit all sidebar navigation links and routes in App.tsx
- [x] Audit all button handlers, modals, and forms for broken wiring
- [x] Audit all data display for empty states and edge cases
- [x] Fix global search — lead results now navigate to /leads?lead=ID and auto-open the detail panel
- [x] Fix AllData page — Edit button now navigates to /leads?lead=ID instead of generic /leads
- [x] Fix Clients page — added View Lead button (ExternalLink icon) on each client card
- [x] Fix StaleLeadsDrawer — added View button that closes drawer and opens lead detail panel
- [x] Fix Leads.tsx — reads ?lead=ID URL param on mount and auto-opens the detail panel

## AI Lead Intelligence (Pipeline Health Analyzer)
- [x] Add intelligence tRPC router with analyzeLead, analyzeAll, getAll, getForLead procedures
- [x] Design JSON schema for AI response: priority tier (Hot/Warm/Cold/At-Risk), score 1-10, one-line headline, recommended next action, risk flags, reasoning
- [x] Build AI Intelligence page with four priority tier columns (Hot / Warm / At-Risk / Cold)
- [x] Each lead card shows: score bar, headline summary, recommended next action, risk flags, expandable reasoning
- [x] Add "Analyze Pipeline" button that triggers analysis for all active leads in batch
- [x] Add per-lead "Re-analyze" button (refresh icon) to refresh a single lead's score
- [x] Add AI Intelligence nav item to sidebar (Brain icon)
- [x] Cache analysis results in ai_lead_analysis DB table so the page loads instantly
- [x] Add last-analyzed timestamp and stale warning if analysis is >24h old
- [x] Add summary stat cards (count per tier) at top of page
- [x] Add unanalyzed leads notice with one-click Analyze Now button

## AI Priority Badge on Kanban Cards
- [x] Read cached AI analysis from trpc.intelligence.getAll on Leads page
- [x] Show Hot/Warm/At-Risk/Cold badge on each Kanban lead card
- [x] Badge color matches tier: Hot=red, Warm=amber, At-Risk=orange, Cold=slate
- [x] Tooltip shows AI score and headline on hover

## Nightly AI Chief of Staff Auto-Analysis
- [x] Install node-cron package
- [x] Add nightly cron job in server/_core/index.ts (08:00 UTC = midnight PST)
- [x] Cron job calls analyzeAll then generateBriefing automatically every night
- [x] Add POST /api/heartbeat/nightly endpoint for manual trigger

## AI Chief of Staff — Full Automation Suite
- [x] Nightly midnight PST schedule: auto re-analyze entire pipeline (node-cron)
- [x] Daily briefing generation: AI-generated report with executive summary, top actions, at-risk escalations, per-member task lists, pipeline health
- [x] daily_briefings table created in TiDB for briefing storage
- [x] generateBriefing, getLatestBriefing, getBriefingHistory tRPC procedures added
- [x] AI Chief of Staff page: two-tab layout (Daily Briefing / Pipeline)
- [x] Briefing tab: executive summary, top priority actions, at-risk escalations, per-member task lists
- [x] Manual "Generate Briefing" button for on-demand reports
- [x] Unassigned follow-up flagging: AI flags leads with no assigned team member (shown in briefing as orange warning card)
- [ ] Per-team-member daily task list view (each person sees their own prioritized to-do)
- [ ] At-risk escalation: AI sends owner notification when a Hot lead has no activity for 3+ days
- [x] Briefing history: view past daily briefings on the AI Chief of Staff page (History tab)
- [x] AI badge on Follow-Ups page rows (AI·Hot / AI·Warm / AI·At-Risk / AI·Cold with tooltip)
- [ ] "Share Briefing" / export feature for Sachin to send to the owner

## Lead Assignment System (assignedTo)
- [x] Add `assignedTo` column to leads table in drizzle/schema.ts
- [x] Run DB migration (SQL direct) to add column to TiDB
- [x] Update leads.add and leads.update tRPC procedures to accept and save assignedTo
- [x] Update getLead / getAllLeads DB helpers to return assignedTo
- [x] Update Lead type in shared/store.ts to include assignedTo field
- [x] Update CRMContext handleAddLead and handleUpdateLead to include assignedTo
- [x] Add assignedTo dropdown (team members list) to Add Lead form — default to Khushi
- [x] Add assignedTo dropdown to Lead Detail panel Info tab (editable inline)
- [x] Show assignee badge on Kanban lead cards (blue pill)
- [x] Show assignee badge on Follow-Ups page rows
- [x] Add member filter chip bar on Follow-Ups page (All / per member)
- [x] Wire assignedTo into generateBriefing AI prompt for per-member task grouping
- [x] Update AI briefing member task lists to group by lead's assignedTo field

## AI Chief of Staff — Hierarchy-Aware Briefing (Signals, Not Noise)
- [x] Save lead intake hierarchy as project knowledge entry (Khushi primary, Sachin supervisor/escalation, others only if explicitly assigned)
- [x] Update generateBriefing prompt: Khushi owns all unassigned leads by default; briefing groups her tasks separately from Sachin's escalation list
- [x] Update generateBriefing prompt: Sachin's section shows ONLY leads Khushi has escalated to him (assignedTo = Sachin) — not the full pipeline
- [x] Update generateBriefing prompt: suppress other team members from briefing unless they have an explicit assignedTo lead
- [x] Default assignedTo for new leads = "Khushi" in the Add Lead form (enforced)
- [x] Briefing executive summary: focused on Khushi's workload + Sachin's escalations, not generic stats
- [x] Remove random/generic pipeline stats from briefing that don't map to a specific person's action
- [x] Hot leads with no activity 3+ days flagged as suggested escalations to Sachin (not auto-reassigned)
- [x] Unassigned leads flagged with Khushi as suggested owner

## Pipeline Stage Management Bug Fixes

- [x] Change leads.stage from MySQL ENUM to VARCHAR to support dynamic stage names
- [x] Update Zod LeadStageEnum to accept any string (z.string()) for stage field
- [x] Fix updateStage server procedure: when renaming a stage, also UPDATE all leads with old stage name to new name
- [x] Update LeadStage type in store.ts to be a string type (not hardcoded union)
- [x] Update all hardcoded STAGES arrays in Leads.tsx, LeadDetailPanel.tsx to use dynamic stages from DB
- [x] Rename "Consultation" → "Consultation Scheduled" via DB update (3 leads migrated)
- [x] Add "Consultation Booked" as a new pipeline stage (order 3, between Consultation Scheduled and Retained)

## Active Lead Definition Fix (Retained/Onboarding = Converted Clients)

- [x] Define ACTIVE_STAGES constant (New Lead, Follow-Up, Consultation Scheduled, Consultation Booked) and CONVERTED_STAGES (Retained, Onboarding) in shared/const.ts
- [x] Fix Dashboard: "Active Leads" stat card to exclude Retained and Onboarding
- [x] Fix Dashboard: Pipeline Value summary to only show active stages (not Retained/Onboarding)
- [x] Fix Dashboard: Stale Leads count to exclude Retained/Onboarding
- [x] Fix Dashboard: Lead Source ROI and other stats to separate active vs converted
- [x] Fix Leads.tsx: "Convert" button hidden for Retained and Onboarding stages
- [x] Fix LeadDetailPanel: "Convert" action hidden when stage is Retained or Onboarding
- [x] Fix server-side getLeadStats / active lead queries to exclude Retained/Onboarding

## Critical: Retained → Onboarding Flow Fix

- [x] Define CONVERTED_STAGES = ["Retained", "Onboarding"] constant — these are post-conversion stages
- [x] Fix handleDrop in Leads.tsx: dragging to Onboarding from Retained must NOT trigger Convert modal — just update stage
- [x] Fix handleStageChange in LeadDetailPanel.tsx: moving to Onboarding must NOT trigger Convert flow
- [x] Fix handleSave in Leads.tsx edit form: changing stage to Onboarding must NOT trigger Lost/Convert flow
- [x] Hide "Convert" button on lead cards when stage is already Retained or Onboarding
- [x] Fix Dashboard converted count: include both Retained AND Onboarding leads converted this month
- [x] Fix Dashboard active leads count: exclude Retained and Onboarding from active pipeline counts
- [x] Fix Pipeline Value section: use dynamic active stages from DB instead of hardcoded ["New Lead", "Consultation", "Follow-Up"]

## Convert Button & Dashboard Bifurcation Fix

- [x] Find and remove Convert button/action from LeadDetailPanel when stage is Retained or Onboarding
- [x] Redesign Dashboard stat section: Active Leads (pre-conversion only) | Converted Clients (Retained+Onboarding) | Lost — three clear buckets
- [x] Active Leads count must exclude Lost, Retained, Onboarding
- [x] Show conversion rate = Converted / (Active + Converted)
- [x] Lost count shown separately

## Merge Retained + Onboarding → "Retained & Onboarding"

- [x] DB: Rename "Retained" pipeline stage to "Retained & Onboarding"
- [x] DB: Update all leads with stage="Retained" to "Retained & Onboarding"
- [x] DB: Update all leads with stage="Onboarding" to "Retained & Onboarding"
- [x] DB: Delete the "Onboarding" pipeline stage row
- [x] shared/const.ts: Update CONVERTED_STAGES to ["Retained & Onboarding"]
- [x] server/routers.ts: Update any hardcoded "Retained"/"Onboarding" stage references
- [x] client: Update STAGES array, stageColor map, and all hardcoded "Retained"/"Onboarding" strings
- [x] client: Update Convert button label to "Convert → Retained & Onboarding"
- [x] client: Update handleDrop/handleStageChange to use new stage name
- [x] client: Update Convert modal success toast message

## Remove Duplicate Onboarding Checklist from Lead Detail Panel

- [x] Remove the "ONBOARDING CHECKLIST" collapsible section from LeadDetailPanel.tsx (keep only the Kanban card checklist)

## Lead Status Overview — Monthly View on Dashboard

- [x] Make Lead Status Overview card month-aware: show leads added, converted, and lost in the selected month
- [x] Add month navigator (prev/next arrows + month label) to the card, synced with the existing Dashboard month selector
- [x] Show all-time totals as a secondary row below the monthly numbers
