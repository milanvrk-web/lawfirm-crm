# Dashboard reconciliation audit

## Evidence reviewed

The attached screen recording shows the user comparing the Dashboard Lead Source Funnel with the New Client revenue KPI for August and July. The reported authoritative New Client totals are **$23,200 for August 2026** and **$52,350 for July 2026**. The video shows the displayed source rows summing to substantially less, and requests a visible total and clickable drill-down context.

## Raw CRM payment audit

The read-only database audit grouped all payments by business date. May 2026 totals are New $22,950 and Existing $55,914.87; June totals are New $31,950 and Existing $92,225; July totals are New $52,350 and Existing $83,763; August totals are New $23,200 and Existing $59,586.25. The Dashboard August KPI currently reconciles to New $23,200, Existing $59,586, and Total $82,786; July New Client revenue is $52,350.

## Root cause

The Lead Source Funnel attributes payment revenue only when a payment is linked to a lead that also belongs to the selected month’s lead-entry cohort. Payments outside that linked lead cohort are still valid and are included in the authoritative monthly payment KPI, so the source rows cannot sum to the KPI without a reconciliation line. For August, cohort-linked revenue is New $9,300 and Existing $1,000, leaving New $13,900 and Existing $58,586 outside the selected lead cohort. For July, cohort-linked revenue is New $28,550 and Existing $3,000, leaving New $23,800 and Existing $80,763 outside the selected lead cohort.

## Implemented correction

The Dashboard Lead Source Funnel now includes a visible Funnel total equal to the authoritative monthly payment total, explicitly separates New and Existing totals, and explains the amount outside the selected lead cohort. Monthly lifecycle counts now use one strict lead-entry cohort rule: converted and lost are subsets of leads entered in the selected month. Existing source/outcome drill-down buttons remain unchanged. No CRM records were inserted, updated, or deleted.
