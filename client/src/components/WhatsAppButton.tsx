import type { MouseEvent } from "react";
import { MessageCircle } from "lucide-react";

/**
 * Convert a CRM phone value into the digits-only format required by wa.me.
 * Ten-digit North American numbers receive the default +1 country code.
 * Returns null when the value is too incomplete to safely open a chat.
 */
export function normalizeWhatsAppPhone(phone: string | null | undefined, defaultCountryCode = "1"): string | null {
  if (!phone?.trim()) return null;
  const raw = phone.trim();
  const hasInternationalPrefix = raw.startsWith("+") || raw.startsWith("00");
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (!hasInternationalPrefix && digits.length === 10) digits = `${defaultCountryCode.replace(/\D/g, "")}${digits}`;
  if (digits.length < 10 || digits.length > 15) return null;
  return digits;
}

export function getWhatsAppUrl(phone: string | null | undefined, defaultCountryCode = "1"): string | null {
  const normalized = normalizeWhatsAppPhone(phone, defaultCountryCode);
  return normalized ? `https://wa.me/${normalized}` : null;
}

type WhatsAppButtonProps = {
  phone?: string | null;
  label?: string;
  compact?: boolean;
  className?: string;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
};

export default function WhatsAppButton({ phone, label = "WhatsApp", compact = false, className = "", onClick }: WhatsAppButtonProps) {
  const url = getWhatsAppUrl(phone);
  if (!url) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      title={`Open WhatsApp chat with ${phone}`}
      aria-label={`Open WhatsApp chat with ${phone}`}
      className={`inline-flex items-center justify-center gap-1 rounded transition-colors hover:opacity-90 ${compact ? "p-1.5" : "px-2 py-1 text-xs font-medium"} ${className}`}
      style={{
        color: "oklch(0.72 0.18 145)",
        background: "oklch(0.55 0.18 145 / 14%)",
        border: "1px solid oklch(0.55 0.18 145 / 30%)",
      }}
    >
      <MessageCircle className={compact ? "w-3.5 h-3.5" : "w-3 h-3"} />
      {!compact && label}
    </a>
  );
}
