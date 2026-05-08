/* ============================================================
   Law Firm CRM — Data Store (localStorage)
   Design: Dark Luxury Legal — Navy + Gold
   All data persists in localStorage. No backend required.
   ============================================================ */

import { nanoid } from "nanoid";

// ─── Types ──────────────────────────────────────────────────

export type LeadStage = "New Lead" | "Consultation" | "Follow-Up" | "Retained" | "Lost";
export type FollowUpStatus = "Pending" | "Done" | "Snoozed";

export interface FollowUpComment {
  id: string;
  initial: string;    // e.g. "M", "S", "J"
  text: string;
  timestamp: string;  // ISO string
}

export interface FollowUp {
  id: string;
  leadId: string;
  dueDate: string;    // YYYY-MM-DD
  status: FollowUpStatus;
  title: string;      // short task title e.g. "Call back"
  comments: FollowUpComment[];
  createdAt: string;  // ISO string
  assignedTo?: string | null;
}
export type CaseType = "DA" | "SIJS" | "AOS" | "AO" | "K1/K2" | "U-Visa" | "Green Card" | "BIA" | "Other";
export type PaymentType = "New Client" | "Existing Client";

export interface LeadNote {
  id: string;
  text: string;      // full note e.g. "M: called, no answer"
  timestamp: string; // ISO string
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string;
  caseType: CaseType;
  caseNumber: string;
  source: string;
  stage: LeadStage;
  notes: string;
  date: string; // ISO date string
  retainerBooked: number; // total retainer amount signed
  downpayment: number;    // quoted downpayment
  quotedAmount: number;   // initial quote
  referredBy: string;
  convertedDate?: string;
  lostReason?: string | null;
  leadLog?: LeadNote[];   // inline timestamped notes
}

export interface Payment {
  id: string;
  date: string; // ISO date string
  clientName: string;
  leadId?: string; // linked lead
  caseType: CaseType;
  caseNumber: string;
  paymentType: PaymentType;
  amount: number;
  receivedFor: string; // what the payment was for
  notes: string;
  linkedInstallmentId?: string | null; // auto-linked installment item id
}

export interface DayClose {
  date: string; // YYYY-MM-DD
  closedAt: string; // ISO timestamp
  totalNew: number;
  totalExisting: number;
  totalRevenue: number;
  closedBy?: string;
}

export interface CRMData {
  leads: Lead[];
  payments: Payment[];
  dayCloses: DayClose[];
  followUps: FollowUp[];
}

// ─── Keys ────────────────────────────────────────────────────

const STORAGE_KEY = "lawfirm_crm_v2";

// ─── Helpers ─────────────────────────────────────────────────

export function loadData(): CRMData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as CRMData;
      // Migrate older data that lacks followUps
      if (!parsed.followUps) parsed.followUps = [];
      return parsed;
    }
  } catch {}
  return getInitialData();
}

