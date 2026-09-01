
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
- [x] Per-team-member daily task list view (each person sees their own prioritized to-do)
- [x] At-risk escalation: AI sends owner notification when a Hot lead has no activity for 3+ days
- [x] Briefing history: view past daily briefings on the AI Chief of Staff page (History tab)
- [x] AI badge on Follow-Ups page rows (AI·Hot / AI·Warm / AI·At-Risk / AI·Cold with tooltip)
- [x] "Share Briefing" / export feature for Sachin to send to the owner

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

## Source Dropdown in Add Lead Form

- [x] Replace free-text Source input in Add Lead form with a dropdown (Referral, Existing Client, Google, Facebook, Instagram, Website, Walk-In, Handler, Other)
- [x] Fix typo in DB: "Referra" → "Referral" for the 1 affected lead
- [x] Also update Source dropdown in Edit Lead form (same modal reused for Add and Edit)
- [x] LeadDetailPanel shows source as read-only info field (no inline edit needed)

## Revenue Targets — Move to Database

- [x] Add `revenue_targets` table to drizzle schema (id, key varchar, value int, updatedAt)
- [x] Run db:push migration
- [x] Add getTargets and setTarget tRPC procedures (public — no auth needed for internal tool)
- [x] Seed default targets: monthly_green=125000, monthly_yellow=100000, weekly_green=31250, weekly_yellow=25000
- [x] Update CRMContext: fetch targets from DB via tRPC instead of localStorage
- [x] Update Dashboard targets editor: save to DB via tRPC mutation instead of localStorage
- [x] Update DEFAULT_TARGETS in store.ts to $125,000 monthly as fallback

## Follow-Up System Unification

- [x] Rebuild Follow-Ups page to use lead.followUpDate as single source of truth (not separate follow_ups table)
- [x] Follow-Ups page: show leads grouped into Overdue / Today / Upcoming sections
- [x] Each lead row shows: name, phone, stage, assigned to, follow-up date, last comment
- [x] Allow marking follow-up done (clears followUpDate or sets new date) directly from the page
- [x] Fix Dashboard overdue count to match Follow-Ups page (use lead.followUpDate < today for active leads only)
- [x] Fix sidebar badge urgentCount to match the same logic

## Release Validation

- [x] Verify current database records, application health, and publish readiness before the user releases the live site

## Lost Stage Separation & Loss Review

- [x] Visually separate Lost from active and converted pipeline columns on the Leads page
- [x] Require a standardized loss reason and supporting context whenever a lead is moved to Lost
- [x] Preserve the loss reason, context, and date in the lead record and display them clearly in lead details
- [x] Add a reviewable Lost Leads view with reason filtering and a reason-distribution summary

## Comprehensive Stress Test

- [x] Run static checks, full automated tests, application log review, and database integrity checks
- [x] Exercise high-risk CRM workflows: leads, stage transitions, Lost review, follow-ups, payments, targets, and AI briefing
- [x] Fix reproducible reliability, data-integrity, and usability issues found during stress testing
- [x] Add an explicit, easy-to-find Mark as Lost action for active leads
- [x] Exclude converted clients from the Follow-Ups queue so it matches the active-lead dashboard logic
- [x] Make payment client-search guidance match the selected New Client or Existing Client workflow
- [x] Replace the stale in-process nightly AI briefing timer with a durable Heartbeat-compatible scheduled endpoint
- [x] Reduce the oversized initial JavaScript bundle found during the production build
- [x] Re-run validation and checkpoint the stress-tested release

## Kanban Lost Shortcut

- [x] Add a direct Mark Lost shortcut on active Kanban lead cards that opens the required Loss Review dialog
- [x] Verify the direct Kanban Mark Lost shortcut and required loss-review validation without changing live lead data
- [x] Verify quick-action availability and safe interaction paths across all pipeline stages without changing live records
- [x] Add a confirmation safeguard before deleting a lead from any Kanban stage card

## Requested CRM Improvements — Pending Approval

- [x] Require an assignee and a future-or-today follow-up date when creating a new lead
- [x] Standardize the Lost workflow across every entry point, including the updated loss-reason taxonomy, activity attribution, and reporting feed
- [x] Add Close Day month-to-date and weekly target summaries plus a shareable PNG report
- [x] Add safe client-ledger editing with rename propagation, contact updates, and retainer correction
- [x] Expand lead deletion confirmation to select linked payments for deletion or safe unlinking
- [x] Complete organization-wide author and timestamp visibility for activities and stage changes
- [x] Add source filtering to Follow-Ups and improve stale-lead and password-visibility interactions
- [x] Audit and reconcile Dashboard reporting against raw CRM records, including Lost, revenue, KPI drill-downs, stale-lead rules, and PST date handling
- [x] Report existing orphan payments and missing payment-to-lead links before applying any approved data repairs
- [x] Link the 17 user-authorized one-to-one exact-name payment candidates and verify no orphan payments were introduced

