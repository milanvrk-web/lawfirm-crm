import { useEffect, useMemo, useState } from "react";
import { Trash2, Unlink } from "lucide-react";
import { toast } from "sonner";
import { type Lead, formatCurrency, formatDate } from "@/lib/store";
import { paymentSelectionMatches } from "@/lib/paymentSelection";
import { trpc } from "@/lib/trpc";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface LeadDeleteDialogProps {
  lead: Lead | null;
  onClose: () => void;
  onDeleted?: () => void;
}

export default function LeadDeleteDialog({ lead, onClose, onDeleted }: LeadDeleteDialogProps) {
  const utils = trpc.useUtils();
  const linkedPaymentInput = useMemo(() => ({ leadId: lead?.id ?? "" }), [lead?.id]);
  const linkedPaymentQueryOptions = useMemo(() => ({ enabled: Boolean(lead) }), [Boolean(lead)]);
  const { data: linkedPayments } = trpc.payments.byLead.useQuery(
    linkedPaymentInput,
    linkedPaymentQueryOptions,
  );
  const resolvedLinkedPayments = linkedPayments ?? [];
  const linkedPaymentIdSignature = linkedPayments?.map(payment => payment.id).sort().join(",") ?? "";
  const linkedPaymentIds = useMemo(
    () => linkedPaymentIdSignature ? linkedPaymentIdSignature.split(",") : [],
    [linkedPaymentIdSignature],
  );
  const [selectedPaymentIds, setSelectedPaymentIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setSelectedPaymentIds(current => {
      const next = new Set(linkedPaymentIds);
      return paymentSelectionMatches(current, linkedPaymentIds) ? current : next;
    });
  }, [lead?.id, linkedPaymentIds]);

  const deleteMutation = trpc.leads.delete.useMutation({
    onSuccess: ({ deletedPaymentCount, unlinkedPaymentCount }) => {
      utils.leads.list.invalidate();
      utils.payments.list.invalidate();
      toast.success(
        `${lead?.name ?? "Lead"} deleted · ${deletedPaymentCount} payment${deletedPaymentCount === 1 ? "" : "s"} deleted${unlinkedPaymentCount ? ` · ${unlinkedPaymentCount} unlinked` : ""}`
      );
      onDeleted?.();
      onClose();
    },
    onError: () => toast.error("Unable to delete this lead. No data was changed."),
  });

  const selectedCount = selectedPaymentIds.size;
  const retainedCount = resolvedLinkedPayments.length - selectedCount;
  const selectedTotal = useMemo(
    () => resolvedLinkedPayments.filter(payment => selectedPaymentIds.has(payment.id)).reduce((sum, payment) => sum + payment.amount, 0),
    [resolvedLinkedPayments, selectedPaymentIds]
  );

  const togglePayment = (paymentId: string) => {
    setSelectedPaymentIds(current => {
      const next = new Set(current);
      next.has(paymentId) ? next.delete(paymentId) : next.add(paymentId);
      return next;
    });
  };

  const handleConfirm = () => {
    if (!lead) return;
    deleteMutation.mutate({ id: lead.id, paymentIdsToDelete: Array.from(selectedPaymentIds) });
  };

  return (
    <Dialog open={Boolean(lead)} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="max-w-xl" style={{ background: "oklch(0.18 0.025 250)", borderColor: "oklch(0.70 0.22 25 / 45%)", color: "oklch(0.93 0.005 250)" }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" style={{ fontFamily: "'Playfair Display', serif", color: "oklch(0.93 0.005 250)" }}>
            <Trash2 className="w-5 h-5" style={{ color: "oklch(0.70 0.22 25)" }} />
            Delete {lead?.name}?
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm" style={{ color: "oklch(0.68 0.01 250)" }}>
          Select which linked payments should be deleted with the lead. Unchecked payments are retained as historical revenue and safely unlinked.
        </p>

        {resolvedLinkedPayments.length > 0 ? (
          <div className="rounded-lg border overflow-hidden" style={{ borderColor: "oklch(1 0 0 / 12%)" }}>
            <div className="px-3 py-2 text-xs font-semibold flex justify-between" style={{ background: "oklch(0.22 0.025 250)", color: "oklch(0.72 0.12 75)" }}>
              <span>Linked payments ({resolvedLinkedPayments.length})</span>
              <span>{selectedCount} selected · {formatCurrency(selectedTotal)}</span>
            </div>
            <div className="max-h-56 overflow-y-auto divide-y" style={{ borderColor: "oklch(1 0 0 / 8%)" }}>
              {resolvedLinkedPayments.map(payment => {
                const selected = selectedPaymentIds.has(payment.id);
                return (
                  <label key={payment.id} className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-white/5" style={{ background: selected ? "oklch(0.70 0.22 25 / 8%)" : undefined }}>
                    <input type="checkbox" checked={selected} onChange={() => togglePayment(payment.id)} className="accent-red-500" />
                    <span className="flex-1 min-w-0 text-xs" style={{ color: "oklch(0.80 0.005 250)" }}>
                      {formatDate(payment.date)} · {payment.receivedFor || payment.paymentType}
                    </span>
                    <span className="text-xs font-semibold" style={{ color: selected ? "oklch(0.82 0.22 25)" : "oklch(0.55 0.18 145)" }}>{formatCurrency(payment.amount)}</span>
                  </label>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="rounded-lg px-3 py-3 text-sm" style={{ background: "oklch(0.22 0.025 250)", color: "oklch(0.60 0.01 250)" }}>No payments are linked to this lead.</div>
        )}

        <div className="rounded-lg px-3 py-2.5 text-xs" style={{ background: "oklch(0.60 0.22 25 / 10%)", color: "oklch(0.78 0.15 25)" }}>
          This will delete the lead and {selectedCount} selected payment{selectedCount === 1 ? "" : "s"}.{retainedCount > 0 && <span className="ml-1"><Unlink className="inline w-3 h-3" /> {retainedCount} payment{retainedCount === 1 ? "" : "s"} will be kept and unlinked.</span>}
        </div>

        <div className="flex gap-3 mt-1">
          <Button disabled={deleteMutation.isPending} onClick={handleConfirm} style={{ background: "oklch(0.60 0.22 25)", color: "oklch(0.98 0 0)" }}>
            <Trash2 className="w-4 h-4 mr-2" /> Delete Lead + {selectedCount} Payment{selectedCount === 1 ? "" : "s"}
          </Button>
          <Button variant="outline" onClick={onClose} style={{ borderColor: "oklch(1 0 0 / 20%)", color: "oklch(0.65 0.01 250)" }}>Cancel</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
