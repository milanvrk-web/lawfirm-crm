# Devinder Pal Singh Conversion Attempt

The first confirmed submission was rejected by server validation because `consultationFeeAppliedToRetainer` was sent as a boolean while the API schema requires numeric 0/1. The server rejected the payload before the lead update or payment creation; the dialog remained open and the lead stayed in New Lead.

The fix normalizes boolean UI values to numeric API values in CRMContext. TypeScript validation, focused conversion tests, the full Vitest suite, and production build pass.

The retry succeeded in the authenticated Leads page for Devinder Pal Singh — I-130 with a $2,500 retainer and $1,000 downpayment. The success toast reported the lead converted to Retained, the selected-scope converted count increased from 5 to 6, and Devinder disappeared from the New Lead card list.

Payments verification shows a new Aug 28, 2026 linked New Client payment for Devinder Pal Singh I-130 of $1,000 with received-for value Retainer downpayment. The page also shows a separate pre-existing Aug 27, 2026 linked $1,000 Devinder payment with received-for value I-130 Retainer downpayment. No existing payment was deleted or altered. Therefore this action created exactly one new $1,000 payment, while the CRM now contains two separate $1,000 linked Devinder payments total.
