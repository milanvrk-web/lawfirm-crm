
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
