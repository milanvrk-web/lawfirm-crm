import { eq, desc, asc, lt, lte, gte, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  users,
  leads,
  leadNotes,
  payments,
  dayCloses,
  followUps,
  followUpComments,
  installmentPlans,
  installmentItems,
  crmMembers,
  onboardingChecklist,
  pipelineStages,
  stageChecklistTemplates,
  stageChecklistCompletions,
  type InsertOnboardingChecklist,
  type InsertPipelineStage,
  type InsertStageChecklistTemplate,
  type InsertStageChecklistCompletion,
  type InsertUser,
  type InsertLead,
  type InsertLeadNote,
  type InsertPayment,
  type InsertDayClose,
  type InsertFollowUp,
  type InsertFollowUpComment,
  type InsertInstallmentPlan,
  type InsertInstallmentItem,
  type InsertCrmMember,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ─── Leads ─────────────────────────────────────────────────────────────────────────────

export async function getAllLeads() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(leads).orderBy(desc(leads.createdAt));
}

export async function getLeadById(id: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
  return result[0];
}

export async function createLead(data: InsertLead) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(leads).values(data);
  return data;
}

export async function updateLead(id: string, data: Partial<InsertLead>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(leads).set(data).where(eq(leads.id, id));
}

export async function deleteLead(id: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Cascade: delete related payments, follow-ups, and notes first
  await db.delete(payments).where(eq(payments.leadId, id));
  await db.delete(followUps).where(eq(followUps.leadId, id));
  await db.delete(leadNotes).where(eq(leadNotes.leadId, id));
  await db.delete(leads).where(eq(leads.id, id));
}

// ─── Lead Notes ───────────────────────────────────────────────────────────────────────

export async function getLeadNotes(leadId: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(leadNotes).where(eq(leadNotes.leadId, leadId)).orderBy(asc(leadNotes.createdAt));
}

export async function createLeadNote(data: InsertLeadNote) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(leadNotes).values(data);
  return data;
}

export async function deleteLeadNote(id: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(leadNotes).where(eq(leadNotes.id, id));
}

// ─── Payments ───────────────────────────────────────────────────────────────────────────

export async function getAllPayments() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(payments).orderBy(desc(payments.date));
}

export async function getPaymentsByLead(leadId: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(payments).where(eq(payments.leadId, leadId)).orderBy(asc(payments.date));
}

export async function createPayment(data: InsertPayment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(payments).values(data);
  return data;
}

export async function updatePayment(id: string, data: Partial<InsertPayment>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(payments).set(data).where(eq(payments.id, id));
}

export async function deletePayment(id: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(payments).where(eq(payments.id, id));
}

// ─── Day Closes ────────────────────────────────────────────────────────────────────────

export async function getAllDayCloses() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(dayCloses).orderBy(desc(dayCloses.date));
}

export async function upsertDayClose(data: InsertDayClose) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(dayCloses).values(data).onDuplicateKeyUpdate({
    set: {
      closedAt: data.closedAt,
      totalNew: data.totalNew,
      totalExisting: data.totalExisting,
      totalRevenue: data.totalRevenue,
      closedBy: data.closedBy,
    },
  });
}

// ─── Follow-Ups ─────────────────────────────────────────────────────────────────────────

export async function getAllFollowUps() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(followUps).orderBy(asc(followUps.dueDate));
}

export async function getFollowUpsByLead(leadId: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(followUps).where(eq(followUps.leadId, leadId)).orderBy(asc(followUps.dueDate));
}

export async function createFollowUp(data: InsertFollowUp) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(followUps).values(data);
  return data;
}

export async function updateFollowUp(id: string, data: Partial<InsertFollowUp>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(followUps).set(data).where(eq(followUps.id, id));
}

export async function deleteFollowUp(id: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(followUps).where(eq(followUps.id, id));
}

// ─── Follow-Up Comments ───────────────────────────────────────────────────────────────

export async function getAllFollowUpComments() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(followUpComments).orderBy(asc(followUpComments.createdAt));
}

export async function getFollowUpComments(followUpId: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(followUpComments).where(eq(followUpComments.followUpId, followUpId)).orderBy(asc(followUpComments.createdAt));
}