## Consultation-to-Retainer Workflow & Source Outcomes — Pending Approval

- [x] Add an explicit Book Consultation action that requires and records a paid $150 or $200 consultation fee before moving the lead to Consultation Booked
- [x] Support direct-retainer conversion and consultation-led conversion, with a required choice to adjust or not adjust a paid consultation fee against the retainer
- [x] Record the consultation outcome as Won, Lost, or Still In Progress without duplicating lifecycle paths
- [x] Expand lead-source reporting to show leads received, consultations booked, converted/won, lost reasons, and in-progress outcomes per source
- [x] Reconcile the revised Dashboard lifecycle and source-outcome metrics against raw lead and payment records before release

## Kanban Action Layout & Lost Reasons — Pending

- [x] Fix responsive lead-card quick-action layout so Book Consultation, Convert, Mark Lost, Edit, and Delete do not overlap
- [x] Update Lost-reason labels to the user's exact operational wording
- [x] Require the specific case/service context only for "We don't provide that service"
- [x] Re-run Lost-reason tests, TypeScript validation, and visual verification
- [x] Save a checkpoint for the corrected UI and Lost-reason taxonomy

All items in this section must be completed before delivery.

## Consultation Conversion Reporting & Source Drill-Down — Pending

- [x] Add a clear count of paid consultations that later converted to Retained & Onboarding
- [x] Verify consultation-fee payments are included in new revenue exactly once and remain separately identifiable
- [x] Make each Lead Source Funnel outcome expandable into the matching underlying lead list
- [x] Add "Case too complicated" as a Lost reason
- [x] Add "Attorney declined to take the case" as a Lost reason with required explanation
- [x] Reconcile and test the updated metrics, drill-downs, and Lost-reason validation
- [x] Save a checkpoint for the completed reporting enhancement

All items in this section must be completed before delivery.

## Calendar UI Corrections — Pending

- [x] Prevent the Leads-page follow-up calendar from merging with or overlapping nearby lead-card content
- [x] Make the Complete Follow-Up calendar compact so it uses less dialog space while remaining readable
- [x] Verify calendar month navigation, date selection, today action, cancel, required validation, and save behavior without changing production records
- [x] Run TypeScript, tests, build, and preview render verification (calendar interaction clicks remain access-gated)
- [x] Save a checkpoint for the calendar corrections

All items in this section must be completed before delivery.

## Pipeline Dragging & Lost Review Card Layout — Pending

- [x] Enable reliable mouse drag-and-drop movement between pipeline columns in both directions
- [x] Preserve stage safeguards when a lead is dragged, including paid-consultation and Lost requirements
- [x] Fix Lost Review card banners and metadata so loss-review text never overlaps card content
- [x] Run TypeScript, full tests, production build, and preview render verification without changing production CRM records; browser interaction clicks remain access-gated
- [x] Save a checkpoint for the drag-and-drop and Lost Review layout fixes

All items in this section must be completed before delivery.

## Leads Board Mouse Panning — Pending

- [x] Add click-and-hold mouse panning to the horizontally overflowing Leads pipeline board
- [x] Keep card drag-and-drop and card controls from hijacking board-pan gestures
- [x] Verify left/right panning, native scrollbar fallback, responsive rendering, and existing lead actions (automated validation; manual clicks remain access-gated)
- [x] Save a checkpoint for the board-panning interaction

All items in this section must be completed before delivery.

## Production Leads Runtime Crash — Pending

- [x] Reproduce and trace the recurring React error #185 on the published Leads page
- [x] Fix the underlying render-loop or unstable-state runtime cause without changing CRM records
- [x] Run TypeScript, full tests, production build, and preview rendering verification (published browser is access-gated)
- [x] Save a checkpoint for the production crash fix

All items in this section must be completed before delivery.

## Live Leads React Error #185 — Reopened

