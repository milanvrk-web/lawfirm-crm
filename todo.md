
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
- [ ] Add "Stale Leads" count to Dashboard stat cards (leads with no activity >14 days)

## Lost Lead Reason Tracking

- [x] Add lostReason field to leads table (DB migration)
- [x] When marking a lead as Lost, show a modal requiring a reason (price, competitor, not qualified, no response, other)
- [x] Show lost reason on lead detail Info tab
- [ ] Add Lost Reasons breakdown chart to Dashboard (pie or bar)

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

- [ ] In Lead Detail panel Payments tab, show retainer booked vs. total collected vs. outstanding balance
- [ ] Color-code outstanding balance (green = fully paid, yellow = partially paid, red = nothing collected)
- [ ] Add "Outstanding Balance" column to Payments page table

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
- [ ] Show completion count vs. total per day (e.g., "3 / 5 done")

## Overdue Follow-Up Escalation

- [x] Add a red escalation badge on follow-up tasks that are >24h overdue (not just past due date)
- [x] Add overdue count badge to the Follow-Ups sidebar nav item
- [x] Show escalated tasks at the top of the Follow-Ups list
