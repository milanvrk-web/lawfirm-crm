# Retained Conversion Browser Verification

Date: 2026-08-28

Authenticated Leads-page smoke test opened the conversion dialog for an existing active lead without submitting it. The dialog displayed Total Retainer Amount, Downpayment Received Today, Case Number, Notes, and Confirm Conversion controls. No CRM mutation was submitted during this browser check. Automated regression tests cover the mutation ordering: the lead stage update is awaited before optional payment creation, and payment creation is skipped if the stage update fails.