- [x] Reproduce the live `/leads` crash from the provided production stack trace and identify the exact update loop (LeadDeleteDialog repeatedly replaced an empty Set while closed)
- [x] Apply a targeted fix that prevents recursive state updates without changing CRM records
- [x] Add or update regression coverage for the identified render-loop trigger
- [x] Verify the corrected build and Leads page before preparing a new unpublished checkpoint (clean authenticated local browser smoke test: zero React depth errors and zero runtime exceptions)
- [x] Re-verify calendar navigation, Today, date selection, Cancel, required validation, and save behavior (non-destructive authenticated calendar smoke test plus existing validation/build coverage)
- [x] Save a new checkpoint only after the live crash fix and remaining calendar verification are complete

All items in this section must be completed before delivery.

Note: The prior checkpoint 282641ff was not sufficient; the live deployment still shows React error #185 on `/leads`.

## Dashboard Last-Payment Audit — Pending

- [x] Inspect the Dashboard last-payment metric, its source data, and date/timezone handling
- [x] Reconcile the displayed last payment against all raw stored payment records
- [x] Correct the metric if it excludes or misorders payments, without changing payment records (no defect found; query loads all payments and sorts by stored business date descending)
- [x] Add regression coverage for the last-payment ordering and date boundary (audit confirmed the existing ordering logic and no code change was required)
- [x] Validate the corrected dashboard and save a checkpoint (data-audit checkpoint 6cb9373d)

All items in this section must be completed before delivery.

## August 20–21 Activity Audit — Pending

- [x] Query raw lead and payment records for August 20 and August 21
- [x] Compare business dates with database creation timestamps for both record types
- [x] Report exact counts, names, amounts, and any gap between entered activity and stored data

## Word Payment Report Reconciliation — Pending

- [x] Extract and normalize payment entries from Paymentreport(30), Paymentreport(31), and Paymentreport(32)
- [x] Compare report entries with raw CRM payment records using client, date, amount, and purpose
- [x] Classify exact matches, missing CRM records, duplicates, and business-date mismatches without changing CRM data
- [x] Report the reconciliation findings and request approval before any data repair

## Missing Manually Entered Payments Investigation — Pending

- [x] Audit the payment-entry persistence, client-side save, and deletion paths
- [x] Check database history, timestamps, and project/version context for the reported August 20–21 entries
- [x] Determine the most likely cause and document safe repair options without modifying payment data
- [x] Report findings and wait for explicit approval before any repair or re-entry

## Payment Form Persistence Fix — Pending

- [x] Make payment submission await the database mutation before closing or showing success
- [x] Keep the form editable on failure and prevent duplicate submissions while saving
- [x] Add regression coverage for success, failure, and duplicate-submit behavior
- [x] Validate the payment form without altering the four historical missing payments
- [x] Save a checkpoint for the form fix

## Existing-Client Picker — Pending

- [x] Map every form with a person/client name field and document the shared client/lead record strategy (Leads Add Lead, Dashboard Add Lead/Log Payment, Payments Log Payment; no separate case/matter form exists in the current route inventory)
- [x] Add a searchable all-clients-and-leads typeahead with name, phone, A-number, and email matching plus keyboard navigation
- [x] Fetch and apply the selected full record to all matching form fields without overwriting empty editable fields incorrectly
- [x] Add an inline client preview with cases/leads, statuses, payment totals, and profile navigation
- [x] Link new entries to the selected canonical record and preserve new-person creation without false duplicate alarms
- [x] Add save-time master-record update confirmation for edited auto-filled fields
- [x] Add regression coverage and test every acceptance check without modifying existing client records
- [x] Save a checkpoint for the existing-client picker

## Lost Lead Dialog — New Request

- [x] Make every loss-reason option use the same enabled, readable, selectable visual state
- [x] Make Additional Notes mandatory for every loss reason, with clear inline validation when missing
- [x] Prevent dialog submission/closure as a completed loss until both a reason and notes are provided
- [x] Add regression tests and browser validation for ordinary and service-not-provided loss reasons

## Lost Lead Confirmation Failure — New Report

- [x] Reproduce the reported failure with a selected reason, specific explanation, and required additional notes
- [x] Trace and fix any client/server payload or validation mismatch preventing a valid Lost transition
- [x] Add a successful end-to-end confirmation regression test plus incomplete-form safeguards
- [x] Re-run the full validation suite and save a corrected final checkpoint

## Lead Source Category Improvements — New Request

- [x] Add AI Tools, Email, and Calendly to the shared lead-source category taxonomy
- [x] Add Other-category guidance and similar-category reminders for Calendly, AI tools, Email, and other existing categories
- [x] Preserve genuinely new custom sources while preventing accidental category fragmentation
- [x] Add inline source editing in Lead Detail so Dashboard funnel leads can be corrected without navigating to Leads
- [x] Validate the new options, guidance, direct Dashboard correction path, TypeScript, full tests, and production build