export async function createFollowUpComment(data: InsertFollowUpComment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(followUpComments).values(data);
  return data;
}

export async function deleteFollowUpComment(id: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(followUpComments).where(eq(followUpComments.id, id));
}

// ─── Installment Plans ────────────────────────────────────────────────────────
export async function getInstallmentPlansForLead(leadId: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(installmentPlans).where(eq(installmentPlans.leadId, leadId)).orderBy(asc(installmentPlans.createdAt));
}
export async function createInstallmentPlan(data: InsertInstallmentPlan) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(installmentPlans).values(data);
  return data;
}
export async function updateInstallmentPlan(id: string, data: Partial<InsertInstallmentPlan>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(installmentPlans).set(data).where(eq(installmentPlans.id, id));
}
export async function deleteInstallmentPlan(id: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(installmentItems).where(eq(installmentItems.planId, id));
  await db.delete(installmentPlans).where(eq(installmentPlans.id, id));
}

// ─── Installment Items ────────────────────────────────────────────────────────
export async function getInstallmentItemsForPlan(planId: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(installmentItems).where(eq(installmentItems.planId, planId)).orderBy(asc(installmentItems.installmentNumber));
}
export async function createInstallmentItem(data: InsertInstallmentItem) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(installmentItems).values(data);
  return data;
}
export async function updateInstallmentItem(id: string, data: Partial<InsertInstallmentItem>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(installmentItems).set(data).where(eq(installmentItems.id, id));
}
export async function deleteInstallmentItem(id: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(installmentItems).where(eq(installmentItems.id, id));
}

// ─── Installment Auto-Link Helpers ───────────────────────────────────────────

/** Returns the earliest unpaid installment item across all plans for a given lead. */
export async function getFirstUnpaidInstallmentForLead(leadId: string) {
  const db = await getDb();
  if (!db) return null;
  const plans = await db.select().from(installmentPlans).where(eq(installmentPlans.leadId, leadId));
  if (plans.length === 0) return null;
  for (const plan of plans) {
    const items = await db
      .select()
      .from(installmentItems)
      .where(eq(installmentItems.planId, plan.id))
      .orderBy(asc(installmentItems.installmentNumber));
    const unpaid = items.find(item => item.isPaid === 0);
    if (unpaid) return unpaid;
  }
  return null;
}

/** Returns the payment row linked to a specific installment item id. */
export async function getPaymentByLinkedInstallment(installmentId: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(payments)
    .where(eq(payments.linkedInstallmentId, installmentId))
    .limit(1);
  return result[0] ?? null;
}

/** Returns all unpaid installment items whose due date is before today, with their plan and lead info. */
export async function getOverdueInstallments() {
  const db = await getDb();
  if (!db) return [];
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  // Fetch all unpaid items with a past due date
  const overdueItems = await db
    .select()
    .from(installmentItems)
    .where(and(eq(installmentItems.isPaid, 0), lt(installmentItems.dueDate, today)))
    .orderBy(asc(installmentItems.dueDate));
  if (overdueItems.length === 0) return [];
  // Enrich with plan → lead info
  const planIds = Array.from(new Set(overdueItems.map(i => i.planId)));
  // Fetch all relevant plans in one go using a loop (TiDB-safe)
  const allPlans: (typeof installmentPlans.$inferSelect)[] = [];
  for (const planId of planIds) {
    const rows = await db.select().from(installmentPlans).where(eq(installmentPlans.id, planId));
    allPlans.push(...rows);
  }
  const planMap = new Map(allPlans.map(p => [p.id, p]));
  // Fetch all relevant leads
  const leadIds = Array.from(new Set(allPlans.map(p => p.leadId)));
  const allLeads: (typeof leads.$inferSelect)[] = [];
  for (const leadId of leadIds) {
    const rows = await db.select().from(leads).where(eq(leads.id, leadId));
    allLeads.push(...rows);
  }
  const leadMap = new Map(allLeads.map(l => [l.id, l]));
  return overdueItems.map(item => {
    const plan = planMap.get(item.planId);
    const lead = plan ? leadMap.get(plan.leadId) : undefined;
    return {
      ...item,
      planNotes: plan?.notes ?? "",
      leadId: plan?.leadId ?? "",
      leadName: lead?.name ?? "Unknown",
    };
  });
}

