import { eq, desc, asc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  users,
  leads,
  leadNotes,
  payments,
  dayCloses,
  followUps,
  followUpComments,
  type InsertUser,
  type InsertLead,
  type InsertLeadNote,
  type InsertPayment,
  type InsertDayClose,
  type InsertFollowUp,
  type InsertFollowUpComment,
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