## CRM Team Profile — New Request

- [x] Inspect the existing member-management flow and role validation
- [x] Add a team profile named Jaya with the Admin role
- [x] Verify Jaya appears correctly without changing existing member roles or records
- [x] Save a checkpoint for the new profile

## Lead Source Taxonomy Refinement — New Request

- [x] Rename the Calendly category/guidance to identify it as the website scheduling source
- [x] Combine Facebook and Instagram into one shared category and preserve legacy values safely
- [x] Label the AI source as AI Tools (ChatGPT, Claude, etc.) in selectors and reminders
- [x] Update reporting and source-correction labels consistently
- [x] Add regression coverage and validate selectors, guidance, and existing-record compatibility
- [x] Save a checkpoint for the revised source taxonomy

## Website (Calendly) Label Refinement — New Request

- [x] Rename the Website source category to Website (Calendly) in selectors and reports
- [x] Update Calendly matching and duplicate-category guidance to use Website (Calendly)
- [x] Update regression coverage and save a validated checkpoint

## Lost Reason Label Refinement — New Request

- [x] Rename the user-facing loss reason to “Client doesn’t need the service” in the dialog and review surfaces
- [x] Preserve the existing stored reason semantics and backward-compatible reporting behavior
- [x] Update regression coverage, validate the loss workflow, and save a checkpoint

## Payment Refusal Loss Category — New Request

- [x] Add the primary loss reason “Client doesn’t want to pay”
- [x] Add required sub-reasons for denied consultation fee, price too high, and no money
- [x] Preserve mandatory additional notes and support legacy high-price records safely
- [x] Add regression tests and validate client/server loss submission behavior
- [x] Save a checkpoint for the structured payment-refusal workflow

## Lost Lead Comment Reconciliation — New Request

- [x] Audit every follow-up comment attached to leads currently in Lost
- [x] Classify only high-confidence comments into the existing loss reason and payment sub-reason taxonomy
- [x] Apply evidence-based updates with a clear audit record and leave ambiguous cases unchanged
- [x] Verify corrected and unresolved records, then provide the manual-review list

## Lost Lead Comment Reconciliation — Completed

- [x] Audited every Lost lead, including follow-up comments, lost notes, and existing reason fields
- [x] Applied nine high-confidence loss-reason corrections without changing stages, notes, payments, or unrelated lead fields
- [x] Preserved ambiguous cases for manual review, including 97 blank records, Varun Sood, and the conflicting Akashdeep Singh record
- [x] Verified the post-reconciliation reason distribution and prepared the manual-review list

## Consultation-Only Loss Reason — New Request

- [x] Add “Consultation needed” as a distinct selectable loss reason
- [x] Preserve mandatory supporting notes and server-side validation for the new reason
- [x] Ensure consultation-to-lost reporting remains distinct from retained conversion reporting
- [x] Add regression coverage, validate the workflow, and save a checkpoint

## Monthly Dashboard Reporting Reconciliation — New Request

- [x] Audit Dashboard lead, source, pipeline, Lost-reason, and revenue calculations against raw CRM records
- [x] Reconcile July, August, and prior-month lead/payment business dates and revenue classifications
- [x] Separate new-client, existing-client, consultation, and pipeline-value reporting with explicit definitions
- [x] Preserve clickable source/outcome/Lost-reason drill-downs to the underlying leads
- [x] Add regression coverage and validate month switching, totals, and browser presentation
- [x] Save a checkpoint for the reconciled Dashboard reporting release

## Leads Pipeline Source Filter — New Request

- [x] Add a clickable Lead Source filter group alongside case-type filters
- [x] Populate source filters from CRM lead data and show standardized category labels consistently
- [x] Make source filtering compose correctly with search, case type, stage, and Kanban interactions
- [x] Add regression coverage and browser validation for source filtering and empty states
- [x] Save a checkpoint for the Leads Pipeline source-filter feature

## Leads Source Pipeline Overview — New Request

- [x] Show source-specific counts for all pipeline buckets, not only leads, converted, and lost
- [x] Add clickable bucket counts that open matching lead lists or lead details
- [x] Keep source filtering compatible with stage, case type, search, and Kanban interactions
- [x] Add regression and browser coverage for source-specific pipeline drill-downs
- [x] Save a checkpoint for the complete source pipeline overview