export function saveData(data: CRMData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function resetData(): void {
  localStorage.removeItem(STORAGE_KEY);
}

// ─── April 2026 Pre-loaded Data ──────────────────────────────

function getInitialData(): CRMData {
  const leads: Lead[] = [
    // April 1 - Maninder Singh (converted)
    { id: "lead-001", name: "Maninder Singh 409", phone: "", email: "", caseType: "AOS", caseNumber: "409", source: "Referral", stage: "Retained", notes: "Already filed marriage petition with immigration consultant. Wife on work permit in Canada, husband has Green Card in US. Received receipt notice for I-360.", date: "2026-04-01", retainerBooked: 150, downpayment: 150, quotedAmount: 150, referredBy: "", convertedDate: "2026-04-01" },
    // April 9 - Muskanpreet Kaur
    { id: "lead-002", name: "Muskanpreet Kaur", phone: "", email: "", caseType: "SIJS", caseNumber: "", source: "Direct", stage: "Consultation", notes: "Received RFE notice from USCIS regarding I-360 petition. Wants to discuss notice and next steps.", date: "2026-04-09", retainerBooked: 0, downpayment: 150, quotedAmount: 150, referredBy: "" },
    // April 10 - Loverose Singh (converted)
    { id: "lead-003", name: "Loverose Singh", phone: "", email: "", caseType: "Green Card", caseNumber: "", source: "Direct", stage: "Retained", notes: "Aunt came to US based on petition by husband (green card holder). Work permit expired 6-7 months ago. Wants to apply for green card.", date: "2026-04-10", retainerBooked: 150, downpayment: 150, quotedAmount: 150, referredBy: "", convertedDate: "2026-04-10" },
    // April 10 - Muskanpreet (consultation paid)
    { id: "lead-004", name: "Muskanpreet (query)", phone: "", email: "", caseType: "Other", caseNumber: "", source: "Direct", stage: "Consultation", notes: "Consultation charges paid for query.", date: "2026-04-10", retainerBooked: 0, downpayment: 150, quotedAmount: 150, referredBy: "" },
    // April 13 - Shubham
    { id: "lead-005", name: "Shubham", phone: "+1 (925) 558-3940", email: "", caseType: "AO", caseNumber: "", source: "Direct", stage: "New Lead", notes: "I-589 filed by prior attorney. Prior attorney not responsive. SF AO IV date 04/27/2026. Wants to hire for AO IV and documentation.", date: "2026-04-13", retainerBooked: 0, downpayment: 150, quotedAmount: 150, referredBy: "" },
    // April 13 - Gurpreet
    { id: "lead-006", name: "Gurpreet", phone: "+1 (469) 925-4767", email: "gurpreetkaur2212@gmail.com", caseType: "AOS", caseNumber: "", source: "Direct", stage: "Consultation", notes: "Marriage case. All basic details and payment details shared. Consultation fee received.", date: "2026-04-13", retainerBooked: 0, downpayment: 150, quotedAmount: 150, referredBy: "" },
    // April 13 - Chaman Singh
    { id: "lead-007", name: "Chaman Singh", phone: "+1 (510) 514-2325", email: "", caseType: "DA", caseNumber: "", source: "Yuvraj", stage: "New Lead", notes: "DA Family case. Referred by Yuvraj. Individual hearing in person July 29, 2026. Judge Torres, Sarah F. Court: 1855 Gateway Blvd, Suite 850, Concord CA.", date: "2026-04-13", retainerBooked: 0, downpayment: 150, quotedAmount: 150, referredBy: "Yuvraj" },
    // April 14 - Andes Morales (converted)
    { id: "lead-008", name: "Andes Morales", phone: "+1 (669) 454-6588", email: "andres231997@hotmail.com", caseType: "AOS", caseNumber: "", source: "Josh", stage: "Retained", notes: "Referred by Josh. On study visa, marrying USC soon. DOB 11/23/1997. Address: 2594 Northwood Dr, San Jose CA 95132.", date: "2026-04-14", retainerBooked: 4000, downpayment: 2000, quotedAmount: 4000, referredBy: "Josh", convertedDate: "2026-04-14" },
    // April 17 - Supriya Patil (converted)
    { id: "lead-009", name: "Supriya Patil", phone: "", email: "", caseType: "DA", caseNumber: "", source: "Direct", stage: "Retained", notes: "Converted.", date: "2026-04-17", retainerBooked: 9000, downpayment: 2000, quotedAmount: 9000, referredBy: "", convertedDate: "2026-04-17" },
    // April 20 - Inderjeet Kaur (converted)
    { id: "lead-010", name: "Inderjeet Kaur", phone: "", email: "", caseType: "AOS", caseNumber: "", source: "Direct", stage: "Retained", notes: "Converted. AOS based on asylum.", date: "2026-04-20", retainerBooked: 2500, downpayment: 2500, quotedAmount: 2500, referredBy: "", convertedDate: "2026-04-20" },
    // April 21 - Abdul Adam
    { id: "lead-011", name: "Abdul Adam", phone: "+1 916-289-6843", email: "", caseType: "Green Card", caseNumber: "", source: "Direct", stage: "Consultation", notes: "Reached out regarding relative's green card (Mohamed Essa Abdi). Lost green card, still in US. Asking for estimate of total charges.", date: "2026-04-21", retainerBooked: 0, downpayment: 150, quotedAmount: 150, referredBy: "" },
    // April 21 - Sahajpal Singh (converted)
    { id: "lead-012", name: "Sahajpal Singh 568", phone: "", email: "", caseType: "SIJS", caseNumber: "568", source: "Direct", stage: "Retained", notes: "Converted for SIJS. Already filed asylum.", date: "2026-04-21", retainerBooked: 8000, downpayment: 2000, quotedAmount: 8000, referredBy: "", convertedDate: "2026-04-21" },
    // April 23 - Mohit
    { id: "lead-013", name: "Mohit", phone: "+1 (559) 316-1231", email: "", caseType: "SIJS", caseNumber: "", source: "Sahil", stage: "New Lead", notes: "Referred by Sahil. Minor: Mohit Mohit A#246-914-496. Status: asylum applicant. DOB 10/03/2005. Address: Fresno. Guardian: Vipin (asylum applicant, Fresno).", date: "2026-04-23", retainerBooked: 0, downpayment: 2000, quotedAmount: 8000, referredBy: "Sahil" },
    // April 23 - Amit Singh Negi
    { id: "lead-014", name: "Amit Singh Negi", phone: "+1 (737) 363-5867", email: "", caseType: "DA", caseNumber: "", source: "Amandeep Singh", stage: "New Lead", notes: "Referred by Amandeep Singh. A#235-510-040. Case moved from asylum office to court. MTS: Yes, Simon attorney from Nigeria. Address: Texas. Will follow up 04/30/2026.", date: "2026-04-23", retainerBooked: 0, downpayment: 2000, quotedAmount: 11000, referredBy: "Amandeep Singh" },
    // April 23 - Jaspreet Singh (converted)
    { id: "lead-015", name: "Jaspreet Singh (Preet's client)", phone: "", email: "", caseType: "SIJS", caseNumber: "", source: "Preet", stage: "Retained", notes: "SIJS, converted.", date: "2026-04-23", retainerBooked: 8000, downpayment: 3000, quotedAmount: 8000, referredBy: "Preet", convertedDate: "2026-04-23" },
    // April 24 - Tinku
    { id: "lead-016", name: "Tinku", phone: "+1 279-667-6905", email: "", caseType: "DA", caseNumber: "", source: "Varun", stage: "Consultation", notes: "Varun's client. Defensive asylum.", date: "2026-04-24", retainerBooked: 0, downpayment: 2000, quotedAmount: 10000, referredBy: "Varun" },
    // April 24 - Manjit Kumar 515
    { id: "lead-017", name: "Manjit Kumar 515", phone: "", email: "", caseType: "DA", caseNumber: "515", source: "Direct", stage: "Consultation", notes: "Defensive asylum.", date: "2026-04-24", retainerBooked: 0, downpayment: 2000, quotedAmount: 10000, referredBy: "" },
    // April 27 - Kay Khaing
    { id: "lead-018", name: "Kay Khaing", phone: "+1 510-458-4056", email: "", caseType: "DA", caseNumber: "", source: "Direct", stage: "Consultation", notes: "DA and SIJS. Already had interview April 7 2026, referred to court, hearing Jan 2027. Burma citizenship. Entered US Nov 2024 on tourist visa. I-589 filed on political basis. SIJS: Minor Wai Linn Phyo (nephew), DOB March 20 2019, Union City. Guardian TBD. Call back required.", date: "2026-04-27", retainerBooked: 0, downpayment: 2000, quotedAmount: 10000, referredBy: "" },
    // April 28 - Angel
    { id: "lead-019", name: "Angel", phone: "+1 (510) 934-1144", email: "", caseType: "K1/K2", caseNumber: "", source: "Direct", stage: "Consultation", notes: "K-1 fiancé visa case.", date: "2026-04-28", retainerBooked: 0, downpayment: 150, quotedAmount: 150, referredBy: "" },
    // April 28 - Sabiha
    { id: "lead-020", name: "Sabiha", phone: "+1 (925) 319-8525", email: "", caseType: "Other", caseNumber: "", source: "Direct", stage: "New Lead", notes: "Currently in Fremont on F1 visa. Planning to travel to home country this summer. Issues with bank account. Wants to know about Zelle through different bank. No quote given.", date: "2026-04-28", retainerBooked: 0, downpayment: 0, quotedAmount: 0, referredBy: "" },
    // April 28 - Simranpreet Singh 413 (converted)
    { id: "lead-021", name: "Simranpreet Singh 413", phone: "", email: "", caseType: "DA", caseNumber: "413", source: "Direct", stage: "Retained", notes: "Filed motion to substitute and motion to terminate which got denied. Now client hired for asylum case.", date: "2026-04-28", retainerBooked: 9000, downpayment: 1500, quotedAmount: 9000, referredBy: "", convertedDate: "2026-04-28" },
    // April 29 - Toni LNU
    { id: "lead-022", name: "Toni LNU", phone: "", email: "", caseType: "AOS", caseNumber: "", source: "Kuldeep Kumar", stage: "Consultation", notes: "Referred by Kuldeep Kumar. A#235-208-391. AO. Has work permit. Special notes: case file with Jaspreet's office. MTS: Yes.", date: "2026-04-29", retainerBooked: 0, downpayment: 2000, quotedAmount: 8000, referredBy: "Kuldeep Kumar" },
    // April 29 - Himanshu Kumar 764
    { id: "lead-023", name: "Himanshu Kumar 764", phone: "", email: "", caseType: "DA", caseNumber: "764", source: "Direct", stage: "New Lead", notes: "Friend lost work permit. Called to inform fees $1000 + filing fee. Didn't respond, will follow up tomorrow.", date: "2026-04-29", retainerBooked: 0, downpayment: 1000, quotedAmount: 1000, referredBy: "" },
    // April 29 - Jagroop Singh
    { id: "lead-024", name: "Jagroop Singh", phone: "+1 (209) 229-6264", email: "", caseType: "DA", caseNumber: "", source: "Direct", stage: "New Lead", notes: "Friend's work permit got lost. Informed fees $1000 + filing fee. Will let us know, follow up tomorrow.", date: "2026-04-29", retainerBooked: 0, downpayment: 1000, quotedAmount: 1000, referredBy: "" },
    // April 29 - Tinku (converted)
    { id: "lead-025", name: "Tinku (converted)", phone: "+1 279-667-6905", email: "", caseType: "DA", caseNumber: "", source: "Varun", stage: "Retained", notes: "Varun's client. Defensive asylum. Converted.", date: "2026-04-29", retainerBooked: 10000, downpayment: 2000, quotedAmount: 10000, referredBy: "Varun", convertedDate: "2026-04-29" },
    // April 30 - New lead (no quote)
    { id: "lead-026", name: "New Lead (no quote)", phone: "", email: "", caseType: "Other", caseNumber: "", source: "Direct", stage: "New Lead", notes: "Currently in Fremont on F1 visa. Planning to travel to home country. Issues with bank account.", date: "2026-04-30", retainerBooked: 0, downpayment: 0, quotedAmount: 0, referredBy: "" },
  ];

  const payments: Payment[] = [
    // April 1
    { id: "pay-001", date: "2026-04-01", clientName: "Maninder Singh 409", leadId: "lead-001", caseType: "AOS", caseNumber: "409", paymentType: "New Client", amount: 150, receivedFor: "Consultation", notes: "" },
    { id: "pay-002", date: "2026-04-01", clientName: "Harvind Singh 755", leadId: undefined, caseType: "SIJS", caseNumber: "20-1", paymentType: "Existing Client", amount: 1041, receivedFor: "For state court", notes: "" },
    { id: "pay-003", date: "2026-04-01", clientName: "Sehajpreet Singh", leadId: undefined, caseType: "SIJS", caseNumber: "425", paymentType: "Existing Client", amount: 1000, receivedFor: "For ex-parte", notes: "" },
    // April 2
    { id: "pay-004", date: "2026-04-02", clientName: "Gagandeep Singh Gill 528", leadId: undefined, caseType: "AO", caseNumber: "363", paymentType: "Existing Client", amount: 1500, receivedFor: "For declaration review", notes: "" },
    { id: "pay-005", date: "2026-04-02", clientName: "Satpreet Singh 326", leadId: undefined, caseType: "DA", caseNumber: "21", paymentType: "Existing Client", amount: 2000, receivedFor: "For declaration", notes: "" },
    { id: "pay-006", date: "2026-04-02", clientName: "Sehajpreet Singh", leadId: undefined, caseType: "SIJS", caseNumber: "421", paymentType: "Existing Client", amount: 500, receivedFor: "For ex-parte", notes: "" },
    // April 3
    { id: "pay-007", date: "2026-04-03", clientName: "Shivam Kushwaha", leadId: undefined, caseType: "DA", caseNumber: "370", paymentType: "Existing Client", amount: 1000, receivedFor: "For work permit", notes: "" },
    { id: "pay-008", date: "2026-04-03", clientName: "Parasdeep Singh 649", leadId: undefined, caseType: "DA", caseNumber: "347", paymentType: "Existing Client", amount: 1000, receivedFor: "For I-589 updates and declaration", notes: "" },
    // April 6
    { id: "pay-009", date: "2026-04-06", clientName: "Sahab Singh 883", leadId: undefined, caseType: "DA", caseNumber: "93", paymentType: "Existing Client", amount: 500, receivedFor: "For prep session", notes: "" },
    { id: "pay-010", date: "2026-04-06", clientName: "Davinder Singh 501 & Kuldeep Kaur 503", leadId: undefined, caseType: "DA", caseNumber: "405", paymentType: "Existing Client", amount: 1000, receivedFor: "For I-589 updates and declaration", notes: "" },
    { id: "pay-011", date: "2026-04-06", clientName: "Ravinder 856", leadId: undefined, caseType: "DA", caseNumber: "411", paymentType: "Existing Client", amount: 500, receivedFor: "For COV", notes: "" },
    // April 7
    { id: "pay-012", date: "2026-04-07", clientName: "Baljinder Singh 583", leadId: undefined, caseType: "DA", caseNumber: "188", paymentType: "Existing Client", amount: 500, receivedFor: "For declaration review", notes: "" },
    // April 8
    { id: "pay-013", date: "2026-04-08", clientName: "Daoju Yang", leadId: undefined, caseType: "AOS", caseNumber: "367", paymentType: "Existing Client", amount: 500, receivedFor: "Monthly payment for case", notes: "" },
    { id: "pay-014", date: "2026-04-08", clientName: "Bittu Rana", leadId: undefined, caseType: "U-Visa", caseNumber: "382", paymentType: "Existing Client", amount: 1030, receivedFor: "Monthly payment for case (paid via card)", notes: "" },
    // April 9
    { id: "pay-015", date: "2026-04-09", clientName: "Simranjeet Singh 566", leadId: undefined, caseType: "DA", caseNumber: "383", paymentType: "Existing Client", amount: 1500, receivedFor: "For BIA appeal (rest amt received for filing fee)", notes: "" },
    // April 10
    { id: "pay-016", date: "2026-04-10", clientName: "Loverose Singh", leadId: "lead-003", caseType: "Green Card", caseNumber: "", paymentType: "New Client", amount: 150, receivedFor: "Consultation fee", notes: "" },
    { id: "pay-017", date: "2026-04-10", clientName: "Muskanpreet (query)", leadId: "lead-004", caseType: "Other", caseNumber: "", paymentType: "New Client", amount: 150, receivedFor: "Consultation charges", notes: "" },
    { id: "pay-018", date: "2026-04-10", clientName: "Rajveer Singh 878", leadId: undefined, caseType: "BIA", caseNumber: "77", paymentType: "Existing Client", amount: 1000, receivedFor: "Appeal", notes: "" },
    // April 13
    { id: "pay-019", date: "2026-04-13", clientName: "Gurpreet", leadId: "lead-006", caseType: "AOS", caseNumber: "", paymentType: "New Client", amount: 150, receivedFor: "Consultation fee", notes: "" },
    { id: "pay-020", date: "2026-04-13", clientName: "Harvind Singh 755", leadId: undefined, caseType: "SIJS", caseNumber: "20-1", paymentType: "Existing Client", amount: 1500, receivedFor: "For I-360", notes: "" },
    { id: "pay-021", date: "2026-04-13", clientName: "Sumandeep Kaur 857", leadId: undefined, caseType: "DA", caseNumber: "400", paymentType: "Existing Client", amount: 500, receivedFor: "For pleading motion", notes: "" },
    { id: "pay-022", date: "2026-04-13", clientName: "Rajveer Singh 878", leadId: undefined, caseType: "BIA", caseNumber: "77", paymentType: "Existing Client", amount: 1000, receivedFor: "For appeal briefing schedule", notes: "" },
    // April 14
    { id: "pay-023", date: "2026-04-14", clientName: "Andes Morales", leadId: "lead-008", caseType: "AOS", caseNumber: "", paymentType: "New Client", amount: 2000, receivedFor: "Retainer downpayment", notes: "" },
    { id: "pay-024", date: "2026-04-14", clientName: "Rajveer Singh 878", leadId: undefined, caseType: "DA", caseNumber: "77", paymentType: "Existing Client", amount: 500, receivedFor: "For briefing schedule", notes: "" },
    // April 15
    { id: "pay-025", date: "2026-04-15", clientName: "Gagandeep Singh 549", leadId: undefined, caseType: "DA", caseNumber: "236", paymentType: "Existing Client", amount: 1000, receivedFor: "For declaration review", notes: "" },
    { id: "pay-026", date: "2026-04-15", clientName: "Gunveer Singh 786", leadId: undefined, caseType: "DA", caseNumber: "388", paymentType: "Existing Client", amount: 1000, receivedFor: "For master hearing", notes: "" },
    { id: "pay-027", date: "2026-04-15", clientName: "Arshdeep Singh 676", leadId: undefined, caseType: "SIJS", caseNumber: "415", paymentType: "Existing Client", amount: 2827, receivedFor: "Complete payment for state court and I-360", notes: "" },
    { id: "pay-028", date: "2026-04-15", clientName: "Mahnoor Gul", leadId: undefined, caseType: "AOS", caseNumber: "73", paymentType: "Existing Client", amount: 500, receivedFor: "For green card", notes: "" },
    // April 16
    { id: "pay-029", date: "2026-04-16", clientName: "Tarlochan Singh", leadId: undefined, caseType: "DA", caseNumber: "", paymentType: "New Client", amount: 1500, receivedFor: "Retainer downpayment", notes: "" },
    { id: "pay-030", date: "2026-04-16", clientName: "Simranjeet Singh 566", leadId: undefined, caseType: "DA", caseNumber: "383", paymentType: "Existing Client", amount: 530, receivedFor: "Appeal remaining payment", notes: "" },
    { id: "pay-031", date: "2026-04-16", clientName: "Mandeep Kaur 978", leadId: undefined, caseType: "DA", caseNumber: "246", paymentType: "Existing Client", amount: 1030, receivedFor: "Appeal filing fee", notes: "" },
    // April 17
    { id: "pay-032", date: "2026-04-17", clientName: "Supriya Patil", leadId: "lead-009", caseType: "DA", caseNumber: "", paymentType: "New Client", amount: 2060, receivedFor: "Retainer downpayment", notes: "" },
    { id: "pay-033", date: "2026-04-17", clientName: "Puneetpal Singh", leadId: undefined, caseType: "AO", caseNumber: "413", paymentType: "Existing Client", amount: 100, receivedFor: "AAF", notes: "" },
    { id: "pay-034", date: "2026-04-17", clientName: "Harpreet Singh Bhangu 053", leadId: undefined, caseType: "DA", caseNumber: "46", paymentType: "Existing Client", amount: 2000, receivedFor: "For declaration review", notes: "" },
    // April 20
    { id: "pay-035", date: "2026-04-20", clientName: "Inderjeet Kaur", leadId: "lead-010", caseType: "AOS", caseNumber: "", paymentType: "New Client", amount: 2500, receivedFor: "Retainer downpayment (AOS based on asylum)", notes: "" },
    { id: "pay-036", date: "2026-04-20", clientName: "Baljinder Singh 583", leadId: undefined, caseType: "DA", caseNumber: "188", paymentType: "Existing Client", amount: 500, receivedFor: "For declaration review", notes: "" },
    // April 21
    { id: "pay-037", date: "2026-04-21", clientName: "Sahajpal Singh 568", leadId: "lead-012", caseType: "SIJS", caseNumber: "568", paymentType: "New Client", amount: 1900, receivedFor: "Retainer downpayment", notes: "" },
    { id: "pay-038", date: "2026-04-21", clientName: "Dheeraj Kumar 085", leadId: undefined, caseType: "DA", caseNumber: "379", paymentType: "Existing Client", amount: 1000, receivedFor: "Pending payment received", notes: "" },
    { id: "pay-039", date: "2026-04-21", clientName: "Harpreet Singh Bhangu 053", leadId: undefined, caseType: "DA", caseNumber: "46", paymentType: "Existing Client", amount: 60, receivedFor: "Remaining payment for declaration review", notes: "" },
    { id: "pay-040", date: "2026-04-21", clientName: "Harmanpreet Singh & Simranpreet Kaur", leadId: undefined, caseType: "SIJS", caseNumber: "421 & 422", paymentType: "Existing Client", amount: 750, receivedFor: "For ex-parte", notes: "" },
    { id: "pay-041", date: "2026-04-21", clientName: "Mathurin Boutte", leadId: undefined, caseType: "K1/K2", caseNumber: "245", paymentType: "Existing Client", amount: 1000, receivedFor: "Due when National Visa Center receives case", notes: "" },
    // April 22
    { id: "pay-042", date: "2026-04-22", clientName: "Amandeep Singh Rangi 733", leadId: undefined, caseType: "DA", caseNumber: "59", paymentType: "Existing Client", amount: 3000, receivedFor: "For documentation review", notes: "" },
    // April 23
    { id: "pay-043", date: "2026-04-23", clientName: "Jaspreet Singh (Preet's client)", leadId: "lead-015", caseType: "SIJS", caseNumber: "", paymentType: "New Client", amount: 3000, receivedFor: "Retainer downpayment", notes: "" },
    { id: "pay-044", date: "2026-04-23", clientName: "Rohit Gupta 139 & Aman Kumar 530", leadId: undefined, caseType: "DA", caseNumber: "337 & 332", paymentType: "Existing Client", amount: 2000, receivedFor: "Habeas petition", notes: "" },
    { id: "pay-045", date: "2026-04-23", clientName: "Navpreet Kaur", leadId: undefined, caseType: "SIJS", caseNumber: "", paymentType: "Existing Client", amount: 750, receivedFor: "For deferred action", notes: "" },
    // April 24
    { id: "pay-046", date: "2026-04-24", clientName: "Munish Sharma", leadId: undefined, caseType: "U-Visa", caseNumber: "83", paymentType: "Existing Client", amount: 500, receivedFor: "Monthly payment for U-visa petition", notes: "" },
    { id: "pay-047", date: "2026-04-24", clientName: "Baldev Singh 030", leadId: undefined, caseType: "DA", caseNumber: "410", paymentType: "Existing Client", amount: 250, receivedFor: "For declaration", notes: "" },
    { id: "pay-048", date: "2026-04-24", clientName: "Shruti FNU", leadId: undefined, caseType: "AO", caseNumber: "376", paymentType: "Existing Client", amount: 500, receivedFor: "Monthly payment", notes: "" },
    { id: "pay-049", date: "2026-04-24", clientName: "Simran Kaur 575", leadId: undefined, caseType: "SIJS", caseNumber: "419", paymentType: "Existing Client", amount: 2000, receivedFor: "For state court", notes: "" },
    { id: "pay-050", date: "2026-04-24", clientName: "Rohit Gupta 139 & Aman Kumar 530", leadId: undefined, caseType: "DA", caseNumber: "337 & 332", paymentType: "Existing Client", amount: 1500, receivedFor: "Habeas petition", notes: "" },
    { id: "pay-051", date: "2026-04-24", clientName: "Davinder Singh 501 & Kuldeep Kaur 503", leadId: undefined, caseType: "DA", caseNumber: "405", paymentType: "Existing Client", amount: 500, receivedFor: "For I-589 updates", notes: "" },
    { id: "pay-052", date: "2026-04-24", clientName: "Dilpreet Kaur", leadId: undefined, caseType: "SIJS", caseNumber: "165", paymentType: "Existing Client", amount: 750, receivedFor: "For deferred action", notes: "" },
    // April 27
    { id: "pay-053", date: "2026-04-27", clientName: "Rohit Gupta 139", leadId: undefined, caseType: "DA", caseNumber: "337", paymentType: "Existing Client", amount: 3250, receivedFor: "For habeas petition", notes: "" },
    { id: "pay-054", date: "2026-04-27", clientName: "Aman Kumar 530", leadId: undefined, caseType: "DA", caseNumber: "332", paymentType: "Existing Client", amount: 3250, receivedFor: "For habeas petition", notes: "" },
    { id: "pay-055", date: "2026-04-27", clientName: "Manpreet Singh 814", leadId: undefined, caseType: "DA", caseNumber: "324", paymentType: "Existing Client", amount: 1000, receivedFor: "For motion to advance", notes: "" },
    { id: "pay-056", date: "2026-04-27", clientName: "Davinder Singh 402", leadId: undefined, caseType: "DA", caseNumber: "17", paymentType: "Existing Client", amount: 2000, receivedFor: "For I-589 updates", notes: "" },
    // April 28
    { id: "pay-057", date: "2026-04-28", clientName: "Simranpreet Singh 413", leadId: "lead-021", caseType: "DA", caseNumber: "413", paymentType: "New Client", amount: 1500, receivedFor: "Retainer downpayment (asylum case)", notes: "" },
    { id: "pay-058", date: "2026-04-28", clientName: "Davinder Singh 402", leadId: undefined, caseType: "DA", caseNumber: "17", paymentType: "Existing Client", amount: 1000, receivedFor: "For pleading motion", notes: "" },
    // April 29
    { id: "pay-059", date: "2026-04-29", clientName: "Tinku", leadId: "lead-025", caseType: "DA", caseNumber: "", paymentType: "New Client", amount: 2000, receivedFor: "Retainer downpayment (defensive asylum)", notes: "" },
    { id: "pay-060", date: "2026-04-29", clientName: "Lovepreet Singh", leadId: undefined, caseType: "SIJS", caseNumber: "427", paymentType: "Existing Client", amount: 2000, receivedFor: "For state court", notes: "" },
    { id: "pay-061", date: "2026-04-29", clientName: "Lakhvir Singh Dhaliwal 108", leadId: undefined, caseType: "DA", caseNumber: "412", paymentType: "Existing Client", amount: 1000, receivedFor: "For I-589 updates", notes: "" },
    { id: "pay-062", date: "2026-04-29", clientName: "Mahnoor Gul", leadId: undefined, caseType: "Green Card", caseNumber: "73", paymentType: "Existing Client", amount: 500, receivedFor: "For green card", notes: "" },
    // April 30
    { id: "pay-063", date: "2026-04-30", clientName: "Simranpreet Singh 413", leadId: "lead-021", caseType: "DA", caseNumber: "413", paymentType: "New Client", amount: 1500, receivedFor: "Additional payment (asylum case)", notes: "" },
    { id: "pay-064", date: "2026-04-30", clientName: "Surjit Singh 856", leadId: undefined, caseType: "DA", caseNumber: "386", paymentType: "Existing Client", amount: 1000, receivedFor: "For declaration review", notes: "" },
    { id: "pay-065", date: "2026-04-30", clientName: "Baldev Singh 030", leadId: undefined, caseType: "DA", caseNumber: "410", paymentType: "Existing Client", amount: 1250, receivedFor: "For I-589 updates and declaration", notes: "" },
  ];

   const dayCloses: DayClose[] = [];
  const followUps: FollowUp[] = [];
  return { leads, payments, dayCloses, followUps };
}

// ─── CRUD Operations ──────────────────────────────────────────

export function addLead(data: CRMData, lead: Omit<Lead, "id">): CRMData {
  const newLead: Lead = { ...lead, id: nanoid() };
  return { ...data, leads: [newLead, ...data.leads] };
}

export function updateLead(data: CRMData, id: string, updates: Partial<Lead>): CRMData {
  return { ...data, leads: data.leads.map(l => l.id === id ? { ...l, ...updates } : l) };
}
export function addLeadNote(data: CRMData, leadId: string, text: string): CRMData {
  const note: LeadNote = { id: nanoid(), text, timestamp: new Date().toISOString() };
  return {
    ...data,
    leads: data.leads.map(l =>
      l.id === leadId ? { ...l, leadLog: [...(l.leadLog || []), note] } : l
    ),
  };
}

export function deleteLead(data: CRMData, id: string): CRMData {
  return { ...data, leads: data.leads.filter(l => l.id !== id) };
}

export function addPayment(data: CRMData, payment: Omit<Payment, "id">): CRMData {
  const newPayment: Payment = { ...payment, id: nanoid() };
  return { ...data, payments: [newPayment, ...data.payments] };
}

export function updatePayment(data: CRMData, id: string, updates: Partial<Payment>): CRMData {
  return { ...data, payments: data.payments.map(p => p.id === id ? { ...p, ...updates } : p) };
}

export function deletePayment(data: CRMData, id: string): CRMData {
  return { ...data, payments: data.payments.filter(p => p.id !== id) };
}

// ─── Follow-Up CRUD ───────────────────────────────────────────
export function addFollowUp(data: CRMData, fu: Omit<FollowUp, "id" | "createdAt" | "comments">): CRMData {
  const newFU: FollowUp = { ...fu, id: nanoid(), createdAt: new Date().toISOString(), comments: [] };
  return { ...data, followUps: [newFU, ...data.followUps] };
}
export function updateFollowUp(data: CRMData, id: string, updates: Partial<FollowUp>): CRMData {
  return { ...data, followUps: data.followUps.map(f => f.id === id ? { ...f, ...updates } : f) };
}
export function deleteFollowUp(data: CRMData, id: string): CRMData {
  return { ...data, followUps: data.followUps.filter(f => f.id !== id) };
}
export function addFollowUpComment(data: CRMData, followUpId: string, initial: string, text: string): CRMData {
  const comment: FollowUpComment = { id: nanoid(), initial, text, timestamp: new Date().toISOString() };
  return {
    ...data,
    followUps: data.followUps.map(f =>
      f.id === followUpId ? { ...f, comments: [...f.comments, comment] } : f
    ),
  };
}
export function getLeadFollowUps(data: CRMData, leadId: string): FollowUp[] {
  return data.followUps.filter(f => f.leadId === leadId);
}
export function getPendingFollowUps(data: CRMData): FollowUp[] {
  return data.followUps.filter(f => f.status === "Pending");
}
export function getDueTodayFollowUps(data: CRMData): FollowUp[] {
  const today = new Date().toISOString().split("T")[0];
  return data.followUps.filter(f => f.status === "Pending" && f.dueDate === today);
}
export function getOverdueFollowUps(data: CRMData): FollowUp[] {
  const today = new Date().toISOString().split("T")[0];
  return data.followUps.filter(f => f.status === "Pending" && f.dueDate < today);
}

export function closeDayRecord(data: CRMData, date: string): CRMData {
  const paymentsForDay = data.payments.filter(p => p.date === date);
  const totalNew = paymentsForDay.filter(p => p.paymentType === "New Client").reduce((s, p) => s + p.amount, 0);
  const totalExisting = paymentsForDay.filter(p => p.paymentType === "Existing Client").reduce((s, p) => s + p.amount, 0);
  const totalRevenue = totalNew + totalExisting;
  const record: DayClose = { date, closedAt: new Date().toISOString(), totalNew, totalExisting, totalRevenue };
  const existing = data.dayCloses.filter(d => d.date !== date);
  return { ...data, dayCloses: [...existing, record] };
}

// ─── Analytics Helpers ────────────────────────────────────────

export function getMonthPayments(data: CRMData, year: number, month: number): Payment[] {
  return data.payments.filter(p => {
    const d = new Date(p.date + "T12:00:00"); // midday-safe: prevents UTC midnight rolling to previous day
    return d.getFullYear() === year && d.getMonth() + 1 === month;
  });
}

export function getMonthLeads(data: CRMData, year: number, month: number): Lead[] {
  return data.leads.filter(l => {
    const d = new Date(l.date + "T12:00:00"); // midday-safe: prevents UTC midnight rolling to previous day
    return d.getFullYear() === year && d.getMonth() + 1 === month;
  });
}

export function getWeekPayments(data: CRMData, weekStart: Date, weekEnd: Date): Payment[] {
  return data.payments.filter(p => {
    const d = new Date(p.date + "T12:00:00"); // midday-safe
    return d >= weekStart && d <= weekEnd;
  });
}

export function getClientPayments(data: CRMData, leadId: string): Payment[] {
  return data.payments.filter(p => p.leadId === leadId);
}

export function getLeadTotalReceived(data: CRMData, leadId: string): number {
  return getClientPayments(data, leadId).reduce((s, p) => s + p.amount, 0);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount);
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// Returns weeks as YYYY-MM-DD string ranges to avoid all timezone issues
export function getWeeksInMonth(year: number, month: number): Array<{ label: string; startStr: string; endStr: string }> {
  const weeks: Array<{ label: string; startStr: string; endStr: string }> = [];
  const daysInMonth = new Date(year, month, 0).getDate();
  const toStr = (y: number, m: number, d: number) =>
    `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  let day = 1;
  let weekNum = 1;
  while (day <= daysInMonth) {
    const startDay = day;
    const startDate = new Date(year, month - 1, day);
    // Advance to end of week: stop at Friday (5) or end of month
    while (day <= daysInMonth) {
      const dow = new Date(year, month - 1, day).getDay();
      if (dow === 5) break; // Friday
      if (day === daysInMonth) break; // end of month
      day++;
    }
    const endDay = day;
    weeks.push({
      label: `Week ${weekNum}`,
      startStr: toStr(year, month, startDay),
      endStr: toStr(year, month, endDay),
    });
    // Skip to next Monday (skip Sat + Sun)
    day++;
    while (day <= daysInMonth) {
      const dow = new Date(year, month - 1, day).getDay();
      if (dow !== 0 && dow !== 6) break;
      day++;
    }
    weekNum++;
  }
  return weeks;
}

export interface Targets {
  monthly: { green: number; yellow: number };
  weekly: { green: number; yellow: number };
}

export const DEFAULT_TARGETS: Targets = {
  monthly: { green: 70000, yellow: 50000 },
  weekly: { green: 17500, yellow: 12500 },
};

const TARGETS_KEY = "lawfirm_crm_targets";

export function loadTargets(): Targets {
  try {
    const raw = localStorage.getItem(TARGETS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Targets>;
      return {
        monthly: { ...DEFAULT_TARGETS.monthly, ...(parsed.monthly ?? {}) },
        weekly: { ...DEFAULT_TARGETS.weekly, ...(parsed.weekly ?? {}) },
      };
    }
  } catch {}
  return DEFAULT_TARGETS;
}

export function saveTargets(t: Targets): void {
  localStorage.setItem(TARGETS_KEY, JSON.stringify(t));
}

export function getTargetStatus(amount: number, type: "monthly" | "weekly", targets?: Targets): "green" | "yellow" | "red" {
  const t = (targets ?? DEFAULT_TARGETS)[type];
  if (amount >= t.green) return "green";
  if (amount >= t.yellow) return "yellow";
  return "red";
}
