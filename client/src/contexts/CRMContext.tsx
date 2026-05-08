/* ============================================================
   Law Firm CRM — Global State Context (Database-backed)
   All CRM data is now stored in the database via tRPC.
   Targets (UI preferences) remain in localStorage.
   ============================================================ */
import React, { createContext, useCallback, useContext, useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  type Lead,
  type Payment,
  type FollowUp,
  type DayClose,
  type Targets,
  loadTargets,
  saveTargets,
} from "@/lib/store";

// ─── Types ───────────────────────────────────────────────────

interface CRMContextValue {
  // Data
  leads: Lead[];
  payments: Payment[];
  followUps: FollowUp[];
  dayCloses: DayClose[];
  isLoading: boolean;
  // Targets (localStorage)
  targets: Targets;
  updateTargets: (t: Targets) => void;
  // Leads
  addLead: (lead: Omit<Lead, "id">) => Promise<void>;
  updateLead: (id: string, updates: Partial<Lead>) => Promise<void>;
  deleteLead: (id: string) => Promise<void>;
  // Payments
  addPayment: (payment: Omit<Payment, "id">) => Promise<void>;
  updatePayment: (id: string, updates: Partial<Payment>) => Promise<void>;
  deletePayment: (id: string) => Promise<void>;
  // Day Close
  closeDay: (date: string) => Promise<void>;
  isDayClosed: (date: string) => boolean;
  getDayClose: (date: string) => DayClose | undefined;
  // Follow-Ups
  addFollowUp: (fu: Omit<FollowUp, "id" | "createdAt" | "comments">) => Promise<void>;
  updateFollowUp: (id: string, updates: Partial<FollowUp>) => Promise<void>;
  deleteFollowUp: (id: string) => Promise<void>;
  addFollowUpComment: (followUpId: string, initial: string, text: string) => Promise<void>;
  // Lead Notes (stored separately, fetched per-lead by LeadDetailPanel)
  addLeadNote: (leadId: string, text: string, authorName?: string) => Promise<void>;
}

const CRMContext = createContext<CRMContextValue | null>(null);

// ─── Shape normalizers ────────────────────────────────────────
// The DB returns decimal fields as strings; normalize them to numbers
// and add the `comments` array that the UI expects on FollowUp.

type DbLead = {
  id: string; name: string; phone: string; email: string; caseType: string;
  caseNumber: string; source: string; stage: string; notes: string; date: string;
  retainerBooked: string | number; downpayment: string | number; quotedAmount: string | number;
  referredBy: string; convertedDate?: string | null; lostReason?: string | null;
  createdAt?: Date; updatedAt?: Date;
};

type DbPayment = {
  id: string; date: string; clientName: string; leadId?: string | null;
  caseType: string; caseNumber: string; paymentType: string;
  amount: string | number; receivedFor: string; notes: string;
  createdAt?: Date; updatedAt?: Date;
};

type DbFollowUp = {
  id: string; leadId: string; dueDate: string; status: string; title: string;
  createdAt?: Date; updatedAt?: Date;
};

type DbDayClose = {
  id?: number; date: string; closedAt: string;
  totalNew: string | number; totalExisting: string | number; totalRevenue: string | number;
  createdAt?: Date;
};

type DbComment = {
  id: string; followUpId: string; initial: string; text: string; timestamp: string;
  createdAt?: Date;
};

function normalizeLead(r: DbLead): Lead {
  return {
    id: r.id, name: r.name, phone: r.phone, email: r.email,
    caseType: r.caseType as Lead["caseType"],
    caseNumber: r.caseNumber, source: r.source,
    stage: r.stage as Lead["stage"],
    notes: r.notes, date: r.date,
    retainerBooked: Number(r.retainerBooked),
    downpayment: Number(r.downpayment),
    quotedAmount: Number(r.quotedAmount),
    referredBy: r.referredBy,
    convertedDate: r.convertedDate ?? undefined,
    lostReason: r.lostReason ?? null,
  };
}

function normalizePayment(r: DbPayment): Payment {
  return {
    id: r.id, date: r.date, clientName: r.clientName,
    leadId: r.leadId ?? undefined,
    caseType: r.caseType as Payment["caseType"],
    caseNumber: r.caseNumber,
    paymentType: r.paymentType as Payment["paymentType"],
    amount: Number(r.amount),
    receivedFor: r.receivedFor, notes: r.notes,
  };
}