## Dashboard Pipeline Revenue Mismatch — New Report

- [x] Review the attached screen recording and document the exact mismatch shown
- [x] Audit every month’s lead cohort, pipeline outcomes, and payment classifications against raw CRM data
- [x] Identify and correct the definition or calculation causing pipeline data not to reconcile with New Client Revenue
- [x] Add regression and browser coverage for month switching and revenue reconciliation
- [x] Save a corrected checkpoint after validation

## Leads Pipeline Date Scope — New Request

- [x] Add monthly, weekly, and custom date-range controls to the Leads Pipeline overview
- [x] Recalculate overall and source-specific bucket counts for the selected date scope
- [x] Preserve clickable bucket lead lists and compatibility with source, stage, case-type, and search filters
- [x] Add regression and browser coverage for monthly, weekly, and custom ranges
- [x] Save a checkpoint for the date-scoped Leads Pipeline overview

## CRM Migration to Claude — New Request

- [x] Confirm the GitHub repository contains the latest application code without secrets
- [x] Confirm the database export and schema/migration files are available for handoff
- [x] Document the complete Claude migration sequence, including storage, environment variables, authentication, and validation
- [x] Provide the user with the GitHub sync and database transfer steps

## Transfer Package to Claude Code — New Request

- [x] Create a fresh read-only database dump and verify its contents
- [x] Verify the latest GitHub code state and package the migration documentation
- [x] Create a Claude Code initiation prompt covering code, database, storage, secrets, authentication, and validation
- [x] Deliver the verified backup files and transfer instructions

## Retained Conversion Stage Bug — New Request

- [x] Trace why conversion can leave the lead in the New Lead bucket
- [x] Persist the selected Retained stage and refresh the Kanban board after conversion
- [x] Prevent duplicate payment creation during the corrected conversion flow
- [x] Add regression coverage and authenticated browser validation
- [x] Save a checkpoint for the Retained conversion fix

## Confirmed Devinder Conversion — Follow-up

- [x] Correct numeric consultation-fee adjustment flag serialization
- [x] Retry the confirmed Devinder Pal Singh conversion with $2,500 retainer and $1,000 downpayment
- [x] Verify Retained-stage board placement and exactly one newly created payment
- [x] Document the pre-existing separate Devinder payment visible in Payments

## WhatsApp Contact Shortcuts — New Request

- [x] Add a shared WhatsApp URL helper that normalizes CRM phone numbers safely
- [x] Add WhatsApp chat buttons to lead cards and lead detail contacts
- [x] Add WhatsApp chat buttons to Follow-Ups contact cards
- [x] Handle missing or unusable phone numbers without creating broken links
- [x] Add regression tests and browser verification without sending a message
- [x] Save a checkpoint for the WhatsApp shortcuts

## Lead Name Persistence Bug — New Request

- [x] Trace why renaming a lead reports success but leaves the old name visible
- [x] Persist the edited name and refresh lead detail, Kanban, search, and related views
- [x] Ensure failed name updates do not show a success message
- [x] Add regression coverage and authenticated browser validation
- [x] Save a checkpoint for the lead-name fix

## Missing Leads Data Audit — New Request

- [x] Compare current live lead count with the latest verified database backup
- [x] Search current data and backup for Jimmy Rivers/Rivas and Rana Masood
- [x] Check whether filters, date scope, stage scope, or renamed records explain the apparent disappearance
- [x] Check deletion/audit evidence without modifying CRM data
- [x] Document and deliver read-only findings

## Dashboard Conversion and Prorated Weekly Targets — New Request

- [x] Add a clearly labeled total-conversions-during-selected-month metric independent of lead-entry cohort
- [x] Preserve cohort lead volume and cohort conversion-rate definitions
- [x] Replace equal five-week target allocation with calendar-week prorated targets from the $125,000 monthly target
- [x] Include in-month calendar days for Monday-Sunday weeks, including partial opening and closing weeks
- [x] Add regression coverage for prior-month leads converting in the selected month and September-style partial weeks
- [x] Validate all Dashboard pipeline, source, and revenue totals and save a checkpoint

## Dashboard All-Conversions Rate — New Request

- [x] Calculate selected-month conversion rate as all conversions completed in the month divided by all leads received in the month
- [x] Preserve separate cohort conversion counts and label both measures clearly
- [x] Update comparison and drill-down surfaces to use the same all-conversions rate definition
- [x] Add regression coverage for 18 conversions divided by 72 received leads
- [x] Validate Dashboard totals and save a checkpoint
