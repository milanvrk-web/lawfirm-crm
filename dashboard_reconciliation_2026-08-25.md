# Dashboard Reconciliation — August 2026 (PST)

The following read-only comparison confirms the raw records used by the month-scoped Dashboard selectors after the reporting-rule update. Business dates are stored as `YYYY-MM-DD` and compared as PST calendar dates.

| Metric | Raw-record result |
|---|---:|
| Leads received | 49 |
| Leads converted | 11 |
| Leads marked Lost | 26 |
| Revenue booked | $77,750.00 |
| Revenue received | $65,025.00 |
| New Client revenue | $22,400.00 (18 payments) |
| Existing Client revenue | $42,625.00 (34 payments) |

The active all-time pipeline counts were 3 New Lead, 14 Follow-Up, 5 Consultation Scheduled, 58 Retained & Onboarding, and 113 Lost. Lost counts use `lostDate` when recorded, falling back to the original lead date only for legacy records without a loss date.

The stale-lead selectors in both Dashboard and the stale-lead drawer now use the same rule: **active leads only**, with no scheduled follow-up and no linked payment in the preceding 14 PST calendar days.