/** Returns all unpaid installment items due within the next 7 days (today through +6 days). */
export async function getDueThisWeekInstallments() {
  const db = await getDb();
  if (!db) return [];
  const today = new Date().toISOString().slice(0, 10);
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextWeekStr = nextWeek.toISOString().slice(0, 10);
  const dueItems = await db
    .select()
    .from(installmentItems)
    .where(and(
      eq(installmentItems.isPaid, 0),
      gte(installmentItems.dueDate, today),
      lt(installmentItems.dueDate, nextWeekStr),
    ))
    .orderBy(asc(installmentItems.dueDate));
  if (dueItems.length === 0) return [];
  const planIds = Array.from(new Set(dueItems.map(i => i.planId)));
  const allPlans: (typeof installmentPlans.$inferSelect)[] = [];
  for (const planId of planIds) {
    const rows = await db.select().from(installmentPlans).where(eq(installmentPlans.id, planId));
    allPlans.push(...rows);
  }
  const planMap = new Map(allPlans.map(p => [p.id, p]));
  const leadIds = Array.from(new Set(allPlans.map(p => p.leadId)));
  const allLeads: (typeof leads.$inferSelect)[] = [];
  for (const leadId of leadIds) {
    const rows = await db.select().from(leads).where(eq(leads.id, leadId));
    allLeads.push(...rows);
  }
  const leadMap = new Map(allLeads.map(l => [l.id, l]));
  return dueItems.map(item => {
    const plan = planMap.get(item.planId);
    const lead = plan ? leadMap.get(plan.leadId) : undefined;
    return {
      ...item,
      planNotes: plan?.notes ?? "",
      leadId: plan?.leadId ?? "",
      leadName: lead?.name ?? "Unknown",
    };
  });
}

/** Updates all overdue (unpaid, past due) installment items to have today's date. */
export async function bulkRescheduleOverdueInstallments(newDate: string): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const today = new Date().toISOString().slice(0, 10);
  // Find all unpaid items with a due date strictly before today
  const overdueItems = await db
    .select()
    .from(installmentItems)
    .where(and(eq(installmentItems.isPaid, 0), lt(installmentItems.dueDate, today)));
  if (overdueItems.length === 0) return 0;
  // Update each one individually (TiDB-safe, avoids IN clause issues)
  for (const item of overdueItems) {
    await db.update(installmentItems).set({ dueDate: newDate }).where(eq(installmentItems.id, item.id));
  }
  return overdueItems.length;
}

// ─── CRM Members ────────────────────────────────────────────────────────────

export async function getCrmMembers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(crmMembers).orderBy(asc(crmMembers.createdAt));
}

export async function createCrmMember(data: InsertCrmMember) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(crmMembers).values(data);
  return data;
}

export async function deleteCrmMember(id: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(crmMembers).where(eq(crmMembers.id, id));
}

// ─── Onboarding Checklist ────────────────────────────────────────────────────
export async function getOnboardingChecklist(leadId: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(onboardingChecklist).where(eq(onboardingChecklist.leadId, leadId));
}

export async function upsertOnboardingStep(data: InsertOnboardingChecklist) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Try insert first; if duplicate (leadId+step), update completedAt/completedBy
  const existing = await db.select().from(onboardingChecklist)
    .where(and(eq(onboardingChecklist.leadId, data.leadId), eq(onboardingChecklist.step, data.step)));
  if (existing.length > 0) {
    await db.update(onboardingChecklist)
      .set({ completedAt: data.completedAt ?? null, completedBy: data.completedBy ?? null })
      .where(eq(onboardingChecklist.id, existing[0].id));
  } else {
    await db.insert(onboardingChecklist).values(data);
  }
}

// ─── Pipeline Stages ─────────────────────────────────────────────────────────
export async function getPipelineStages() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pipelineStages).orderBy(asc(pipelineStages.order));
}

export async function createPipelineStage(data: InsertPipelineStage) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(pipelineStages).values(data);
  return data;
}

