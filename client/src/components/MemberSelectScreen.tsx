/* ============================================================
   MemberSelectScreen
   Shown after access code unlock when no active member is set.
   Displays all CRM members as selectable cards.
   ============================================================ */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useActiveMember } from "@/contexts/ActiveMemberContext";

interface Props {
  onSelect: () => void;
}

export default function MemberSelectScreen({ onSelect }: Props) {
  const { setActiveMember } = useActiveMember();
  const { data: members = [], isLoading } = trpc.members.list.useQuery();
  const [selecting, setSelecting] = useState<string | null>(null);

  function handleSelect(m: { id: string; name: string; color: string; role: string }) {
    setSelecting(m.id);
    setActiveMember({ id: m.id, name: m.name, color: m.color, role: m.role });
    // Small delay so the user sees the selection highlight before transitioning
    setTimeout(() => {
      onSelect();
    }, 220);
  }

  // Generate initials from name
  function initials(name: string) {
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: "oklch(0.13 0.025 250)" }}
    >
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center gap-3">
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-bold shadow-lg"
          style={{ background: "oklch(0.72 0.12 75)", color: "oklch(0.10 0.02 250)" }}
        >
          G
        </div>
        <div className="text-center">
          <h1 className="text-xl font-bold tracking-tight" style={{ color: "oklch(0.93 0.005 250)" }}>
            Graham Immigration Law
          </h1>
          <p className="text-sm mt-1" style={{ color: "oklch(0.50 0.01 250)" }}>
            Select your account to continue
          </p>
        </div>
      </div>

      {/* Member cards */}
      <div className="w-full max-w-md">
        {isLoading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 rounded-xl animate-pulse"
                style={{ background: "oklch(0.18 0.025 250)" }}
              />
            ))}
          </div>
        ) : members.length === 0 ? (
          <div
            className="text-center py-10 rounded-xl text-sm"
            style={{ background: "oklch(0.17 0.025 250)", color: "oklch(0.45 0.01 250)" }}
          >
            No team members found. Add members in the Members settings page first.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {members.map((m) => {
              const isSelecting = selecting === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => handleSelect(m)}
                  disabled={selecting !== null}
                  className="w-full flex items-center gap-4 px-5 py-4 rounded-xl text-left transition-all duration-150 focus:outline-none"
                  style={{
                    background: isSelecting
                      ? "oklch(0.72 0.12 75 / 18%)"
                      : "oklch(0.17 0.025 250)",
                    border: isSelecting
                      ? "1.5px solid oklch(0.72 0.12 75)"
                      : "1.5px solid oklch(1 0 0 / 7%)",
                    cursor: selecting !== null ? "default" : "pointer",
                    transform: isSelecting ? "scale(1.01)" : "scale(1)",
                    boxShadow: isSelecting
                      ? "0 0 0 3px oklch(0.72 0.12 75 / 20%)"
                      : "none",
                  }}
                  onMouseEnter={(e) => {
                    if (!selecting) {
                      (e.currentTarget as HTMLButtonElement).style.background =
                        "oklch(0.20 0.025 250)";
                      (e.currentTarget as HTMLButtonElement).style.borderColor =
                        "oklch(1 0 0 / 14%)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!selecting) {
                      (e.currentTarget as HTMLButtonElement).style.background =
                        "oklch(0.17 0.025 250)";
                      (e.currentTarget as HTMLButtonElement).style.borderColor =
                        "oklch(1 0 0 / 7%)";
                    }
                  }}
                >
                  {/* Avatar */}
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                    style={{
                      background: m.color || "oklch(0.72 0.12 75)",
                      color: "oklch(0.10 0.02 250)",
                    }}
                  >
                    {initials(m.name)}
                  </div>

                  {/* Name + role */}
                  <div className="flex-1 min-w-0">
                    <div
                      className="font-semibold text-sm truncate"
                      style={{ color: "oklch(0.93 0.005 250)" }}
                    >
                      {m.name}
                    </div>
                    <div
                      className="text-xs truncate mt-0.5"
                      style={{ color: "oklch(0.50 0.01 250)" }}
                    >
                      {m.role || "Team Member"}
                    </div>
                  </div>

                  {/* Arrow or checkmark */}
                  <div
                    className="flex-shrink-0 text-lg"
                    style={{
                      color: isSelecting
                        ? "oklch(0.72 0.12 75)"
                        : "oklch(0.35 0.01 250)",
                    }}
                  >
                    {isSelecting ? "✓" : "›"}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer hint */}
      <p className="mt-8 text-xs" style={{ color: "oklch(0.32 0.01 250)" }}>
        You can switch accounts anytime from the sidebar
      </p>
    </div>
  );
}
