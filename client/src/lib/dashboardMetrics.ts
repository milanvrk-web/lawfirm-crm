import type { Lead, Payment } from "./store";
import { isConvertedStage } from "@shared/const";
import { canonicalizeLeadSource } from "./leadSources";

export function isDateInMonth(date: string | null | undefined, year: number, month: number): boolean {
  if (!date) return false;
  const [dateYear, dateMonth] = date.slice(0, 7).split("-").map(Number);
  return dateYear === year && dateMonth === month;
}

export function getMonthlyLeadCohort(leads: Lead[], year: number, month: number): Lead[] {
  return leads.filter(lead => isDateInMonth(lead.date, year, month));
}

/** Converted during the selected month, regardless of when the lead entered. */
export function getMonthlyTotalConversions(leads: Lead[], year: number, month: number): Lead[] {
  return leads.filter(lead => isConvertedStage(lead.stage) && isDateInMonth(lead.convertedDate || lead.date, year, month));
}

export type CalendarWeek = {
  label: string;
  startStr: string;
  endStr: string;
  inMonthDays: number;
  target: number;
  yellowTarget: number;
};

/**
 * Monday-to-Sunday calendar weeks clipped to the selected month. Targets are
 * prorated by the number of calendar days belonging to the month.
 */
export function getCalendarWeeksInMonth(year: number, month: number, monthlyTarget: number, monthlyYellowTarget: number): CalendarWeek[] {
  const daysInMonth = new Date(year, month, 0).getDate();
  const toStr = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const weeks: CalendarWeek[] = [];
  for (let day = 1; day <= daysInMonth;) {
    const start = new Date(year, month - 1, day, 12);
    const mondayOffset = (start.getDay() + 6) % 7;
    const weekStart = new Date(start);
    weekStart.setDate(start.getDate() - mondayOffset);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    const clippedStartDay = Math.max(1, weekStart.getMonth() === month - 1 ? weekStart.getDate() : 1);
    const clippedEndDay = Math.min(daysInMonth, weekEnd.getMonth() === month - 1 ? weekEnd.getDate() : daysInMonth);
    const inMonthDays = clippedEndDay - clippedStartDay + 1;
    weeks.push({
      label: `Week ${weeks.length + 1}`,
      startStr: toStr(new Date(year, month - 1, clippedStartDay, 12)),
      endStr: toStr(new Date(year, month - 1, clippedEndDay, 12)),
      inMonthDays,
      target: monthlyTarget * inMonthDays / daysInMonth,
      yellowTarget: monthlyYellowTarget * inMonthDays / daysInMonth,
    });
    day = clippedEndDay + 1;
  }
  return weeks;
}

export function getProratedTargetStatus(actual: number, target: number, yellowTarget: number): "green" | "yellow" | "red" {
  if (actual >= target) return "green";
  if (actual >= yellowTarget) return "yellow";
  return "red";
}

export function getMonthlyPaymentCohort(payments: Payment[], year: number, month: number): Payment[] {
  return payments.filter(payment => isDateInMonth(payment.date, year, month));
}

export function getMonthlyLifecycleLeads(leads: Lead[], year: number, month: number) {
  const cohort = getMonthlyLeadCohort(leads, year, month);
  const converted = cohort.filter(lead => isConvertedStage(lead.stage));
  const lost = cohort.filter(lead => lead.stage === "Lost");
  return { converted, lost };
}

export function sumPayments(payments: Payment[]): number {
  return payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
}

export function getMonthlyRevenue(payments: Payment[]) {
  const newClient = payments.filter(payment => payment.paymentType === "New Client");
  const existingClient = payments.filter(payment => payment.paymentType === "Existing Client");
  const consultation = payments.filter(payment => payment.receivedFor.trim().toLowerCase().includes("consultation"));
  return {
    newClient: sumPayments(newClient),
    existingClient: sumPayments(existingClient),
    total: sumPayments(payments),
    consultation: sumPayments(consultation),
  };
}

export type SourceFunnelRow = {
  source: string;
  leadIds: string[];
  leads: number;
  converted: number;
  lost: number;
  inProgress: number;
  consultations: number;
  consultationsConverted: number;
  newClientRevenue: number;
  existingClientRevenue: number;
  totalReceived: number;
  bookedRetainer: number;
};

