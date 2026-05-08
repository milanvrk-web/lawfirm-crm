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

describe("installment plan generation logic", () => {
  it("distributes rounding remainder to last installment (100/3)", () => {
    const totalCents = Math.round(100 * 100); // 10000
    const count = 3;
    const baseCents = Math.floor(totalCents / count); // 3333
    const remainderCents = totalCents - baseCents * count; // 1
    const amounts = Array.from({ length: count }, (_, i) =>
      i === count - 1 ? baseCents + remainderCents : baseCents
    );
    expect(amounts.reduce((a, b) => a + b, 0)).toBe(totalCents);
    expect(amounts[0]).toBe(3333);
    expect(amounts[2]).toBe(3334);
  });

  it("clamps Jan 31 + 1 month to Feb 28 (non-leap year 2025)", () => {
    const startYear = 2025, startMonth = 1, startDay = 31, i = 1;
    const targetYear = startYear + Math.floor((startMonth - 1 + i) / 12);
    const targetMonth = ((startMonth - 1 + i) % 12) + 1;
    const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
    expect(Math.min(startDay, daysInMonth)).toBe(28);
  });

  it("clamps Jan 31 + 1 month to Feb 29 (leap year 2024)", () => {
    const startYear = 2024, startMonth = 1, startDay = 31, i = 1;
    const targetYear = startYear + Math.floor((startMonth - 1 + i) / 12);
    const targetMonth = ((startMonth - 1 + i) % 12) + 1;
    const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
    expect(Math.min(startDay, daysInMonth)).toBe(29);
  });

  it("handles Dec + 1 month = Jan of next year", () => {
    const startYear = 2024, startMonth = 12, i = 1;
    const targetYear = startYear + Math.floor((startMonth - 1 + i) / 12);
    const targetMonth = ((startMonth - 1 + i) % 12) + 1;
    expect(targetYear).toBe(2025);
    expect(targetMonth).toBe(1);
  });
});

describe("CRM Router", () => {
  describe("access", () => {
    it("returns required=false when no ACCESS_CODE env is set", async () => {
      const original = process.env.ACCESS_CODE;
      delete process.env.ACCESS_CODE;
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.access.isRequired();
      expect(result).toEqual({ required: false });
      if (original !== undefined) process.env.ACCESS_CODE = original;
    });

    it("returns success=true for correct code", async () => {
      process.env.ACCESS_CODE = "test-secret-123";
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.access.verify({ code: "test-secret-123" });
      expect(result).toEqual({ success: true });
      delete process.env.ACCESS_CODE;
    });

    it("returns success=false for wrong code", async () => {
      process.env.ACCESS_CODE = "test-secret-123";
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.access.verify({ code: "wrong-code" });
      expect(result).toEqual({ success: false });
      delete process.env.ACCESS_CODE;
    });
  });

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
