import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";
import { useCRM } from "@/contexts/CRMContext";
import { useActiveMember } from "@/contexts/ActiveMemberContext";
import { type Lead, formatCurrency } from "@/lib/store";
import { todayPST } from "@/lib/timezone";
import { LOSS_REASON_OPTIONS, isLossReasonComplete } from "@/lib/lossReasons";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

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
  const isComplete = isLossReasonComplete(reason, customReason);

  useEffect(() => {
    if (!lead) return;
    const savedReason = lead.lostReason?.trim() ?? "";
    const isStandardReason = LOSS_REASON_OPTIONS.some(option => option === savedReason);
    setReason(isStandardReason ? savedReason : savedReason ? "Other" : "");
    setCustomReason(isStandardReason ? (lead.lostReasonDetail ?? "") : savedReason);
    setNote(lead.lostNote ?? "");
  }, [lead]);

  const close = () => {
    setReason("");
    setCustomReason("");
    setNote("");
    onClose();
  };

  const handleConfirm = async () => {
    if (!lead || !isComplete) {
      toast.error("Choose a loss reason. Other reasons must include a short explanation.");
      return;
    }
    const isExistingLostLead = lead.stage === "Lost";
    await updateLead(lead.id, {
      stage: "Lost",
      lostReason: reason,
      lostReasonDetail: reason === "Other" ? customReason.trim() : null,
      lostNote: note.trim() || null,
      lostDate: lead.lostDate ?? todayPST(),
      followUpDate: null,
      actorName: activeMember?.name ?? "Team",
    });
    toast.success(isExistingLostLead ? `${lead.name}'s loss review updated` : `${lead.name} marked as Lost with a reviewable reason`);
    onMarkedLost?.();
    close();
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
          {lead?.stage === "Lost" ? "Complete or correct this loss record so reporting remains accurate." : "This removes the lead from active work. Choose a reason; notes are optional unless you select Other."}
        </p>

        {((lead?.consultationFee ?? 0) > 0 || (lead?.quotedAmount ?? 0) > 0) && (
          <div className="rounded-lg px-3 py-2.5 space-y-1" style={{ background: "oklch(0.22 0.025 250)", border: "1px solid oklch(1 0 0 / 10%)" }}>
            <p className="text-xs font-semibold" style={{ color: "oklch(0.65 0.01 250)" }}>Revenue context</p>
            {(lead?.consultationFee ?? 0) > 0 && <p className="text-xs" style={{ color: "oklch(0.70 0.01 250)" }}>Consultation fee collected: <strong style={{ color: "oklch(0.72 0.12 75)" }}>{formatCurrency(lead?.consultationFee ?? 0)}</strong></p>}
            {(lead?.quotedAmount ?? 0) > 0 && <p className="text-xs" style={{ color: "oklch(0.70 0.01 250)" }}>Quoted retainer: <strong style={{ color: "oklch(0.70 0.22 25)" }}>{formatCurrency(lead?.quotedAmount ?? 0)}</strong></p>}
          </div>
        )}

        <div className="space-y-2">
          <Label className="text-xs" style={{ color: "oklch(0.75 0.01 250)" }}>Primary loss reason *</Label>
          <div className="grid grid-cols-2 gap-2">
            {LOSS_REASON_OPTIONS.map(option => (
              <button key={option} onClick={() => setReason(option)} className="text-left px-3 py-2 rounded-lg text-xs transition-all" style={{ background: reason === option ? "oklch(0.70 0.22 25 / 20%)" : "oklch(0.22 0.025 250)", border: reason === option ? "1px solid oklch(0.70 0.22 25 / 60%)" : "1px solid oklch(1 0 0 / 8%)", color: reason === option ? "oklch(0.82 0.22 25)" : "oklch(0.75 0.01 250)" }}>{option}</button>
            ))}
          </div>
          {reason === "Other" && <Input value={customReason} onChange={e => setCustomReason(e.target.value)} placeholder="Specify the primary reason *" style={{ background: "oklch(0.22 0.025 250)", borderColor: "oklch(1 0 0 / 12%)", color: "oklch(0.93 0.005 250)" }} />}
        </div>

        <div>
          <Label className="text-xs mb-1.5 block" style={{ color: "oklch(0.75 0.01 250)" }}>Additional note <span style={{ color: "oklch(0.50 0.01 250)" }}>(optional)</span></Label>
          <Textarea value={note} onChange={e => setNote(e.target.value)} rows={3} placeholder="Optional context, conversation details, or future review note." style={{ background: "oklch(0.22 0.025 250)", borderColor: "oklch(1 0 0 / 12%)", color: "oklch(0.93 0.005 250)" }} />
        </div>

        <div className="flex gap-3 mt-1">
          <Button onClick={handleConfirm} disabled={!isComplete} style={{ background: "oklch(0.60 0.22 25)", color: "oklch(0.98 0 0)" }}>{lead?.stage === "Lost" ? "Save Loss Review" : "Confirm Lost"}</Button>
          <Button variant="outline" onClick={close} style={{ borderColor: "oklch(1 0 0 / 20%)", color: "oklch(0.65 0.01 250)" }}>Cancel</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
