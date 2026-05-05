import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { nanoid } from "nanoid";
import * as db from "./db";
import { ENV } from "./_core/env";

// ─── Shared Zod schemas ──────────────────────────────────────

const LeadStageEnum = z.enum(["New Lead", "Consultation", "Retained", "Lost"]);
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
      .input(z.object({ leadId: z.string(), text: z.string() }))
      .mutation(async ({ input }) => {
        const id = nanoid();
        await db.createLeadNote({
          id,
          leadId: input.leadId,
          text: input.text,
          timestamp: new Date().toISOString(),
        });
        return { id };
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
      await db.createPayment({
        id,
        ...input,
        amount: String(input.amount),
        leadId: input.leadId ?? null,
      });
      return { id };
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

    close: publicProcedure
      .input(z.object({ date: z.string() }))
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
      }))
      .mutation(async ({ input }) => {
        const id = nanoid();
        await db.createFollowUp({ id, ...input });
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
});

export type AppRouter = typeof appRouter;