function normalizeFollowUp(r: DbFollowUp, comments: DbComment[] = []): FollowUp {
  return {
    id: r.id, leadId: r.leadId, dueDate: r.dueDate,
    status: r.status as FollowUp["status"],
    title: r.title,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : (r.createdAt ?? new Date().toISOString()),
    comments: comments.filter(c => c.followUpId === r.id).map(c => ({
      id: c.id, initial: c.initial, text: c.text, timestamp: c.timestamp,
    })),
  };
}

function normalizeDayClose(r: DbDayClose): DayClose {
  return {
    date: r.date, closedAt: r.closedAt,
    totalNew: Number(r.totalNew),
    totalExisting: Number(r.totalExisting),
    totalRevenue: Number(r.totalRevenue),
  };
}

// ─── Provider ────────────────────────────────────────────────

export function CRMProvider({ children }: { children: React.ReactNode }) {
  const [targets, setTargets] = useState<Targets>(() => loadTargets());
  const utils = trpc.useUtils();

  // ─── Queries ───────────────────────────────────────────────
  const { data: rawLeads = [], isLoading: leadsLoading } = trpc.leads.list.useQuery();
  const { data: rawPayments = [], isLoading: paymentsLoading } = trpc.payments.list.useQuery();
  const { data: rawFollowUps = [], isLoading: followUpsLoading } = trpc.followUps.list.useQuery();
  const { data: rawComments = [] } = trpc.followUps.getAllComments.useQuery();
  const { data: rawDayCloses = [], isLoading: dayClosesLoading } = trpc.dayCloses.list.useQuery();

  const isLoading = leadsLoading || paymentsLoading || followUpsLoading || dayClosesLoading;

  // Normalize
  const leads: Lead[] = rawLeads.map(r => normalizeLead(r as DbLead));
  const payments: Payment[] = rawPayments.map(r => normalizePayment(r as DbPayment));
  const followUps: FollowUp[] = rawFollowUps.map(r => normalizeFollowUp(r as DbFollowUp, rawComments as DbComment[]));
  const dayCloses: DayClose[] = rawDayCloses.map(r => normalizeDayClose(r as DbDayClose));

  // ─── Mutations ─────────────────────────────────────────────
  const createLeadMut = trpc.leads.create.useMutation({ onSuccess: () => utils.leads.list.invalidate() });
  const updateLeadMut = trpc.leads.update.useMutation({ onSuccess: () => utils.leads.list.invalidate() });
  const deleteLeadMut = trpc.leads.delete.useMutation({ onSuccess: () => utils.leads.list.invalidate() });

  const createPaymentMut = trpc.payments.create.useMutation({
    onSuccess: () => {
      utils.payments.list.invalidate();
      // Invalidate installment plans so the Payments tab reflects the auto-linked installment
      utils.getInstallmentPlans.invalidate();
    },
  });
  const updatePaymentMut = trpc.payments.update.useMutation({ onSuccess: () => utils.payments.list.invalidate() });
  const deletePaymentMut = trpc.payments.delete.useMutation({
    onSuccess: () => {
      utils.payments.list.invalidate();
      // Invalidate installment plans so the unlinked installment reverts to unpaid
      utils.getInstallmentPlans.invalidate();
    },
  });

  const closeDayMut = trpc.dayCloses.close.useMutation({ onSuccess: () => utils.dayCloses.list.invalidate() });

  const createFollowUpMut = trpc.followUps.create.useMutation({ onSuccess: () => utils.followUps.list.invalidate() });
  const updateFollowUpMut = trpc.followUps.update.useMutation({ onSuccess: () => utils.followUps.list.invalidate() });
  const deleteFollowUpMut = trpc.followUps.delete.useMutation({ onSuccess: () => utils.followUps.list.invalidate() });
  const addCommentMut = trpc.followUps.addComment.useMutation({
    onSuccess: () => {
      utils.followUps.list.invalidate();
      utils.followUps.getAllComments.invalidate();
    }
  });

  const addLeadNoteMut = trpc.leads.addNote.useMutation();

  // ─── Handlers ──────────────────────────────────────────────

  const handleUpdateTargets = useCallback((t: Targets) => {
    setTargets(t);
    saveTargets(t);
  }, []);

  const handleAddLead = useCallback(async (lead: Omit<Lead, "id">) => {
    await createLeadMut.mutateAsync({
      name: lead.name,
      phone: lead.phone,
      email: lead.email,
      caseType: lead.caseType,
      caseNumber: lead.caseNumber,
      source: lead.source,
      stage: lead.stage,
      notes: lead.notes,
      date: lead.date,
      retainerBooked: lead.retainerBooked,
      downpayment: lead.downpayment,
      quotedAmount: lead.quotedAmount,
      referredBy: lead.referredBy,
      convertedDate: lead.convertedDate ?? null,
    });
  }, [createLeadMut]);

  const handleUpdateLead = useCallback(async (id: string, updates: Partial<Lead>) => {
    await updateLeadMut.mutateAsync({ id, data: updates as Parameters<typeof updateLeadMut.mutateAsync>[0]["data"] });
  }, [updateLeadMut]);

  const handleDeleteLead = useCallback(async (id: string) => {
    await deleteLeadMut.mutateAsync({ id });
  }, [deleteLeadMut]);

  const handleAddPayment = useCallback(async (payment: Omit<Payment, "id">) => {
    await createPaymentMut.mutateAsync({
      date: payment.date,
      clientName: payment.clientName,
      leadId: payment.leadId ?? null,
      caseType: payment.caseType,
      caseNumber: payment.caseNumber,
      paymentType: payment.paymentType,
      amount: payment.amount,
      receivedFor: payment.receivedFor,
      notes: payment.notes,
    });
  }, [createPaymentMut]);

  const handleUpdatePayment = useCallback(async (id: string, updates: Partial<Payment>) => {
    await updatePaymentMut.mutateAsync({ id, data: updates as Parameters<typeof updatePaymentMut.mutateAsync>[0]["data"] });
  }, [updatePaymentMut]);

  const handleDeletePayment = useCallback(async (id: string) => {
    await deletePaymentMut.mutateAsync({ id });
  }, [deletePaymentMut]);

  const handleCloseDay = useCallback(async (date: string) => {
    await closeDayMut.mutateAsync({ date });
  }, [closeDayMut]);

  const isDayClosed = useCallback((date: string) => {
    return dayCloses.some(dc => dc.date === date);
  }, [dayCloses]);

  const getDayClose = useCallback((date: string) => {
    return dayCloses.find(dc => dc.date === date);
  }, [dayCloses]);

  const handleAddFollowUp = useCallback(async (fu: Omit<FollowUp, "id" | "createdAt" | "comments">) => {
    await createFollowUpMut.mutateAsync({
      leadId: fu.leadId,
      dueDate: fu.dueDate,
      title: fu.title,
      status: fu.status,
    });
  }, [createFollowUpMut]);

  const handleUpdateFollowUp = useCallback(async (id: string, updates: Partial<FollowUp>) => {
    await updateFollowUpMut.mutateAsync({
      id,
      data: {
        dueDate: updates.dueDate,
        status: updates.status,
        title: updates.title,
      },
    });
  }, [updateFollowUpMut]);

  const handleDeleteFollowUp = useCallback(async (id: string) => {
    await deleteFollowUpMut.mutateAsync({ id });
  }, [deleteFollowUpMut]);

  const handleAddFollowUpComment = useCallback(async (followUpId: string, initial: string, text: string) => {
    await addCommentMut.mutateAsync({ followUpId, initial, text });
  }, [addCommentMut]);

  const handleAddLeadNote = useCallback(async (leadId: string, text: string, authorName?: string) => {
    await addLeadNoteMut.mutateAsync({ leadId, text, authorName });
  }, [addLeadNoteMut]);

  return (
    <CRMContext.Provider value={{
      leads,
      payments,
      followUps,
      dayCloses,
      isLoading,
      targets,
      updateTargets: handleUpdateTargets,
      addLead: handleAddLead,
      updateLead: handleUpdateLead,
      deleteLead: handleDeleteLead,
      addPayment: handleAddPayment,
      updatePayment: handleUpdatePayment,
      deletePayment: handleDeletePayment,
      closeDay: handleCloseDay,
      isDayClosed,
      getDayClose,
      addFollowUp: handleAddFollowUp,
      updateFollowUp: handleUpdateFollowUp,
      deleteFollowUp: handleDeleteFollowUp,
      addFollowUpComment: handleAddFollowUpComment,
      addLeadNote: handleAddLeadNote,
    }}>
      {children}
    </CRMContext.Provider>
  );
}

export function useCRM() {
  const ctx = useContext(CRMContext);
  if (!ctx) throw new Error("useCRM must be used within CRMProvider");
  return ctx;
}
