import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the database module with correct function names
vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue(null),
  upsertUser: vi.fn(),
  getUserByOpenId: vi.fn(),
  getAllLeads: vi.fn().mockResolvedValue([]),
  getLeadById: vi.fn().mockResolvedValue(null),
  createLead: vi.fn().mockImplementation(async (data) => ({ id: "lead-1", ...data })),
  updateLead: vi.fn().mockResolvedValue(undefined),
  deleteLead: vi.fn().mockResolvedValue(undefined),
  getLeadNotes: vi.fn().mockResolvedValue([]),
  createLeadNote: vi.fn().mockResolvedValue(undefined),
  getAllPayments: vi.fn().mockResolvedValue([]),
  getPaymentsByLead: vi.fn().mockResolvedValue([]),
  createPayment: vi.fn().mockImplementation(async (data) => ({ id: "pay-1", ...data })),
  updatePayment: vi.fn().mockResolvedValue(undefined),
  deletePayment: vi.fn().mockResolvedValue(undefined),
  getAllFollowUps: vi.fn().mockResolvedValue([]),
  getFollowUpsByLead: vi.fn().mockResolvedValue([]),
  createFollowUp: vi.fn().mockImplementation(async (data) => ({ id: "fu-1", comments: [], ...data })),
  updateFollowUp: vi.fn().mockResolvedValue(undefined),
  deleteFollowUp: vi.fn().mockResolvedValue(undefined),
  addFollowUpComment: vi.fn().mockResolvedValue(undefined),
  getAllDayCloses: vi.fn().mockResolvedValue([]),
  upsertDayClose: vi.fn().mockResolvedValue(undefined),
}));

function createAuthContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user",
      email: "test@example.com",
      name: "Test User",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("CRM Router", () => {
  describe("leads", () => {
    it("returns empty leads list", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.leads.list();
      expect(result).toEqual([]);
    });

    it("creates a lead and returns it with an id", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      const lead = await caller.leads.create({
        name: "John Doe",
        phone: "555-1234",
        email: "john@example.com",
        caseType: "DA",
        caseNumber: "CR-001",
        stage: "New Lead",
        source: "Referral",
        date: "2026-05-04",
        retainerBooked: 5000,
        downpayment: 1000,
        notes: "Test note",
      });
      expect(lead).toMatchObject({ id: expect.any(String) });
    });
  });

  describe("payments", () => {
    it("returns empty payments list", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.payments.list();
      expect(result).toEqual([]);
    });

    it("creates a payment", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      const payment = await caller.payments.create({
        leadId: "lead-1",
        clientName: "John Doe",
        caseType: "DA",
        caseNumber: "CR-001",
        date: "2026-05-04",
        amount: 2500,
        paymentType: "New Client",
        receivedFor: "Retainer",
        notes: "",
      });
      expect(payment).toMatchObject({ id: expect.any(String) });
    });
  });

  describe("followUps", () => {
    it("returns empty follow-ups list", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.followUps.list();
      expect(result).toEqual([]);
    });

    it("creates a follow-up", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      const fu = await caller.followUps.create({
        leadId: "lead-1",
        title: "Call back",
        dueDate: "2026-05-05",
        status: "Pending",
      });
      expect(fu).toMatchObject({ id: expect.any(String) });
    });
  });
});
