import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";
import { useCRM } from "@/contexts/CRMContext";
import { useActiveMember } from "@/contexts/ActiveMemberContext";
import { type Lead, formatCurrency } from "@/lib/store";
import { todayPST } from "@/lib/timezone";
import {
  LOSS_REASON_OPTIONS,
  LOSS_REASON_DETAIL_REQUIRED,
  getLossReasonDetailError,
  getLossReasonDetailLabel,
  getLossReasonDetailPlaceholder,
  getLossReasonValidationMessage,
  shouldShowLossReasonDetail,
  normalizeLossReason,
  PAYMENT_REFUSAL_SUBREASONS,
  isPaymentRefusalReason,
} from "@/lib/lossReasons";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface LostLeadDialogProps {
  lead: Lead | null;
  onClose: () => void;
  onMarkedLost?: () => void;
}

export default function LostLeadDialog({ lead, onClose, onMarkedLost }: LostLeadDialogProps) {
  const { updateLead } = useCRM();
  const { activeMember } = useActiveMember();
  const [reason, setReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [note, setNote] = useState("");
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [saving, setSaving] = useState(false);
  const validationMessage = getLossReasonValidationMessage(reason, customReason, note);
  const reasonError = attemptedSubmit && !reason ? "Select a loss reason before continuing." : null;
  const detailError = attemptedSubmit && reason && getLossReasonDetailError(reason) && !customReason.trim()
    ? getLossReasonDetailError(reason)
    : null;
  const noteError = attemptedSubmit && !note.trim() ? "Additional notes are required to explain why this lead was lost." : null;

  useEffect(() => {
    if (!lead) return;
    const savedReason = normalizeLossReason(lead.lostReason?.trim() ?? "");
    const isStandardReason = LOSS_REASON_OPTIONS.some(option => option === savedReason);
    setReason(isStandardReason ? savedReason : "");
    setCustomReason(isStandardReason ? (lead.lostReasonDetail ?? "") : "");
    setNote(lead.lostNote ?? "");
    setAttemptedSubmit(false);
    setSaving(false);
  }, [lead]);

  const close = () => {
    setReason("");
    setCustomReason("");
    setNote("");
    setAttemptedSubmit(false);
    setSaving(false);
    onClose();
  };

  const handleConfirm = async () => {
    setAttemptedSubmit(true);
    if (!lead || validationMessage) {
      toast.error(validationMessage ?? "Select a loss reason and add supporting notes before continuing.");
      return;
    }
    setSaving(true);
    try {
      const isExistingLostLead = lead.stage === "Lost";
      await updateLead(lead.id, {
        stage: "Lost",
        lostReason: normalizeLossReason(reason),
        lostReasonDetail: shouldShowLossReasonDetail(reason) ? customReason.trim() || null : null,
        lostNote: note.trim(),
        lostDate: lead.lostDate ?? todayPST(),
        followUpDate: null,
        actorName: activeMember?.name ?? "Team",
      });
      toast.success(isExistingLostLead ? `${lead.name}'s loss review updated` : `${lead.name} marked as Lost with a reviewable reason`);
      onMarkedLost?.();
      close();
    } catch (error) {
      setSaving(false);
      toast.error(error instanceof Error ? error.message : "Could not save the loss review. Please try again.");
    }
  };

  return (
    <Dialog open={!!lead} onOpenChange={open => { if (!open) close(); }}>
      <DialogContent className="max-w-lg" style={{ background: "oklch(0.18 0.025 250)", borderColor: "oklch(0.70 0.22 25 / 40%)", color: "oklch(0.93 0.005 250)" }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" style={{ fontFamily: "'Playfair Display', serif", color: "oklch(0.93 0.005 250)" }}>
            <AlertCircle className="w-5 h-5" style={{ color: "oklch(0.70 0.22 25)" }} />
            {lead?.stage === "Lost" ? `Complete Loss Review for ${lead.name}` : `Mark ${lead?.name} as Lost`}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm" style={{ color: "oklch(0.60 0.01 250)" }}>
          {lead?.stage === "Lost" ? "Complete or correct this loss record so reporting remains accurate." : "This removes the lead from active work. Choose a reason and document the supporting conversation before confirming."}
        </p>

        {((lead?.consultationFee ?? 0) > 0 || (lead?.quotedAmount ?? 0) > 0) && (
          <div className="rounded-lg px-3 py-2.5 space-y-1" style={{ background: "oklch(0.22 0.025 250)", border: "1px solid oklch(1 0 0 / 10%)" }}>
            <p className="text-xs font-semibold" style={{ color: "oklch(0.65 0.01 250)" }}>Revenue context</p>
            {(lead?.consultationFee ?? 0) > 0 && <p className="text-xs" style={{ color: "oklch(0.70 0.01 250)" }}>Consultation fee collected: <strong style={{ color: "oklch(0.72 0.12 75)" }}>{formatCurrency(lead?.consultationFee ?? 0)}</strong></p>}
            {(lead?.quotedAmount ?? 0) > 0 && <p className="text-xs" style={{ color: "oklch(0.70 0.01 250)" }}>Quoted retainer: <strong style={{ color: "oklch(0.70 0.22 25)" }}>{formatCurrency(lead?.quotedAmount ?? 0)}</strong></p>}
          </div>
        )}

        <div className="space-y-2">
          <Label className="text-xs" style={{ color: "oklch(0.75 0.01 250)" }}>Primary loss reason <span style={{ color: "oklch(0.70 0.22 25)" }}>*</span></Label>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Primary loss reason">
            {LOSS_REASON_OPTIONS.map(option => {
              const selected = reason === option;
              return (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => { setReason(option); setCustomReason(""); setAttemptedSubmit(false); }}
                  className="min-h-10 text-left px-3 py-2 rounded-lg text-xs font-medium opacity-100 cursor-pointer transition-colors hover:border-[oklch(0.72_0.12_75/70%)] hover:text-[oklch(0.92_0.12_75)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[oklch(0.72_0.12_75)]"
                  style={{
                    background: selected ? "oklch(0.70 0.22 25 / 22%)" : "oklch(0.25 0.035 250)",
                    border: selected ? "1px solid oklch(0.70 0.22 25 / 75%)" : "1px solid oklch(1 0 0 / 22%)",
                    color: selected ? "oklch(0.92 0.12 75)" : "oklch(0.84 0.01 250)",
                  }}
                >{option}</button>
              );
            })}
          </div>
          {reasonError && <p className="text-xs" role="alert" style={{ color: "oklch(0.78 0.16 25)" }}>{reasonError}</p>}
          {isPaymentRefusalReason(reason) && (
            <div className="space-y-1.5">
              <Label className="text-xs" style={{ color: "oklch(0.75 0.01 250)" }}>Why didn't the client want to pay? <span style={{ color: "oklch(0.70 0.22 25)" }}>*</span></Label>
              <Select value={customReason} onValueChange={setCustomReason}>
                <SelectTrigger aria-invalid={!!detailError} style={{ background: "oklch(0.22 0.025 250)", borderColor: detailError ? "oklch(0.70 0.22 25)" : "oklch(1 0 0 / 12%)", color: "oklch(0.93 0.005 250)" }}>
                  <SelectValue placeholder="Select a payment refusal reason..." />
                </SelectTrigger>
                <SelectContent style={{ background: "oklch(0.22 0.025 250)", borderColor: "oklch(1 0 0 / 12%)" }}>
                  {PAYMENT_REFUSAL_SUBREASONS.map(subreason => <SelectItem key={subreason} value={subreason}>{subreason}</SelectItem>)}
                </SelectContent>
              </Select>
              {detailError && <p className="text-xs" role="alert" style={{ color: "oklch(0.78 0.16 25)" }}>{detailError}</p>}
            </div>
          )}
          {reason === LOSS_REASON_DETAIL_REQUIRED && (
            <div className="space-y-1.5">
              <Label className="text-xs" style={{ color: "oklch(0.75 0.01 250)" }}>{getLossReasonDetailLabel(reason)}</Label>
              <Input value={customReason} onChange={e => setCustomReason(e.target.value)} placeholder={getLossReasonDetailPlaceholder(reason)} aria-invalid={!!detailError} style={{ background: "oklch(0.22 0.025 250)", borderColor: detailError ? "oklch(0.70 0.22 25)" : "oklch(1 0 0 / 12%)", color: "oklch(0.93 0.005 250)" }} />
              {detailError && <p className="text-xs" role="alert" style={{ color: "oklch(0.78 0.16 25)" }}>{detailError}</p>}
            </div>
          )}
          {reason === "Attorney declined to take the case" && (
            <div className="space-y-1.5">
              <Label className="text-xs" style={{ color: "oklch(0.75 0.01 250)" }}>Why did the attorney decline to take the case? *</Label>
              <Input value={customReason} onChange={e => setCustomReason(e.target.value)} placeholder="Explain why the attorney declined..." aria-invalid={!!detailError} style={{ background: "oklch(0.22 0.025 250)", borderColor: detailError ? "oklch(0.70 0.22 25)" : "oklch(1 0 0 / 12%)", color: "oklch(0.93 0.005 250)" }} />
              {detailError && <p className="text-xs" role="alert" style={{ color: "oklch(0.78 0.16 25)" }}>{detailError}</p>}
            </div>
          )}
        </div>

        <div>
          <Label className="text-xs mb-1.5 block" style={{ color: "oklch(0.75 0.01 250)" }}>Additional notes <span style={{ color: "oklch(0.70 0.22 25)" }}>* required</span></Label>
          <Textarea value={note} onChange={e => setNote(e.target.value)} rows={4} placeholder="Explain what happened, what was discussed, and why the lead was lost..." aria-invalid={!!noteError} style={{ background: "oklch(0.22 0.025 250)", borderColor: noteError ? "oklch(0.70 0.22 25)" : "oklch(1 0 0 / 12%)", color: "oklch(0.93 0.005 250)" }} />
          {noteError && <p className="text-xs mt-1.5" role="alert" style={{ color: "oklch(0.78 0.16 25)" }}>{noteError}</p>}
        </div>

        <div className="flex gap-3 mt-1">
          <Button onClick={handleConfirm} disabled={saving} style={{ background: "oklch(0.60 0.22 25)", color: "oklch(0.98 0 0)" }}>{saving ? "Saving…" : lead?.stage === "Lost" ? "Save Loss Review" : "Confirm Lost"}</Button>
          <Button variant="outline" onClick={close} disabled={saving} style={{ borderColor: "oklch(1 0 0 / 20%)", color: "oklch(0.65 0.01 250)" }}>Cancel</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