export function getSourceFunnelRows(leads: Lead[], payments: Payment[], year: number, month: number): SourceFunnelRow[] {
  const cohort = getMonthlyLeadCohort(leads, year, month);
  const leadById = new Map(leads.map(lead => [lead.id, lead]));
  const paymentsByLead = new Map<string, Payment[]>();
  payments.forEach(payment => {
    if (!payment.leadId) return;
    const current = paymentsByLead.get(payment.leadId) ?? [];
    current.push(payment);
    paymentsByLead.set(payment.leadId, current);
  });
  const rows = new Map<string, SourceFunnelRow>();
  cohort.forEach(lead => {
    const source = canonicalizeLeadSource(lead.source);
    const row = rows.get(source) ?? {
      source, leadIds: [], leads: 0, converted: 0, lost: 0, inProgress: 0,
      consultations: 0, consultationsConverted: 0, newClientRevenue: 0,
      existingClientRevenue: 0, totalReceived: 0, bookedRetainer: 0,
    };
    const linkedPayments = (paymentsByLead.get(lead.id) ?? []).filter(payment => isDateInMonth(payment.date, year, month));
    const consulted = Boolean(lead.consultationBookedDate || linkedPayments.some(payment => payment.receivedFor.trim().toLowerCase().includes("consultation")));
    row.leadIds.push(lead.id);
    row.leads += 1;
    row.consultations += consulted ? 1 : 0;
    if (isConvertedStage(lead.stage)) {
      row.converted += 1;
      row.consultationsConverted += consulted ? 1 : 0;
      row.bookedRetainer += Number(lead.retainerBooked || 0);
    } else if (lead.stage === "Lost") row.lost += 1;
    else row.inProgress += 1;
    row.newClientRevenue += sumPayments(linkedPayments.filter(payment => payment.paymentType === "New Client"));
    row.existingClientRevenue += sumPayments(linkedPayments.filter(payment => payment.paymentType === "Existing Client"));
    row.totalReceived += sumPayments(linkedPayments);
    rows.set(source, row);
  });
  return Array.from(rows.values()).sort((a, b) => b.totalReceived - a.totalReceived || b.leads - a.leads);
}

export type CaseRevenueRow = { caseType: string; payments: number; revenue: number; clientNames: string[] };

export function getExistingClientRevenueByCase(payments: Payment[], year: number, month: number): CaseRevenueRow[] {
  const map = new Map<string, CaseRevenueRow>();
  payments.filter(payment => payment.paymentType === "Existing Client" && isDateInMonth(payment.date, year, month)).forEach(payment => {
    const caseType = payment.caseType || "Unknown";
    const row = map.get(caseType) ?? { caseType, payments: 0, revenue: 0, clientNames: [] };
    row.payments += 1;
    row.revenue += Number(payment.amount || 0);
    if (payment.clientName && !row.clientNames.includes(payment.clientName)) row.clientNames.push(payment.clientName);
    map.set(caseType, row);
  });
  return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
}

export function getLostReasonRows(leads: Lead[], year: number, month: number) {
  const lost = getMonthlyLifecycleLeads(leads, year, month).lost;
  const rows = new Map<string, string[]>();
  lost.forEach(lead => {
    const reason = lead.lostReason?.trim() || "Needs review";
    rows.set(reason, [...(rows.get(reason) ?? []), lead.id]);
  });
  return Array.from(rows.entries()).map(([reason, leadIds]) => ({ reason, leadIds, count: leadIds.length })).sort((a, b) => b.count - a.count || a.reason.localeCompare(b.reason));
}

export function getLeadCohortIdsByOutcome(leads: Lead[], year: number, month: number) {
  const cohort = getMonthlyLeadCohort(leads, year, month);
  return {
    all: cohort.map(lead => lead.id),
    converted: cohort.filter(lead => isConvertedStage(lead.stage)).map(lead => lead.id),
    lost: cohort.filter(lead => lead.stage === "Lost").map(lead => lead.id),
    open: cohort.filter(lead => !isConvertedStage(lead.stage) && lead.stage !== "Lost").map(lead => lead.id),
  };
}
