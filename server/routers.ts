import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { nanoid } from "nanoid";
import * as db from "./db";
import { ENV } from "./_core/env";

// ─── Shared Zod schemas ──────────────────────────────────────

const LeadStageEnum = z.enum(["New Lead", "Consultation", "Follow-Up", "Retained", "Onboarding", "Lost"]);
const CaseTypeEnum = z.enum(["DA", "SIJS", "AOS", "AO", "K1/K2", "U-Visa", "Green Card", "BIA", "Other"]);
const PaymentTypeEnum = z.enum(["New Client", "Existing Client"]);
const FollowUpStatusEnum = z.enum(["Pending", "Done", "Snoozed"]);

const LeadInput = z.object({
  name: z.string().min(1),
  phone: z.string().default(""),
  email: z.string().default(""),
  caseType: CaseTypeEnum,
  caseNumber: z.string().default(""),
  source: z.string().default(""),
  stage: LeadStageEnum.default("New Lead"),
  notes: z.string().default(""),
  date: z.string(),
  retainerBooked: z.number().default(0),
  downpayment: z.number().default(0),
  quotedAmount: z.number().default(0),
  referredBy: z.string().default(""),
  convertedDate: z.string().optional().nullable(),
  lostReason: z.string().optional().nullable(),
  consultationFee: z.number().default(0).optional(),
  assignedTo: z.string().optional().nullable(),
});

const PaymentInput = z.object({
  date: z.string(),
  clientName: z.string().min(1),
  leadId: z.string().optional().nullable(),
  caseType: CaseTypeEnum,
  caseNumber: z.string().default(""),
  paymentType: PaymentTypeEnum,
  amount: z.number(),
  receivedFor: z.string().default(""),
  notes: z.string().default(""),
});

// ─── Router ──────────────────────────────────────────────────

