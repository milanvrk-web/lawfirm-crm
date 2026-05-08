import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── CRM: Leads ──────────────────────────────────────────────

export const leads = mysqlTable("leads", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }).default("").notNull(),
  email: varchar("email", { length: 320 }).default("").notNull(),
  caseType: varchar("caseType", { length: 50 }).notNull(),
  caseNumber: varchar("caseNumber", { length: 100 }).default("").notNull(),
  source: varchar("source", { length: 100 }).default("").notNull(),
  stage: mysqlEnum("stage", ["New Lead", "Consultation", "Follow-Up", "Retained", "Onboarding", "Lost"]).default("New Lead").notNull(),
  notes: text("notes").notNull(),
  date: varchar("date", { length: 10 }).notNull(),
  retainerBooked: decimal("retainerBooked", { precision: 10, scale: 2 }).default("0").notNull(),
  downpayment: decimal("downpayment", { precision: 10, scale: 2 }).default("0").notNull(),
  quotedAmount: decimal("quotedAmount", { precision: 10, scale: 2 }).default("0").notNull(),
  referredBy: varchar("referredBy", { length: 255 }).default("").notNull(),
  convertedDate: varchar("convertedDate", { length: 10 }),
  lostReason: varchar("lostReason", { length: 255 }),
  consultationFee: decimal("consultationFee", { precision: 10, scale: 2 }).default("0"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DbLead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;

// ─── CRM: Onboarding Checklist ───────────────────────────────

export const onboardingChecklist = mysqlTable("onboarding_checklist", {
  id: varchar("id", { length: 36 }).primaryKey(),
  leadId: varchar("leadId", { length: 36 }).notNull(),
  step: mysqlEnum("step", [
    "consultation_booked",
    "case_notes_created",
    "task_added_cerenade",
    "task_added_planner",
  ]).notNull(),
  completedAt: varchar("completedAt", { length: 30 }),  // ISO string or null
  completedBy: varchar("completedBy", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DbOnboardingChecklist = typeof onboardingChecklist.$inferSelect;
export type InsertOnboardingChecklist = typeof onboardingChecklist.$inferInsert;

// ─── CRM: Lead Notes ─────────────────────────────────────────

export const leadNotes = mysqlTable("lead_notes", {
  id: varchar("id", { length: 36 }).primaryKey(),
  leadId: varchar("leadId", { length: 36 }).notNull(),
  text: text("text").notNull(),
  timestamp: varchar("timestamp", { length: 30 }).notNull(),
  authorName: varchar("authorName", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DbLeadNote = typeof leadNotes.$inferSelect;
export type InsertLeadNote = typeof leadNotes.$inferInsert;

// ─── CRM: Payments ───────────────────────────────────────────

export const payments = mysqlTable("payments", {
  id: varchar("id", { length: 36 }).primaryKey(),
  date: varchar("date", { length: 10 }).notNull(),
  clientName: varchar("clientName", { length: 255 }).notNull(),
  leadId: varchar("leadId", { length: 36 }),
  caseType: varchar("caseType", { length: 50 }).notNull(),
  caseNumber: varchar("caseNumber", { length: 100 }).default("").notNull(),
  paymentType: mysqlEnum("paymentType", ["New Client", "Existing Client"]).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  receivedFor: varchar("receivedFor", { length: 500 }).default("").notNull(),
  notes: text("notes").notNull(),
  linkedInstallmentId: varchar("linkedInstallmentId", { length: 36 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DbPayment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;

// ─── CRM: Day Closes ─────────────────────────────────────────

export const dayCloses = mysqlTable("day_closes", {
  id: int("id").autoincrement().primaryKey(),
  date: varchar("date", { length: 10 }).notNull().unique(),
  closedAt: varchar("closedAt", { length: 30 }).notNull(),
  totalNew: decimal("totalNew", { precision: 10, scale: 2 }).notNull(),
  totalExisting: decimal("totalExisting", { precision: 10, scale: 2 }).notNull(),
  totalRevenue: decimal("totalRevenue", { precision: 10, scale: 2 }).notNull(),
  closedBy: varchar("closedBy", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DbDayClose = typeof dayCloses.$inferSelect;
export type InsertDayClose = typeof dayCloses.$inferInsert;

// ─── CRM: Follow-Ups ─────────────────────────────────────────

export const followUps = mysqlTable("follow_ups", {
  id: varchar("id", { length: 36 }).primaryKey(),
  leadId: varchar("leadId", { length: 36 }).notNull(),
  dueDate: varchar("dueDate", { length: 10 }).notNull(),
  status: mysqlEnum("status", ["Pending", "Done", "Snoozed"]).default("Pending").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  assignedTo: varchar("assignedTo", { length: 100 }),
});

export type DbFollowUp = typeof followUps.$inferSelect;
export type InsertFollowUp = typeof followUps.$inferInsert;

// ─── CRM: Follow-Up Comments ─────────────────────────────────

export const followUpComments = mysqlTable("follow_up_comments", {
  id: varchar("id", { length: 36 }).primaryKey(),
  followUpId: varchar("followUpId", { length: 36 }).notNull(),
  initial: varchar("initial", { length: 10 }).default("").notNull(),
  text: text("text").notNull(),
  timestamp: varchar("timestamp", { length: 30 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DbFollowUpComment = typeof followUpComments.$inferSelect;
export type InsertFollowUpComment = typeof followUpComments.$inferInsert;

// ─── CRM: Installment Plans ─────────────────────────────────────

export const installmentPlans = mysqlTable("installment_plans", {
  id: varchar("id", { length: 36 }).primaryKey(),
  leadId: varchar("leadId", { length: 36 }).notNull(),
  totalAmount: decimal("totalAmount", { precision: 10, scale: 2 }).notNull(),
  installmentCount: int("installmentCount").notNull(),
  startDate: varchar("startDate", { length: 10 }).notNull(),
  notes: text("notes").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DbInstallmentPlan = typeof installmentPlans.$inferSelect;
export type InsertInstallmentPlan = typeof installmentPlans.$inferInsert;

// ─── CRM: Installment Items ────────────────────────────────────

export const installmentItems = mysqlTable("installment_items", {
  id: varchar("id", { length: 36 }).primaryKey(),
  planId: varchar("planId", { length: 36 }).notNull(),
  installmentNumber: int("installmentNumber").notNull(),
  dueDate: varchar("dueDate", { length: 10 }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paidDate: varchar("paidDate", { length: 10 }),
  isPaid: int("isPaid").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DbInstallmentItem = typeof installmentItems.$inferSelect;
export type InsertInstallmentItem = typeof installmentItems.$inferInsert;
// ─── CRM: Team Members ─────────────────────────────────────────

export const crmMembers = mysqlTable("crm_members", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  role: varchar("role", { length: 50 }).notNull().default("Staff"),
  color: varchar("color", { length: 30 }).notNull().default("oklch(0.55 0.18 250)"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DbCrmMember = typeof crmMembers.$inferSelect;
export type InsertCrmMember = typeof crmMembers.$inferInsert;

// ─── Pipeline Stages (dynamic, user-editable) ──────────────────
export const pipelineStages = mysqlTable("pipeline_stages", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  color: varchar("color", { length: 60 }).notNull().default("oklch(0.55 0.18 250)"),
  /** Sort order — lower = further left in Kanban */
  order: int("order").notNull().default(0),
  /** True for system stages that cannot be deleted */
  isDefault: int("isDefault").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type DbPipelineStage = typeof pipelineStages.$inferSelect;
export type InsertPipelineStage = typeof pipelineStages.$inferInsert;

// ─── Stage Checklist Templates (sub-tasks per stage) ───────────
export const stageChecklistTemplates = mysqlTable("stage_checklist_templates", {
  id: varchar("id", { length: 36 }).primaryKey(),
  stageId: varchar("stageId", { length: 36 }).notNull(),
  label: varchar("label", { length: 200 }).notNull(),
  description: text("description"),
  /** Sort order within the stage */
  order: int("order").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type DbStageChecklistTemplate = typeof stageChecklistTemplates.$inferSelect;
export type InsertStageChecklistTemplate = typeof stageChecklistTemplates.$inferInsert;

// ─── Stage Checklist Completions (per-lead, per-template-item) ─
export const stageChecklistCompletions = mysqlTable("stage_checklist_completions", {
  id: varchar("id", { length: 36 }).primaryKey(),
  leadId: varchar("leadId", { length: 36 }).notNull(),
  templateItemId: varchar("templateItemId", { length: 36 }).notNull(),
  completedAt: varchar("completedAt", { length: 30 }),
  completedBy: varchar("completedBy", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type DbStageChecklistCompletion = typeof stageChecklistCompletions.$inferSelect;
export type InsertStageChecklistCompletion = typeof stageChecklistCompletions.$inferInsert;
