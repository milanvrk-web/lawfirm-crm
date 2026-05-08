import { useState, useEffect, useCallback } from "react";
import { X, Clock, ChevronDown, ChevronUp, Plus, Check, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useCRM } from "@/contexts/CRMContext";
import type { Lead } from "@/lib/store";

interface StaleLead {
  lead: Lead;
  lastActivityMs: number;
  daysSinceActivity: number;
  lastActivityLabel: string;
}

interface StaleLeadsDrawerProps {
  open: boolean;
  onClose: () => void;
}

function formatRelativeDate(ms: number): string {
  const days = Math.floor((Date.now() - ms) / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

function getTodayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getDefaultDueDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function stageColor(stage: string): string {
  switch (stage) {
    case "New Lead": return "oklch(0.65 0.18 250)";
    case "Consulted": return "oklch(0.72 0.12 75)";
    case "Retained": return "oklch(0.65 0.18 145)";
    default: return "oklch(0.55 0.01 250)";
  }
}

export default function StaleLeadsDrawer({ open, onClose }: StaleLeadsDrawerProps) {
  const { leads, payments, followUps, addFollowUp } = useCRM();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [forms, setForms] = useState<Record<string, { title: string; dueDate: string; note: string }>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  // Close on Escape
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  }, [onClose]);

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [open, handleKeyDown]);

  // Compute stale leads with last activity info
  const staleLeadList: StaleLead[] = (() => {
    const cutoffMs = Date.now() - 14 * 24 * 60 * 60 * 1000;
    return leads
      .filter(l => l.stage !== "Lost" && l.stage !== "Retained")
      .map(l => {
        const lastPaymentMs = payments
          .filter(p => p.leadId === l.id)
          .map(p => new Date(p.date + "T12:00:00").getTime())
          .reduce((max, t) => Math.max(max, t), 0);
        const lastFollowUpMs = followUps
          .filter(f => f.leadId === l.id)
          .map(f => new Date(f.dueDate + "T12:00:00").getTime())
          .reduce((max, t) => Math.max(max, t), 0);
        const createdMs = new Date(l.date + "T12:00:00").getTime();
        const lastActivityMs = Math.max(createdMs, lastPaymentMs, lastFollowUpMs);
        return { lead: l, lastActivityMs, daysSinceActivity: Math.floor((Date.now() - lastActivityMs) / (1000 * 60 * 60 * 24)), lastActivityLabel: formatRelativeDate(lastActivityMs) };
      })
      .filter(s => s.lastActivityMs < cutoffMs)
      .sort((a, b) => a.lastActivityMs - b.lastActivityMs); // most stale first
  })();

  function getForm(leadId: string) {
    return forms[leadId] ?? { title: "Follow up with client", dueDate: getDefaultDueDate(), note: "" };
  }

  function setForm(leadId: string, updates: Partial<{ title: string; dueDate: string; note: string }>) {
    setForms(prev => ({ ...prev, [leadId]: { ...getForm(leadId), ...updates } }));
  }

  async function handleSave(lead: Lead) {
    const form = getForm(lead.id);
    if (!form.title.trim()) { toast.error("Please enter a task title"); return; }
    if (!form.dueDate) { toast.error("Please select a due date"); return; }
    setSaving(prev => ({ ...prev, [lead.id]: true }));
    try {
      await addFollowUp({
        leadId: lead.id,
        title: form.title.trim(),
        dueDate: form.dueDate,
        status: "Pending",
      });
      toast.success(`Follow-up assigned for ${lead.name}`);
      setExpandedId(null);
      setForms(prev => { const n = { ...prev }; delete n[lead.id]; return n; });
    } catch {
      toast.error("Failed to save follow-up");
    } finally {
      setSaving(prev => ({ ...prev, [lead.id]: false }));
    }
  }

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: "oklch(0 0 0 / 50%)" }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="fixed right-0 top-0 h-full z-50 flex flex-col shadow-2xl"
        style={{
          width: "min(480px, 100vw)",
          background: "oklch(0.14 0.025 250)",
          borderLeft: "1px solid oklch(1 0 0 / 10%)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: "1px solid oklch(1 0 0 / 8%)" }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "oklch(0.70 0.22 25 / 15%)" }}
            >
              <AlertTriangle className="w-4 h-4" style={{ color: "oklch(0.70 0.22 25)" }} />
            </div>
            <div>
              <div className="font-semibold text-sm" style={{ color: "oklch(0.93 0.005 250)" }}>
                Stale Leads
              </div>
              <div className="text-xs" style={{ color: "oklch(0.50 0.01 250)" }}>
                {staleLeadList.length} lead{staleLeadList.length !== 1 ? "s" : ""} with no activity in 14+ days
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors hover:bg-white/8"
            style={{ color: "oklch(0.55 0.01 250)" }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {staleLeadList.length === 0 && (
            <div className="flex flex-col items-center justify-center h-48 gap-3">
              <Check className="w-10 h-10" style={{ color: "oklch(0.65 0.18 145)" }} />
              <div className="text-sm font-medium" style={{ color: "oklch(0.65 0.01 250)" }}>
                No stale leads — all active leads have recent activity!
              </div>
            </div>
          )}

          {staleLeadList.map(({ lead, daysSinceActivity, lastActivityLabel, lastActivityMs }) => {
            const isExpanded = expandedId === lead.id;
            const form = getForm(lead.id);
            const isSaving = saving[lead.id] ?? false;
            const urgencyColor = daysSinceActivity > 30
              ? "oklch(0.70 0.22 25)"
              : daysSinceActivity > 21
              ? "oklch(0.72 0.12 75)"
              : "oklch(0.65 0.01 250)";

            return (
              <div
                key={lead.id}
                className="rounded-lg border overflow-hidden transition-all"
                style={{
                  background: isExpanded ? "oklch(0.18 0.025 250)" : "oklch(0.16 0.025 250)",
                  borderColor: isExpanded ? "oklch(0.72 0.12 75 / 30%)" : "oklch(1 0 0 / 8%)",
                }}
              >
                {/* Lead row */}
                <button
                  className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-white/3 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : lead.id)}
                >
                  {/* Stale duration badge */}
                  <div
                    className="flex-shrink-0 w-12 text-center rounded-md py-1"
                    style={{ background: `${urgencyColor} / 12%` }}
                  >
                    <div className="text-xs font-bold leading-none" style={{ color: urgencyColor }}>
                      {daysSinceActivity}d
                    </div>
                    <div className="text-xs leading-none mt-0.5" style={{ color: urgencyColor, opacity: 0.7 }}>
                      stale
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate" style={{ color: "oklch(0.93 0.005 250)" }}>
                      {lead.name}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className="text-xs px-1.5 py-0.5 rounded"
                        style={{ background: `${stageColor(lead.stage)} / 15%`, color: stageColor(lead.stage) }}
                      >
                        {lead.stage}
                      </span>
                      <span className="text-xs" style={{ color: "oklch(0.50 0.01 250)" }}>
                        {lead.caseType}
                      </span>
                    </div>
                  </div>

                  <div className="flex-shrink-0 flex flex-col items-end gap-1">
                    <div className="flex flex-col items-end gap-0.5">
                      <div className="flex items-center gap-1 text-xs" style={{ color: "oklch(0.45 0.01 250)" }}>
                        <Clock className="w-3 h-3" />
                        <span>{lastActivityLabel}</span>
                      </div>
                      <div className="text-xs" style={{ color: "oklch(0.35 0.01 250)" }}>
                        {new Date(lastActivityMs).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                      </div>
                    </div>
                    <div style={{ color: "oklch(0.55 0.01 250)" }}>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </button>

                {/* Inline follow-up form */}
                {isExpanded && (
                  <div
                    className="px-4 pb-4 pt-2 space-y-3"
                    style={{ borderTop: "1px solid oklch(1 0 0 / 8%)" }}
                  >
                    <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "oklch(0.45 0.01 250)" }}>
                      Assign Follow-Up Task
                    </div>

                    <div>
                      <Label className="text-xs mb-1.5 block" style={{ color: "oklch(0.65 0.01 250)" }}>
                        Task Title *
                      </Label>
                      <Input
                        value={form.title}
                        onChange={e => setForm(lead.id, { title: e.target.value })}
                        placeholder="e.g. Call back, Send documents, Check in"
                        style={{
                          background: "oklch(0.22 0.025 250)",
                          borderColor: "oklch(1 0 0 / 12%)",
                          color: "oklch(0.93 0.005 250)",
                          fontSize: "0.8125rem",
                        }}
                      />
                    </div>

                    <div>
                      <Label className="text-xs mb-1.5 block" style={{ color: "oklch(0.65 0.01 250)" }}>
                        Due Date *
                      </Label>
                      <Input
                        type="date"
                        value={form.dueDate}
                        min={getTodayStr()}
                        onChange={e => setForm(lead.id, { dueDate: e.target.value })}
                        style={{
                          background: "oklch(0.22 0.025 250)",
                          borderColor: "oklch(1 0 0 / 12%)",
                          color: "oklch(0.93 0.005 250)",
                          fontSize: "0.8125rem",
                        }}
                      />
                    </div>

                    <div>
                      <Label className="text-xs mb-1.5 block" style={{ color: "oklch(0.65 0.01 250)" }}>
                        Note (optional)
                      </Label>
                      <Input
                        value={form.note}
                        onChange={e => setForm(lead.id, { note: e.target.value })}
                        placeholder="e.g. Client requested callback, waiting on docs"
                        style={{
                          background: "oklch(0.22 0.025 250)",
                          borderColor: "oklch(1 0 0 / 12%)",
                          color: "oklch(0.93 0.005 250)",
                          fontSize: "0.8125rem",
                        }}
                      />
                    </div>

                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        onClick={() => handleSave(lead)}
                        disabled={isSaving}
                        className="flex-1 gap-1.5 text-xs font-semibold"
                        style={{
                          background: "oklch(0.72 0.12 75)",
                          color: "oklch(0.10 0.02 250)",
                          border: "none",
                        }}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        {isSaving ? "Saving…" : "Assign Task"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setExpandedId(null)}
                        className="text-xs"
                        style={{ borderColor: "oklch(1 0 0 / 12%)", color: "oklch(0.65 0.01 250)" }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        {staleLeadList.length > 0 && (
          <div
            className="px-5 py-3 flex-shrink-0 text-xs"
            style={{ borderTop: "1px solid oklch(1 0 0 / 8%)", color: "oklch(0.40 0.01 250)" }}
          >
            Sorted by most stale first · Leads with any payment or follow-up in the last 14 days are excluded
          </div>
        )}
      </div>
    </>
  );
}
