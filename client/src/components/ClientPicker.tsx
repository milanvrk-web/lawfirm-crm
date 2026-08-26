import { useEffect, useMemo, useRef, useState } from "react";
import { Search, UserRound, X, ExternalLink, CreditCard, BriefcaseBusiness } from "lucide-react";
import { type Lead, type Payment, formatCurrency, formatDate } from "@/lib/store";
import { hydrateLeadFromNotes } from "@/lib/clientRecord";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";

export function normalizeSearch(value: string): string {
  return value.toLocaleLowerCase().replace(/[^a-z0-9]/g, "");
}

export function matchesLead(lead: Lead, query: string): boolean {
  const normalizedQuery = normalizeSearch(query);
  if (!normalizedQuery) return false;
  return [lead.name, lead.phone, lead.email, lead.alienNumber ?? "", lead.caseNumber]
    .some(value => normalizeSearch(value).includes(normalizedQuery));
}

function personKey(lead: Lead): string {
  return [normalizeSearch(lead.name), normalizeSearch(lead.phone), normalizeSearch(lead.email), normalizeSearch(lead.alienNumber ?? "")].filter(Boolean).join("|");
}

function relatedPeople(selected: Lead, leads: Lead[]): Lead[] {
  const selectedName = normalizeSearch(selected.name);
  const selectedPhone = normalizeSearch(selected.phone);
  const selectedEmail = normalizeSearch(selected.email);
  const selectedAlien = normalizeSearch(selected.alienNumber ?? "");
  return leads.filter(lead => {
    if (lead.id === selected.id) return true;
    if (selectedPhone && normalizeSearch(lead.phone) === selectedPhone) return true;
    if (selectedEmail && normalizeSearch(lead.email) === selectedEmail) return true;
    if (selectedAlien && normalizeSearch(lead.alienNumber ?? "") === selectedAlien) return true;
    return Boolean(selectedName && normalizeSearch(lead.name) === selectedName);
  });
}

export interface ClientPickerProps {
  label?: string;
  value: string;
  selectedLeadId?: string | null;
  leads: Lead[];
  payments: Payment[];
  placeholder?: string;
  onValueChange: (value: string) => void;
  onSelect: (lead: Lead) => void;
  onClear?: () => void;
  showPreview?: boolean;
  className?: string;
}