export const appRouter = router({
  system: systemRouter,

  // ─── Access Code ──────────────────────────────────────────
  access: router({
    verify: publicProcedure
      .input(z.object({ code: z.string() }))
      .mutation(({ input }) => {
        // Read directly from process.env so tests can override it
        const correct = process.env.ACCESS_CODE ?? "";
        if (!correct) {
          // No code set — allow access (open mode)
          return { success: true };
        }
        if (input.code === correct) {
          return { success: true };
        }
        return { success: false };
      }),
    isRequired: publicProcedure.query(() => {
      const code = process.env.ACCESS_CODE ?? "";
      return { required: Boolean(code) };
    }),
  }),

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Leads ────────────────────────────────────────────────

  leads: router({
    list: publicProcedure.query(async () => {
      const rows = await db.getAllLeads();
      return rows.map(r => ({
        ...r,
        retainerBooked: Number(r.retainerBooked),
        downpayment: Number(r.downpayment),
        quotedAmount: Number(r.quotedAmount),
        consultationFee: Number((r as any).consultationFee ?? 0),
        assignedTo: (r as any).assignedTo ?? null,
      }));
    }),

    create: publicProcedure.input(LeadInput).mutation(async ({ input }) => {
      const id = nanoid();
      await db.createLead({
        id,
        ...input,
        retainerBooked: String(input.retainerBooked),
        downpayment: String(input.downpayment),
        quotedAmount: String(input.quotedAmount),
        convertedDate: input.convertedDate ?? null,
        lostReason: input.lostReason ?? null,
        consultationFee: String(input.consultationFee ?? 0),
        assignedTo: input.assignedTo ?? null,
      });
      return { id };
    }),

    update: publicProcedure
      .input(z.object({ id: z.string(), data: LeadInput.partial() }))
      .mutation(async ({ input }) => {
        const data: Record<string, unknown> = { ...input.data };
        if (input.data.retainerBooked !== undefined) data.retainerBooked = String(input.data.retainerBooked);
        if (input.data.downpayment !== undefined) data.downpayment = String(input.data.downpayment);
        if (input.data.quotedAmount !== undefined) data.quotedAmount = String(input.data.quotedAmount);
        if (input.data.consultationFee !== undefined) data.consultationFee = String(input.data.consultationFee);
        if (input.data.assignedTo !== undefined) data.assignedTo = input.data.assignedTo ?? null;
        await db.updateLead(input.id, data as Parameters<typeof db.updateLead>[1]);
        return { success: true };
      }),

    delete: publicProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
      await db.deleteLead(input.id);
      return { success: true };
    }),

    // Lead notes
    getNotes: publicProcedure.input(z.object({ leadId: z.string() })).query(async ({ input }) => {
      return db.getLeadNotes(input.leadId);
    }),

    addNote: publicProcedure
      .input(z.object({ leadId: z.string(), text: z.string(), authorName: z.string().optional() }))
      .mutation(async ({ input }) => {
        const id = nanoid();
        await db.createLeadNote({
          id,
          leadId: input.leadId,
          text: input.text,
          timestamp: new Date().toISOString(),
          authorName: input.authorName ?? null,
        });
        return { id };
      }),

    deleteNote: publicProcedure
      .input(z.object({ id: z.string(), leadId: z.string() }))
      .mutation(async ({ input }) => {
        await db.deleteLeadNote(input.id);
        return { ok: true };
      }),

    updateNote: publicProcedure
      .input(z.object({ id: z.string(), leadId: z.string(), text: z.string() }))
      .mutation(async ({ input }) => {
        await db.updateLeadNote(input.id, input.text);
        return { ok: true };
      }),

    // Set or clear the follow-up date on a lead
    setFollowUpDate: publicProcedure
      .input(z.object({ id: z.string(), followUpDate: z.string().nullable() }))
      .mutation(async ({ input }) => {
        await db.updateLead(input.id, { followUpDate: input.followUpDate } as any);
        return { ok: true };
      }),

    // Count reschedules per lead (for warning badge on Kanban cards)
    getRescheduleCounts: publicProcedure.query(async () => {
      return db.getRescheduleCountsForAllLeads();
    }),

    // Get all leads that have a follow-up date set
    withFollowUpDates: publicProcedure.query(async () => {
      const rows = await db.getAllLeads();
      return rows
        .filter(r => (r as any).followUpDate)
        .map(r => ({
          ...r,
          retainerBooked: Number(r.retainerBooked),
          downpayment: Number(r.downpayment),
          quotedAmount: Number(r.quotedAmount),
          consultationFee: Number((r as any).consultationFee ?? 0),
          followUpDate: (r as any).followUpDate as string,
          assignedTo: (r as any).assignedTo ?? null,
        }));
    }),
  }),

  // ─── Payments ─────────────────────────────────────────────

  payments: router({
    list: publicProcedure.query(async () => {
      const rows = await db.getAllPayments();
      return rows.map(r => ({ ...r, amount: Number(r.amount) }));
    }),

    byLead: publicProcedure.input(z.object({ leadId: z.string() })).query(async ({ input }) => {
      const rows = await db.getPaymentsByLead(input.leadId);
      return rows.map(r => ({ ...r, amount: Number(r.amount) }));
    }),

    create: publicProcedure.input(PaymentInput).mutation(async ({ input }) => {
      const id = nanoid();
      // Auto-link to earliest unpaid installment if this payment is for a lead with a plan
      let linkedInstallmentId: string | null = null;
      if (input.leadId) {
        const unpaidItem = await db.getFirstUnpaidInstallmentForLead(input.leadId);
        if (unpaidItem) {
          linkedInstallmentId = unpaidItem.id;
          // Mark the installment as paid
          await db.updateInstallmentItem(unpaidItem.id, {
            isPaid: 1,
            paidDate: input.date,
          });
        }
      }
      await db.createPayment({
        id,
        ...input,
        amount: String(input.amount),
        leadId: input.leadId ?? null,
        linkedInstallmentId,
      });
      return { id, linkedInstallmentId };
    }),

    update: publicProcedure
      .input(z.object({ id: z.string(), data: PaymentInput.partial() }))
      .mutation(async ({ input }) => {
        const data: Record<string, unknown> = { ...input.data };
        if (input.data.amount !== undefined) data.amount = String(input.data.amount);
        await db.updatePayment(input.id, data as Parameters<typeof db.updatePayment>[1]);
        return { success: true };
      }),

    delete: publicProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
      // If this payment was linked to an installment, unmark it as paid
      const allPayments = await db.getAllPayments();
      const payment = allPayments.find(p => p.id === input.id);
      if (payment?.linkedInstallmentId) {
        await db.updateInstallmentItem(payment.linkedInstallmentId, {
          isPaid: 0,
          paidDate: undefined,
        });
      }
      await db.deletePayment(input.id);
      return { success: true };
    }),
  }),

  // ─── Day Closes ───────────────────────────────────────────

  dayCloses: router({
    list: publicProcedure.query(async () => {
      const rows = await db.getAllDayCloses();
      return rows.map(r => ({
        ...r,
        totalNew: Number(r.totalNew),
        totalExisting: Number(r.totalExisting),
        totalRevenue: Number(r.totalRevenue),
      }));
    }),

    delete: publicProcedure
      .input(z.object({ date: z.string() }))
      .mutation(async ({ input }) => {
        await db.deleteDayClose(input.date);
        return { success: true };
      }),

    close: publicProcedure
      .input(z.object({ date: z.string(), closedBy: z.string().optional() }))
      .mutation(async ({ input }) => {
        // Compute totals from payments for that day
        const allPayments = await db.getAllPayments();
        const dayPayments = allPayments.filter(p => p.date === input.date);
        const totalNew = dayPayments.filter(p => p.paymentType === "New Client").reduce((s, p) => s + Number(p.amount), 0);
        const totalExisting = dayPayments.filter(p => p.paymentType === "Existing Client").reduce((s, p) => s + Number(p.amount), 0);
        const totalRevenue = totalNew + totalExisting;
        await db.upsertDayClose({
          date: input.date,
          closedAt: new Date().toISOString(),
          totalNew: String(totalNew),
          totalExisting: String(totalExisting),
          totalRevenue: String(totalRevenue),
          closedBy: input.closedBy ?? null,
        });
        return { success: true, totalNew, totalExisting, totalRevenue };
      }),
  }),

  // ─── Follow-Ups ───────────────────────────────────────────

  followUps: router({
    list: publicProcedure.query(async () => {
      return db.getAllFollowUps();
    }),

    byLead: publicProcedure.input(z.object({ leadId: z.string() })).query(async ({ input }) => {
      return db.getFollowUpsByLead(input.leadId);
    }),

    create: publicProcedure
      .input(z.object({
        leadId: z.string(),
        dueDate: z.string(),
        title: z.string(),
        status: FollowUpStatusEnum.default("Pending"),
        assignedTo: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = nanoid();
        await db.createFollowUp({ id, ...input, assignedTo: input.assignedTo ?? null });
        return { id };
      }),

    update: publicProcedure
      .input(z.object({
        id: z.string(),
        data: z.object({
          dueDate: z.string().optional(),
          status: FollowUpStatusEnum.optional(),
          title: z.string().optional(),
        }),
      }))
      .mutation(async ({ input }) => {
        await db.updateFollowUp(input.id, input.data);
        return { success: true };
      }),

    delete: publicProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
      await db.deleteFollowUp(input.id);
      return { success: true };
    }),

    // Comments
    getComments: publicProcedure.input(z.object({ followUpId: z.string() })).query(async ({ input }) => {
      return db.getFollowUpComments(input.followUpId);
    }),

    getAllComments: publicProcedure.query(async () => {
      return db.getAllFollowUpComments();
    }),

    addComment: publicProcedure
      .input(z.object({ followUpId: z.string(), initial: z.string().default(""), text: z.string() }))
      .mutation(async ({ input }) => {
        const id = nanoid();
        await db.createFollowUpComment({
          id,
          followUpId: input.followUpId,
          initial: input.initial,
          text: input.text,
          timestamp: new Date().toISOString(),
        });
        return { id };
      }),

    deleteComment: publicProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
      await db.deleteFollowUpComment(input.id);
      return { success: true };
    }),
  }),

  // ─── Onboarding Checklist ──────────────────────────────────

  onboarding: router({
    getByLead: publicProcedure
      .input(z.object({ leadId: z.string() }))
      .query(async ({ input }) => {
        return db.getOnboardingChecklist(input.leadId);
      }),

    toggleStep: publicProcedure
      .input(z.object({
        leadId: z.string(),
        step: z.enum(["consultation_booked", "case_notes_created", "task_added_cerenade", "task_added_planner"]),
        completedAt: z.string().nullable(),
        completedBy: z.string().nullable(),
      }))
      .mutation(async ({ input }) => {
        const { nanoid } = await import("nanoid");
        await db.upsertOnboardingStep({
          id: nanoid(),
          leadId: input.leadId,
          step: input.step,
          completedAt: input.completedAt ?? undefined,
          completedBy: input.completedBy ?? undefined,
        });
        return { success: true };
      }),
  }),

  // ─── Data migration: import localStorage data ─────────────

  importData: publicProcedure
    .input(z.object({
      leads: z.array(z.object({
        id: z.string(),
        name: z.string(),
        phone: z.string().default(""),
        email: z.string().default(""),
        caseType: z.string(),
        caseNumber: z.string().default(""),
        source: z.string().default(""),
        stage: LeadStageEnum,
        notes: z.string().default(""),
        date: z.string(),
        retainerBooked: z.number().default(0),
        downpayment: z.number().default(0),
        quotedAmount: z.number().default(0),
        referredBy: z.string().default(""),
        convertedDate: z.string().optional().nullable(),
        leadLog: z.array(z.object({
          id: z.string(),
          text: z.string(),
          timestamp: z.string(),
        })).optional(),
      })),
      payments: z.array(z.object({
        id: z.string(),
        date: z.string(),
        clientName: z.string(),
        leadId: z.string().optional().nullable(),
        caseType: z.string(),
        caseNumber: z.string().default(""),
        paymentType: PaymentTypeEnum,
        amount: z.number(),
        receivedFor: z.string().default(""),
        notes: z.string().default(""),
      })),
      followUps: z.array(z.object({
        id: z.string(),
        leadId: z.string(),
        dueDate: z.string(),
        status: FollowUpStatusEnum,
        title: z.string(),
        createdAt: z.string(),
        comments: z.array(z.object({
          id: z.string(),
          initial: z.string().default(""),
          text: z.string(),
          timestamp: z.string(),
        })).optional(),
      })),
      dayCloses: z.array(z.object({
        date: z.string(),
        closedAt: z.string(),
        totalNew: z.number(),
        totalExisting: z.number(),
        totalRevenue: z.number(),
      })).optional(),
    }))
    .mutation(async ({ input }) => {
      let imported = { leads: 0, payments: 0, followUps: 0, comments: 0, notes: 0, dayCloses: 0 };

      // Import leads
      for (const lead of input.leads) {
        try {
          await db.createLead({
            id: lead.id,
            name: lead.name,
            phone: lead.phone,
            email: lead.email,
            caseType: lead.caseType,
            caseNumber: lead.caseNumber,
            source: lead.source,
            stage: lead.stage,
            notes: lead.notes,
            date: lead.date,
            retainerBooked: String(lead.retainerBooked),
            downpayment: String(lead.downpayment),
            quotedAmount: String(lead.quotedAmount),
            referredBy: lead.referredBy,
            convertedDate: lead.convertedDate ?? null,
          });
          imported.leads++;

          // Import lead notes
          if (lead.leadLog) {
            for (const note of lead.leadLog) {
              try {
                await db.createLeadNote({
                  id: note.id,
                  leadId: lead.id,
                  text: note.text,
                  timestamp: note.timestamp,
                });
                imported.notes++;
              } catch {}
            }
          }
        } catch {}
      }

      // Import payments
      for (const payment of input.payments) {
        try {
          await db.createPayment({
            id: payment.id,
            date: payment.date,
            clientName: payment.clientName,
            leadId: payment.leadId ?? null,
            caseType: payment.caseType,
            caseNumber: payment.caseNumber,
            paymentType: payment.paymentType,
            amount: String(payment.amount),
            receivedFor: payment.receivedFor,
            notes: payment.notes,
          });
          imported.payments++;
        } catch {}
      }

      // Import follow-ups and their comments
      for (const fu of input.followUps) {
        try {
          await db.createFollowUp({
            id: fu.id,
            leadId: fu.leadId,
            dueDate: fu.dueDate,
            status: fu.status,
            title: fu.title,
          });
          imported.followUps++;

          if (fu.comments) {
            for (const comment of fu.comments) {
              try {
                await db.createFollowUpComment({
                  id: comment.id,
                  followUpId: fu.id,
                  initial: comment.initial,
                  text: comment.text,
                  timestamp: comment.timestamp,
                });
                imported.comments++;
              } catch {}
            }
          }
        } catch {}
      }

      // Import day closes
      if (input.dayCloses) {
        for (const dc of input.dayCloses) {
          try {
            await db.upsertDayClose({
              date: dc.date,
              closedAt: dc.closedAt,
              totalNew: String(dc.totalNew),
              totalExisting: String(dc.totalExisting),
              totalRevenue: String(dc.totalRevenue),
            });
            imported.dayCloses++;
          } catch {}
        }
      }

       return { success: true, imported };
    }),

  // ─── Installment Plans ────────────────────────────────────────────

  getInstallmentPlans: publicProcedure
    .input(z.object({ leadId: z.string() }))
    .query(async ({ input }) => {
      const plans = await db.getInstallmentPlansForLead(input.leadId);
      const result = [];
      for (const plan of plans) {
        const items = await db.getInstallmentItemsForPlan(plan.id);
        result.push({
          ...plan,
          totalAmount: Number(plan.totalAmount),
          items: items.map(item => ({
            ...item,
            amount: Number(item.amount),
            isPaid: item.isPaid === 1,
          })),
        });
      }
      return result;
    }),

  createInstallmentPlan: publicProcedure
    .input(z.object({
      leadId: z.string(),
      totalAmount: z.number(),
      installmentCount: z.number().int().min(1).max(120),
      startDate: z.string(),
      notes: z.string().default(""),
    }))
    .mutation(async ({ input }) => {
      const planId = nanoid();
      await db.createInstallmentPlan({
        id: planId,
        leadId: input.leadId,
        totalAmount: String(input.totalAmount),
        installmentCount: input.installmentCount,
        startDate: input.startDate,
        notes: input.notes,
      });
      // Auto-generate installment items
      // Use integer cents to avoid floating-point rounding errors
      const totalCents = Math.round(input.totalAmount * 100);
      const baseCents = Math.floor(totalCents / input.installmentCount);
      const remainderCents = totalCents - baseCents * input.installmentCount;
      const [startYear, startMonth, startDay] = input.startDate.split("-").map(Number);
      for (let i = 0; i < input.installmentCount; i++) {
        // Add remainder to last installment so total always sums exactly
        const itemCents = i === input.installmentCount - 1 ? baseCents + remainderCents : baseCents;
        // Handle month-end overflow: if startDay=31 and target month has fewer days,
        // clamp to the last day of that month
        const targetYear = startYear + Math.floor((startMonth - 1 + i) / 12);
        const targetMonth = ((startMonth - 1 + i) % 12) + 1; // 1-based
        const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
        const targetDay = Math.min(startDay, daysInMonth);
        const dueDateStr = `${targetYear}-${String(targetMonth).padStart(2, "0")}-${String(targetDay).padStart(2, "0")}`;
        await db.createInstallmentItem({
          id: nanoid(),
          planId,
          installmentNumber: i + 1,
          dueDate: dueDateStr,
          amount: String(itemCents / 100),
          isPaid: 0,
        });
      }
      return { id: planId };
    }),

  updateInstallmentPlan: publicProcedure
    .input(z.object({
      id: z.string(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateInstallmentPlan(id, data);
      return { success: true };
    }),

  deleteInstallmentPlan: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await db.deleteInstallmentPlan(input.id);
      return { success: true };
    }),

  toggleInstallmentItemPaid: publicProcedure
    .input(z.object({
      id: z.string(),
      isPaid: z.boolean(),
      paidDate: z.string().optional().nullable(),
    }))
    .mutation(async ({ input }) => {
      await db.updateInstallmentItem(input.id, {
        isPaid: input.isPaid ? 1 : 0,
        paidDate: input.isPaid ? (input.paidDate ?? undefined) : undefined,
      });
      return { success: true };
    }),

  updateInstallmentItemDueDate: publicProcedure
    .input(z.object({ id: z.string(), dueDate: z.string() }))
    .mutation(async ({ input }) => {
      await db.updateInstallmentItem(input.id, { dueDate: input.dueDate });
      return { success: true };
    }),

  // ─── Overdue Installments ─────────────────────────────────────────────────
  getOverdueInstallments: publicProcedure
    .query(async () => {
      const items = await db.getOverdueInstallments();
      return items.map(item => ({
        ...item,
        amount: Number(item.amount),
      }));
    }),
  // ─── Due This Week Installments ───────────────────────────────────────────────────
  getDueThisWeekInstallments: publicProcedure
    .query(async () => {
      const items = await db.getDueThisWeekInstallments();
      return items.map(item => ({
        ...item,
        amount: Number(item.amount),
      }));
    }),

  // ─── Bulk Reschedule Overdue Installments ──────────────────────────────────────────────
  bulkRescheduleOverdue: publicProcedure
    .input(z.object({ newDate: z.string() }))
    .mutation(async ({ input }) => {
      const count = await db.bulkRescheduleOverdueInstallments(input.newDate);
      return { rescheduled: count };
    }),

  // ─── Team Members ────────────────────────────────────────────────────────
  members: router({
    list: publicProcedure.query(async () => {
      return db.getCrmMembers();
    }),

    add: publicProcedure
      .input(z.object({
        name: z.string().min(1),
        role: z.string().default("Staff"),
        color: z.string().default("oklch(0.55 0.18 250)"),
      }))
      .mutation(async ({ input }) => {
        const id = nanoid();
        await db.createCrmMember({ id, name: input.name, role: input.role, color: input.color });
        return { id };
      }),

    remove: publicProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input }) => {
        await db.deleteCrmMember(input.id);
        return { ok: true };
      }),

    update: publicProcedure
      .input(z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        role: z.string().optional(),
        color: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateCrmMember(id, data);
        return { ok: true };
      }),
  }),

  // ─── Pipeline Stage Editor ─────────────────────────────────

  pipeline: router({
    /** Returns all stages ordered by `order`. Seeds defaults on first call. */
    getStages: publicProcedure.query(async () => {
      await db.seedDefaultPipelineStages();
      return db.getPipelineStages();
    }),

    createStage: publicProcedure
      .input(z.object({
        name: z.string().min(1),
        color: z.string().default("oklch(0.55 0.18 250)"),
        order: z.number().int().default(99),
      }))
      .mutation(async ({ input }) => {
        const { nanoid } = await import("nanoid");
        const id = nanoid();
        await db.createPipelineStage({ id, name: input.name, color: input.color, order: input.order, isDefault: 0 });
        return { id };
      }),

    updateStage: publicProcedure
      .input(z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        color: z.string().optional(),
        order: z.number().int().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...updates } = input;
        await db.updatePipelineStage(id, updates);
        return { ok: true };
      }),

    deleteStage: publicProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input }) => {
        await db.deletePipelineStage(input.id);
        return { ok: true };
      }),

    reorderStages: publicProcedure
      .input(z.array(z.object({ id: z.string(), order: z.number().int() })))
      .mutation(async ({ input }) => {
        for (const { id, order } of input) {
          await db.updatePipelineStage(id, { order });
        }
        return { ok: true };
      }),

    /** Returns all checklist templates for a given stage */
    getChecklistTemplates: publicProcedure
      .input(z.object({ stageId: z.string() }))
      .query(async ({ input }) => {
        return db.getStageChecklistTemplates(input.stageId);
      }),

    /** Returns ALL checklist templates across all stages (used by Kanban) */
    getAllChecklistTemplates: publicProcedure.query(async () => {
      return db.getAllStageChecklistTemplates();
    }),

    createChecklistTemplate: publicProcedure
      .input(z.object({
        stageId: z.string(),
        label: z.string().min(1),
        description: z.string().optional(),
        order: z.number().int().default(0),
      }))
      .mutation(async ({ input }) => {
        const { nanoid } = await import("nanoid");
        const id = nanoid();
        await db.createStageChecklistTemplate({ id, stageId: input.stageId, label: input.label, description: input.description ?? null, order: input.order });
        return { id };
      }),

    updateChecklistTemplate: publicProcedure
      .input(z.object({
        id: z.string(),
        label: z.string().min(1).optional(),
        description: z.string().optional(),
        order: z.number().int().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...updates } = input;
        await db.updateStageChecklistTemplate(id, updates);
        return { ok: true };
      }),

    deleteChecklistTemplate: publicProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input }) => {
        await db.deleteStageChecklistTemplate(input.id);
        return { ok: true };
      }),

    /** Toggle completion of a checklist template item for a specific lead */
    toggleCompletion: publicProcedure
      .input(z.object({
        leadId: z.string(),
        templateItemId: z.string(),
        completedAt: z.string().nullable(),
        completedBy: z.string().nullable(),
      }))
      .mutation(async ({ input }) => {
        const { nanoid } = await import("nanoid");
        await db.upsertStageChecklistCompletion({
          id: nanoid(),
          leadId: input.leadId,
          templateItemId: input.templateItemId,
          completedAt: input.completedAt ?? undefined,
          completedBy: input.completedBy ?? undefined,
        });
        return { ok: true };
      }),

    /** Get all completions for a lead */
    getCompletions: publicProcedure
      .input(z.object({ leadId: z.string() }))
      .query(async ({ input }) => {
        return db.getStageChecklistCompletions(input.leadId);
      }),
  }),

  // ─── AI Lead Intelligence ──────────────────────────────────────────────
  intelligence: router({

    /** Get all cached AI analyses */
    getAll: publicProcedure.query(async () => {
      return db.getAllAiAnalyses();
    }),

    /** Get cached AI analysis for a single lead */
    getForLead: publicProcedure
      .input(z.object({ leadId: z.string() }))
      .query(async ({ input }) => {
        return db.getAiAnalysisForLead(input.leadId);
      }),

    /** Analyze a single lead using AI */
    analyzeLead: publicProcedure
      .input(z.object({ leadId: z.string() }))
      .mutation(async ({ input }) => {
        const { invokeLLM } = await import("./_core/llm");
        const lead = await db.getLeadById(input.leadId);
        if (!lead) throw new Error("Lead not found");

        const notes = await db.getLeadNotes(input.leadId);
        const payments = await db.getPaymentsByLead(input.leadId);
        const followUps = await db.getFollowUpsByLead(input.leadId);

        // Build reschedule count from notes
        const rescheduleCount = notes.filter(n => n.text.includes("__RESCHEDULE__")).length;
        const completedFollowUps = notes.filter(n => n.text.includes("__DONE__")).length;
        const daysInPipeline = Math.floor((Date.now() - new Date(lead.date + "T12:00:00").getTime()) / 86400000);
        const hasPayment = payments.length > 0;
        const totalPaid = payments.reduce((s, p) => s + parseFloat(String(p.amount)), 0);

        // Filter out system audit notes for LLM context
        const humanNotes = notes
          .filter(n => !n.text.startsWith("__RESCHEDULE__") && !n.text.startsWith("__DONE__"))
          .map(n => `[${n.timestamp}${n.authorName ? " by " + n.authorName : ""}]: ${n.text}`)
          .join("\n");

        const prompt = `You are an expert immigration law firm CRM analyst. Analyze this lead and provide a priority assessment.

LEAD PROFILE:
- Name: ${lead.name}
- Case Type: ${lead.caseType}
- Stage: ${lead.stage}
- Days in Pipeline: ${daysInPipeline}
- Quoted Amount: $${lead.quotedAmount}
- Retainer Booked: $${lead.retainerBooked}
- Down Payment: $${lead.downpayment}
- Total Paid: $${totalPaid}
- Consultation Fee: $${lead.consultationFee ?? 0}
- Source: ${lead.source || "Unknown"}
- Referred By: ${lead.referredBy || "None"}
- Follow-Up Date: ${lead.followUpDate || "Not scheduled"}
- Times Rescheduled: ${rescheduleCount}
- Completed Follow-Ups: ${completedFollowUps}
- Has Made Payment: ${hasPayment ? "Yes" : "No"}
- Lost Reason: ${lead.lostReason || "N/A"}

NOTES HISTORY (most recent first):
${humanNotes || "No notes recorded"}

Based on this information, provide:
1. A priority tier: Hot (likely to convert soon, high engagement), Warm (interested but needs nurturing), Cold (low engagement, may need re-qualification), or At-Risk (was engaged but going silent or showing disengagement signals)
2. A score from 1-10 (10 = highest priority)
3. A one-line headline summarizing the lead's current status (max 100 chars)
4. A specific recommended next action for the team
5. Up to 3 risk flags (specific concerns or warning signs)
6. Brief reasoning for your assessment`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: "You are an expert CRM analyst for an immigration law firm. Always respond with valid JSON matching the schema exactly." },
            { role: "user", content: prompt },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "lead_analysis",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  tier: { type: "string", enum: ["Hot", "Warm", "Cold", "At-Risk"], description: "Priority tier" },
                  score: { type: "integer", description: "Priority score 1-10" },
                  headline: { type: "string", description: "One-line status summary (max 100 chars)" },
                  nextAction: { type: "string", description: "Specific recommended next action" },
                  riskFlags: { type: "array", items: { type: "string" }, description: "Up to 3 risk flags" },
                  reasoning: { type: "string", description: "Brief reasoning for the assessment" },
                },
                required: ["tier", "score", "headline", "nextAction", "riskFlags", "reasoning"],
                additionalProperties: false,
              },
            },
          },
        });

        const content = response.choices[0]?.message?.content;
        if (!content) throw new Error("No AI response received");

        const parsed = typeof content === "string" ? JSON.parse(content) : content;

        const id = nanoid();
        await db.upsertAiAnalysis({
          id,
          leadId: input.leadId,
          tier: parsed.tier,
          score: Math.min(10, Math.max(1, parsed.score)),
          headline: parsed.headline.slice(0, 500),
          nextAction: parsed.nextAction,
          riskFlags: JSON.stringify(parsed.riskFlags ?? []),
          reasoning: parsed.reasoning,
        });

        return { ok: true, leadId: input.leadId, tier: parsed.tier, score: parsed.score };
      }),

    /** Generate the daily AI Chief of Staff briefing */
    generateBriefing: publicProcedure.mutation(async () => {
      const { invokeLLM } = await import("./_core/llm");
      const allLeads = await db.getAllLeads();
      const activeLeads = allLeads.filter(l => l.stage !== "Lost");
      const analyses = await db.getAllAiAnalyses();
      const members = await db.getCrmMembers();
      const analysisMap = new Map(analyses.map(a => [a.leadId, a]));

      // Build context for the LLM
      const leadSummaries = activeLeads.map(l => {
        const a = analysisMap.get(l.id);
        return `- ${l.name} | ${l.caseType} | Stage: ${l.stage} | Assigned: ${l.assignedTo || "Unassigned"} | Tier: ${a?.tier ?? "Unanalyzed"} | Score: ${a?.score ?? "?"}/10 | Next: ${l.followUpDate || "None"} | Action: ${a?.nextAction ?? "N/A"}`;
      }).join("\n");

      const tierCounts = { Hot: 0, Warm: 0, "At-Risk": 0, Cold: 0, Unanalyzed: 0 };
      for (const l of activeLeads) {
        const a = analysisMap.get(l.id);
        const tier = (a?.tier as keyof typeof tierCounts) ?? "Unanalyzed";
        tierCounts[tier] = (tierCounts[tier] ?? 0) + 1;
      }

      // Pre-group leads by assigned member so the AI can produce accurate per-member task lists
      const memberNames = members.map(m => m.name).join(", ") || "No team members";
      const assignmentGroups: Record<string, string[]> = {};
      for (const l of activeLeads) {
        const owner = l.assignedTo || "Unassigned";
        if (!assignmentGroups[owner]) assignmentGroups[owner] = [];
        const a = analysisMap.get(l.id);
        assignmentGroups[owner].push(`${l.name} (${l.caseType}, ${a?.tier ?? "Unanalyzed"}, next: ${l.followUpDate || "TBD"})`);
      }
      const assignmentContext = Object.entries(assignmentGroups)
        .map(([owner, leads]) => `${owner}: ${leads.join("; ")}`)
        .join("\n");

      const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are the AI Chief of Staff for an immigration law firm. Your job is to generate a concise, actionable daily briefing for the firm's leadership (Sachin, Chief of Staff). Be direct, specific, and prioritize revenue-generating actions. Today is ${today} PST. Team members: ${memberNames}. Khushi is the primary client intake specialist — most new leads are assigned to her. When generating per-member task lists, use the actual lead assignments provided in the prompt, not guesses.`,
          },
          {
            role: "user",
            content: `Generate today's pipeline briefing.\n\nAll active leads (with assigned owner):\n${leadSummaries}\n\nPipeline health: Hot=${tierCounts.Hot}, Warm=${tierCounts.Warm}, At-Risk=${tierCounts["At-Risk"]}, Cold=${tierCounts.Cold}, Unanalyzed=${tierCounts.Unanalyzed}\n\nLead assignments by team member:\n${assignmentContext}\n\nFor memberAssignments, generate 2-4 specific action tasks per person based on their assigned leads. Focus on the most urgent actions (overdue follow-ups, Hot leads needing contact, At-Risk leads needing intervention).`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "daily_briefing",
            strict: true,
            schema: {
              type: "object",
              properties: {
                briefingMarkdown: { type: "string", description: "Full briefing in markdown, 3-5 paragraphs. Start with overall health, then hot leads, then at-risk escalations, then team focus for today." },
                topActions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      leadName: { type: "string" },
                      tier: { type: "string" },
                      action: { type: "string" },
                    },
                    required: ["leadName", "tier", "action"],
                    additionalProperties: false,
                  },
                },
                escalations: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      leadName: { type: "string" },
                      reason: { type: "string" },
                    },
                    required: ["leadName", "reason"],
                    additionalProperties: false,
                  },
                },
                memberAssignments: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      memberName: { type: "string" },
                      tasks: { type: "array", items: { type: "string" } },
                    },
                    required: ["memberName", "tasks"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["briefingMarkdown", "topActions", "escalations", "memberAssignments"],
              additionalProperties: false,
            },
          },
        },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error("No LLM response");
      const parsed = typeof content === "string" ? JSON.parse(content) : content;

      const briefingId = nanoid();
      await db.saveDailyBriefing({
        id: briefingId,
        briefingDate: today,
        content: parsed.briefingMarkdown,
        tierSummary: JSON.stringify(tierCounts),
        topActions: JSON.stringify(parsed.topActions ?? []),
        memberAssignments: JSON.stringify(parsed.memberAssignments ?? []),
        escalations: JSON.stringify(parsed.escalations ?? []),
      });

      return { ok: true, briefingDate: today, briefingId };
    }),

    /** Get the latest daily briefing */
    getLatestBriefing: publicProcedure.query(async () => {
      return db.getLatestBriefing();
    }),

    /** Get briefing history (last 14 days) */
    getBriefingHistory: publicProcedure.query(async () => {
      return db.getBriefingHistory(14);
    }),

    /** Analyze all active (non-Lost) leads in batch */
    analyzeAll: publicProcedure.mutation(async () => {
      const allLeads = await db.getAllLeads();
      const activeLeads = allLeads.filter(l => l.stage !== "Lost" && l.stage !== "Retained");
      const results: { leadId: string; ok: boolean; error?: string }[] = [];

      // Process in small batches to avoid overwhelming the LLM
      for (const lead of activeLeads) {
        try {
          const { invokeLLM } = await import("./_core/llm");
          const notes = await db.getLeadNotes(lead.id);
          const payments = await db.getPaymentsByLead(lead.id);

          const rescheduleCount = notes.filter(n => n.text.includes("__RESCHEDULE__")).length;
          const completedFollowUps = notes.filter(n => n.text.includes("__DONE__")).length;
          const daysInPipeline = Math.floor((Date.now() - new Date(lead.date + "T12:00:00").getTime()) / 86400000);
          const totalPaid = payments.reduce((s, p) => s + parseFloat(String(p.amount)), 0);

          const humanNotes = notes
            .filter(n => !n.text.startsWith("__RESCHEDULE__") && !n.text.startsWith("__DONE__"))
            .map(n => `[${n.timestamp}]: ${n.text}`)
            .join("\n");

          const prompt = `Analyze this immigration law firm lead for priority.

LEAD: ${lead.name} | Case: ${lead.caseType} | Stage: ${lead.stage} | Days: ${daysInPipeline} | Quoted: $${lead.quotedAmount} | Paid: $${totalPaid} | Rescheduled: ${rescheduleCount}x | Completed follow-ups: ${completedFollowUps} | Next follow-up: ${lead.followUpDate || "None"}

NOTES:
${humanNotes || "No notes"}`;

          const response = await invokeLLM({
            messages: [
              { role: "system", content: "You are an expert CRM analyst for an immigration law firm. Respond with valid JSON only." },
              { role: "user", content: prompt },
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "lead_analysis",
                strict: true,
                schema: {
                  type: "object",
                  properties: {
                    tier: { type: "string", enum: ["Hot", "Warm", "Cold", "At-Risk"] },
                    score: { type: "integer" },
                    headline: { type: "string" },
                    nextAction: { type: "string" },
                    riskFlags: { type: "array", items: { type: "string" } },
                    reasoning: { type: "string" },
                  },
                  required: ["tier", "score", "headline", "nextAction", "riskFlags", "reasoning"],
                  additionalProperties: false,
                },
              },
            },
          });

          const content = response.choices[0]?.message?.content;
          if (!content) throw new Error("No response");
          const parsed = typeof content === "string" ? JSON.parse(content) : content;

          await db.upsertAiAnalysis({
            id: nanoid(),
            leadId: lead.id,
            tier: parsed.tier,
            score: Math.min(10, Math.max(1, parsed.score)),
            headline: parsed.headline.slice(0, 500),
            nextAction: parsed.nextAction,
            riskFlags: JSON.stringify(parsed.riskFlags ?? []),
            reasoning: parsed.reasoning,
          });

          results.push({ leadId: lead.id, ok: true });
        } catch (err) {
          results.push({ leadId: lead.id, ok: false, error: String(err) });
        }
      }

      return { total: activeLeads.length, results };
    }),
  }),
});
export type AppRouter = typeof appRouter;