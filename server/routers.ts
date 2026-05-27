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

    // Set or clear the follow-up date on a lead
    setFollowUpDate: publicProcedure
      .input(z.object({ id: z.string(), followUpDate: z.string().nullable() }))
      .mutation(async ({ input }) => {
        await db.updateLead(input.id, { followUpDate: input.followUpDate } as any);
        return { ok: true };
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
});
export type AppRouter = typeof appRouter;