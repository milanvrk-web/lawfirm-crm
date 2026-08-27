import { getLeadSourceGuidance, LEAD_SOURCE_OPTIONS } from "@/lib/leadSources";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle } from "lucide-react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  customValue?: string;
  onCustomValueChange?: (value: string) => void;
};

export default function LeadSourceField({ value, onChange, label = "Source", customValue = "", onCustomValueChange }: Props) {
  const isKnown = LEAD_SOURCE_OPTIONS.includes(value as (typeof LEAD_SOURCE_OPTIONS)[number]);
  const selected = isKnown ? value : value ? "Other" : "__no_source__";
  const customText = customValue || (!isKnown && value ? value : "");
  const guidance = getLeadSourceGuidance(customText, selected);
  return (
    <div className="space-y-1.5">
      <Label className="text-xs block" style={{ color: "oklch(0.65 0.01 250)" }}>{label}</Label>
      <Select value={selected} onValueChange={next => onChange(next === "__no_source__" ? "" : next)}>
        <SelectTrigger style={{ background: "oklch(0.22 0.025 250)", borderColor: "oklch(1 0 0 / 12%)", color: "oklch(0.93 0.005 250)" }}>
          <SelectValue placeholder="Select source" />
        </SelectTrigger>
        <SelectContent style={{ background: "oklch(0.22 0.025 250)", borderColor: "oklch(1 0 0 / 12%)" }}>
          <SelectItem value="__no_source__">Select source</SelectItem>
          {LEAD_SOURCE_OPTIONS.map(option => <SelectItem key={option} value={option}>{option}</SelectItem>)}
        </SelectContent>
      </Select>
      {selected === "Other" && onCustomValueChange && (
        <Input value={customText} onChange={event => onCustomValueChange(event.target.value)} placeholder="Describe the source only if it is genuinely new" style={{ background: "oklch(0.22 0.025 250)", borderColor: guidance ? "oklch(0.70 0.22 25 / 70%)" : "oklch(1 0 0 / 12%)", color: "oklch(0.93 0.005 250)" }} />
      )}
      {guidance && (
        <p className="flex items-start gap-1 text-[10px] leading-4" style={{ color: "oklch(0.82 0.16 75)" }} role="status">
          <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
          <span>{guidance}</span>
        </p>
      )}
    </div>
  );
}