export function ClientPreviewCard({ lead, leads, payments }: { lead: Lead; leads: Lead[]; payments: Payment[] }) {
  const profileQuery = trpc.leads.getProfile.useQuery({ id: lead.id });
  const profileLead = hydrateLeadFromNotes((profileQuery.data?.lead as Lead | undefined) ?? lead);
  const profileLeads = (profileQuery.data?.relatedLeads as Lead[] | undefined) ?? relatedPeople(profileLead, leads);
  const linkedLeadIds = new Set(profileLeads.map(item => item.id));
  const historyPayments = profileQuery.data?.payments ?? payments.filter(payment => payment.leadId && linkedLeadIds.has(payment.leadId));
  const totalPayments = historyPayments.reduce((sum, payment) => sum + payment.amount, 0);

  return (
    <div className="mt-2 rounded-lg border p-3" style={{ background: "oklch(0.16 0.025 250)", borderColor: "oklch(0.72 0.12 75 / 28%)" }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <UserRound className="w-4 h-4 flex-shrink-0" style={{ color: "oklch(0.72 0.12 75)" }} />
            <p className="text-sm font-semibold truncate" style={{ color: "oklch(0.93 0.005 250)" }}>{profileLead.name}</p>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ color: "oklch(0.55 0.18 145)", background: "oklch(0.55 0.18 145 / 14%)" }}>Selected record</span>
          </div>
          <p className="text-[11px] mt-1" style={{ color: "oklch(0.55 0.01 250)" }}>{profileLead.stage} · intake {formatDate(profileLead.date)}</p>
        </div>
        <a href={`/leads?lead=${encodeURIComponent(profileLead.id)}`} className="inline-flex items-center gap-1 text-[11px] hover:underline flex-shrink-0" style={{ color: "oklch(0.72 0.12 75)" }}>
          Open profile <ExternalLink className="w-3 h-3" />
        </a>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mt-3 text-[11px]" style={{ color: "oklch(0.68 0.01 250)" }}>
        {profileLead.phone && <span>Phone: {profileLead.phone}</span>}
        {profileLead.email && <span className="truncate" title={profileLead.email}>Email: {profileLead.email}</span>}
        {profileLead.alienNumber && <span>A#: {profileLead.alienNumber}</span>}
        {profileLead.dateOfBirth && <span>DOB: {formatDate(profileLead.dateOfBirth)}</span>}
        {profileLead.preferredLanguage && <span>Language: {profileLead.preferredLanguage}</span>}
        {profileLead.address && <span className="col-span-2 truncate" title={profileLead.address}>Address: {profileLead.address}</span>}
        <span>Case: {profileLead.caseType}{profileLead.caseNumber ? ` · #${profileLead.caseNumber}` : ""}</span>
        <span>Source: {profileLead.source || "—"}</span>
        {profileLead.referredBy && <span>Referred by: {profileLead.referredBy}</span>}
      </div>
      {profileLead.notes && (
        <div className="mt-3 rounded-md px-2 py-1.5 text-[11px]" style={{ background: "oklch(0.22 0.025 250)", color: "oklch(0.68 0.01 250)" }}>
          <span className="uppercase tracking-wider text-[10px]" style={{ color: "oklch(0.50 0.01 250)" }}>Stored notes</span>
          <p className="mt-0.5 line-clamp-3 whitespace-pre-wrap">{profileLead.notes}</p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2 mt-3">
        <div className="rounded-md px-2 py-1.5" style={{ background: "oklch(0.22 0.025 250)" }}>
          <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider" style={{ color: "oklch(0.50 0.01 250)" }}><BriefcaseBusiness className="w-3 h-3" /> Cases / leads</div>
          <p className="text-sm font-semibold mt-0.5" style={{ color: "oklch(0.85 0.005 250)" }}>{profileLeads.length}</p>
        </div>
        <div className="rounded-md px-2 py-1.5" style={{ background: "oklch(0.22 0.025 250)" }}>
          <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider" style={{ color: "oklch(0.50 0.01 250)" }}><CreditCard className="w-3 h-3" /> Payments</div>
          <p className="text-sm font-semibold mt-0.5" style={{ color: "oklch(0.72 0.12 75)" }}>{formatCurrency(totalPayments)} <span className="text-[10px] font-normal" style={{ color: "oklch(0.50 0.01 250)" }}>({historyPayments.length})</span></p>
        </div>
      </div>
      {profileLeads.length > 0 && (
        <div className="mt-3 space-y-1">
          <p className="text-[10px] uppercase tracking-wider" style={{ color: "oklch(0.50 0.01 250)" }}>History</p>
          {profileLeads.slice(0, 4).map(item => (
            <div key={item.id} className="flex items-center justify-between gap-2 text-[11px]" style={{ color: "oklch(0.67 0.01 250)" }}>
              <span className="truncate">{item.caseType}{item.caseNumber ? ` #${item.caseNumber}` : ""}</span>
              <span className="flex-shrink-0" style={{ color: "oklch(0.55 0.01 250)" }}>{item.stage}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ClientPicker({
  label = "Client name",
  value,
  selectedLeadId,
  leads,
  payments,
  placeholder = "Search name, phone, A-number, or email",
  onValueChange,
  onSelect,
  onClear,
  showPreview = true,
  className = "",
}: ClientPickerProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [pendingLead, setPendingLead] = useState<Lead | null>(null);
  const [fetchProfileId, setFetchProfileId] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const matches = useMemo(() => {
    if (value.trim().length < 2) return [];
    const seen = new Set<string>();
    return leads.filter(lead => matchesLead(lead, value)).filter(lead => {
      const key = personKey(lead) || lead.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 8);
  }, [leads, value]);
  const selectedLead = selectedLeadId ? leads.find(lead => lead.id === selectedLeadId) : undefined;
  const profileInput = useMemo(() => ({ id: fetchProfileId ?? "" }), [fetchProfileId]);
  const profileQuery = trpc.leads.getProfile.useQuery(profileInput, { enabled: Boolean(fetchProfileId) });

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  useEffect(() => setActiveIndex(0), [value]);

  useEffect(() => {
    if (!fetchProfileId) return;
    if (profileQuery.data) {
      onSelect(hydrateLeadFromNotes(profileQuery.data.lead as unknown as Lead));
      setPendingLead(null);
      setFetchProfileId(null);
    } else if (profileQuery.isError && pendingLead) {
      onSelect(pendingLead);
      setPendingLead(null);
      setFetchProfileId(null);
    }
  }, [fetchProfileId, pendingLead, profileQuery.data, profileQuery.isError, onSelect]);

  const chooseLead = (lead: Lead) => {
    setPendingLead(lead);
    setFetchProfileId(lead.id);
    setOpen(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || matches.length === 0) {
      if (event.key === "ArrowDown" && matches.length > 0) { setOpen(true); event.preventDefault(); }
      return;
    }
    if (event.key === "ArrowDown") { setActiveIndex(index => Math.min(index + 1, matches.length - 1)); event.preventDefault(); }
    if (event.key === "ArrowUp") { setActiveIndex(index => Math.max(index - 1, 0)); event.preventDefault(); }
    if (event.key === "Enter") { chooseLead(matches[activeIndex]); event.preventDefault(); }
    if (event.key === "Escape") { setOpen(false); event.preventDefault(); }
  };

  return (
    <div ref={rootRef} className={className}>
      <label className="text-xs mb-1.5 block" style={{ color: "oklch(0.65 0.01 250)" }}>{label}</label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "oklch(0.50 0.01 250)" }} />
        <Input
          value={value}
          placeholder={placeholder}
          role="combobox"
          aria-expanded={open && matches.length > 0}
          aria-controls="client-picker-results"
          aria-activedescendant={open && matches[activeIndex] ? `client-picker-option-${matches[activeIndex].id}` : undefined}
          aria-autocomplete="list"
          onFocus={() => { if (matches.length > 0) setOpen(true); }}
          onKeyDown={handleKeyDown}
          onChange={event => { onValueChange(event.target.value); setOpen(event.target.value.trim().length >= 2); }}
          className="pl-9 pr-9"
          style={{ background: "oklch(0.22 0.025 250)", borderColor: selectedLeadId ? "oklch(0.55 0.18 145 / 60%)" : "oklch(1 0 0 / 12%)", color: "oklch(0.93 0.005 250)" }}
        />
        {(value || selectedLeadId) && (
          <button type="button" aria-label="Clear client selection" onClick={() => { onClear?.(); onValueChange(""); setOpen(false); }} className="absolute right-2 top-1/2 -translate-y-1/2 p-1" style={{ color: "oklch(0.55 0.01 250)" }}>
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        {open && value.trim().length >= 2 && (
          <div id="client-picker-results" role="listbox" className="absolute z-[80] left-0 right-0 top-full mt-1 rounded-lg border shadow-2xl overflow-hidden" style={{ background: "oklch(0.22 0.025 250)", borderColor: "oklch(1 0 0 / 15%)" }}>
            {matches.length > 0 ? matches.map((lead, index) => {
              const paymentCount = payments.filter(payment => payment.leadId === lead.id).length;
              return (
                <button
                  type="button"
                  key={lead.id}
                  id={`client-picker-option-${lead.id}`}
                  role="option"
                  aria-selected={activeIndex === index}
                  onMouseDown={event => event.preventDefault()}
                  onClick={() => chooseLead(lead)}
                  className="w-full text-left px-3 py-2.5 transition-colors"
                  style={{ background: activeIndex === index ? "oklch(0.72 0.12 75 / 12%)" : "transparent" }}
                  onMouseEnter={() => setActiveIndex(index)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium truncate" style={{ color: "oklch(0.93 0.005 250)" }}>{lead.name}{fetchProfileId === lead.id ? " · Loading…" : ""}</span>
                    <span className="text-[10px] flex-shrink-0" style={{ color: "oklch(0.55 0.18 145)" }}>{lead.stage}</span>
                  </div>
                  <div className="text-xs truncate mt-0.5" style={{ color: "oklch(0.58 0.01 250)" }}>
                    {[lead.phone, lead.alienNumber ? `A# ${lead.alienNumber}` : "", lead.email].filter(Boolean).join(" · ") || `${lead.caseType}${lead.caseNumber ? ` · #${lead.caseNumber}` : ""}`}
                    {paymentCount > 0 && ` · ${paymentCount} payment${paymentCount === 1 ? "" : "s"}`}
                  </div>
                </button>
              );
            }) : (
              <div className="px-3 py-3 text-xs" style={{ color: "oklch(0.58 0.01 250)" }}>No existing record matches. This name will be treated as a new person.</div>
            )}
          </div>
        )}
      </div>
      {!selectedLeadId && value.trim().length >= 2 && matches.length === 0 && (
        <p className="text-[10px] mt-1" style={{ color: "oklch(0.50 0.01 250)" }}>No match found — new person entry remains available.</p>
      )}
      {selectedLead && showPreview && <ClientPreviewCard lead={selectedLead} leads={leads} payments={payments} />}
    </div>
  );
}
