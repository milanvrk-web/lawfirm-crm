
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