export async function updatePipelineStage(id: string, updates: Partial<InsertPipelineStage>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(pipelineStages).set(updates).where(eq(pipelineStages.id, id));
}

export async function deletePipelineStage(id: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(pipelineStages).where(eq(pipelineStages.id, id));
}

// ─── Stage Checklist Templates ───────────────────────────────────────────────
export async function getStageChecklistTemplates(stageId: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(stageChecklistTemplates)
    .where(eq(stageChecklistTemplates.stageId, stageId))
    .orderBy(asc(stageChecklistTemplates.order));
}

export async function getAllStageChecklistTemplates() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(stageChecklistTemplates).orderBy(asc(stageChecklistTemplates.stageId), asc(stageChecklistTemplates.order));
}

export async function createStageChecklistTemplate(data: InsertStageChecklistTemplate) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(stageChecklistTemplates).values(data);
  return data;
}

export async function updateStageChecklistTemplate(id: string, updates: Partial<InsertStageChecklistTemplate>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(stageChecklistTemplates).set(updates).where(eq(stageChecklistTemplates.id, id));
}

export async function deleteStageChecklistTemplate(id: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(stageChecklistTemplates).where(eq(stageChecklistTemplates.id, id));
}

// ─── Stage Checklist Completions (per-lead, per-template-item) ───────────────
export async function getStageChecklistCompletions(leadId: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(stageChecklistCompletions).where(eq(stageChecklistCompletions.leadId, leadId));
}

export async function upsertStageChecklistCompletion(data: InsertStageChecklistCompletion) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select().from(stageChecklistCompletions)
    .where(and(eq(stageChecklistCompletions.leadId, data.leadId), eq(stageChecklistCompletions.templateItemId, data.templateItemId)));
  if (existing.length > 0) {
    await db.update(stageChecklistCompletions)
      .set({ completedAt: data.completedAt ?? null, completedBy: data.completedBy ?? null })
      .where(eq(stageChecklistCompletions.id, existing[0].id));
  } else {
    await db.insert(stageChecklistCompletions).values(data);
  }
}

export async function seedDefaultPipelineStages() {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(pipelineStages);
  if (existing.length > 0) return; // already seeded
  const { nanoid } = await import("nanoid");
  const defaults = [
    { id: nanoid(), name: "New Lead",     color: "oklch(0.55 0.18 250)", order: 0, isDefault: 1 },
    { id: nanoid(), name: "Consultation", color: "oklch(0.72 0.15 80)",  order: 1, isDefault: 1 },
    { id: nanoid(), name: "Follow-Up",    color: "oklch(0.65 0.20 300)", order: 2, isDefault: 1 },
    { id: nanoid(), name: "Retained",     color: "oklch(0.55 0.18 145)", order: 3, isDefault: 1 },
    { id: nanoid(), name: "Onboarding",   color: "oklch(0.65 0.18 200)", order: 4, isDefault: 1 },
    { id: nanoid(), name: "Lost",         color: "oklch(0.60 0.22 25)",  order: 5, isDefault: 1 },
  ];
  for (const stage of defaults) {
    await db.insert(pipelineStages).values(stage);
  }
  // Seed Onboarding checklist templates
  const onboardingStage = defaults.find(s => s.name === "Onboarding")!;
  const checklistItems = [
    { id: nanoid(), stageId: onboardingStage.id, label: "Consultation Booked",     description: "Attorney consultation has been scheduled and confirmed with the client", order: 0 },
    { id: nanoid(), stageId: onboardingStage.id, label: "Case Notes Created",       description: "Initial case notes and intake information documented in the system",    order: 1 },
    { id: nanoid(), stageId: onboardingStage.id, label: "Task Added in Cerenade",   description: "Case task created and assigned in Cerenade case management",            order: 2 },
    { id: nanoid(), stageId: onboardingStage.id, label: "Task Added in Planner",    description: "Task added to team planner for workflow tracking",                     order: 3 },
  ];
  for (const item of checklistItems) {
    await db.insert(stageChecklistTemplates).values(item);
  }
}

// ─── Delete Day Close ─────────────────────────────────────────────────────────
export async function deleteDayClose(date: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(dayCloses).where(eq(dayCloses.date, date));
}
