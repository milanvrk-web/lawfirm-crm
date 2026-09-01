# Missing Leads Audit

Date of audit: 2026-08-31.

The live database currently contains 223 lead records, with dates ranging from 2026-03-25 through 2026-08-31. Stage counts are: Consultation Booked 2, Consultation Scheduled 1, Follow-Up 12, Lost 129, New Lead 18, and Retained & Onboarding 61.

The reported records are present in the live database:

- Jimmy Rivas — ID y52ahJKZ7CuN0FmZ6IPyk — dated 2026-08-06 — Retained & Onboarding — phone +1(415)500-1615.
- Rana Masood — ID L1DLrXqtt9ZRghDJCIUK3 — dated 2026-07-13 — Lost — phone +1 (530) 329-0779.

Both names are also present in the latest SQL backup. The backup is 753,451 bytes with SHA-256 ecddaccc1637e3a72563825806bb6baa80f21828c76c4672f6ec76b094b4b706. The backup contains the name strings “Jimmy Rivas” and “Rana Masood”; it does not contain “Jimmy Rivers”.

The current Leads page loads 223 all-time leads and exposes Month/Week/Custom scope controls plus a Scoped board / All-time board toggle. Searching the live Leads page for “Rana Masood” displayed the matching record while the selected August scope remained active. The page text also contained Jimmy Rivas and his direct contact links. No deletion or update was performed during the audit.

Interpretation: the records have not disappeared from the database. Rana Masood is a July 13 Lost lead and will not belong to the selected August cohort unless the board is switched to All-time or the range is changed. Jimmy Rivas is an August 6 Retained & Onboarding lead and can be hidden from the currently visible horizontal board area because the Retained column is farther right; the page search still finds him. Current UI behavior is therefore consistent with date scope, stage separation, and horizontal Kanban positioning rather than deletion.
