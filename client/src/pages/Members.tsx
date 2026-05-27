/* ============================================================
   Members — Team management page
   Allows the owner to add/remove CRM staff members.
   Each member can then be selected as the "active user" from
   the sidebar so their name is attached to notes and tasks.
   ============================================================ */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Users, Plus, Trash2, UserCircle2, Shield, User, Pencil, Check, X } from "lucide-react";

// Preset color palette for member avatars
const COLOR_OPTIONS = [
  { label: "Blue",   value: "oklch(0.55 0.18 250)" },
  { label: "Gold",   value: "oklch(0.72 0.15 80)"  },
  { label: "Green",  value: "oklch(0.60 0.18 145)" },
  { label: "Red",    value: "oklch(0.60 0.22 25)"  },
  { label: "Purple", value: "oklch(0.55 0.20 300)" },
  { label: "Teal",   value: "oklch(0.60 0.15 195)" },
];

const ROLE_OPTIONS = ["Staff", "Paralegal", "Attorney", "Manager", "Owner"];

function getInitials(name: string) {
  return name.trim().split(/\s+/).map(w => w[0]?.toUpperCase() ?? "").slice(0, 2).join("");
}

export default function Members() {
  const utils = trpc.useUtils();

  const { data: members = [], isLoading } = trpc.members.list.useQuery();

  const addMut = trpc.members.add.useMutation({
    onSuccess: () => {
      utils.members.list.invalidate();
      setName("");
      setRole("Staff");
      setColor(COLOR_OPTIONS[0].value);
      toast.success("Member added");
    },
    onError: () => toast.error("Failed to add member"),
  });

  const removeMut = trpc.members.remove.useMutation({
    onSuccess: () => {
      utils.members.list.invalidate();
      toast.success("Member removed");
    },
    onError: () => toast.error("Failed to remove member"),
  });

  const updateMut = trpc.members.update.useMutation({
    onSuccess: () => {
      utils.members.list.invalidate();
      setEditingId(null);
      toast.success("Member updated");
    },
    onError: () => toast.error("Failed to update member"),
  });

  // Add form state
  const [name, setName]   = useState("");
  const [role, setRole]   = useState("Staff");
  const [color, setColor] = useState(COLOR_OPTIONS[0].value);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  // Inline edit state
  const [editingId, setEditingId]       = useState<string | null>(null);
  const [editName, setEditName]         = useState("");
  const [editRole, setEditRole]         = useState("");

  const handleAdd = () => {
    if (!name.trim()) { toast.error("Enter a name"); return; }
    addMut.mutate({ name: name.trim(), role, color });
  };

  const startEdit = (m: { id: string; name: string; role: string }) => {
    setEditingId(m.id);
    setEditName(m.name);
    setEditRole(m.role);
    setConfirmRemoveId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = (id: string) => {
    if (!editName.trim()) { toast.error("Name cannot be empty"); return; }
    updateMut.mutate({ id, name: editName.trim(), role: editRole });
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "oklch(0.55 0.18 250 / 15%)" }}>
          <Users className="w-5 h-5" style={{ color: "oklch(0.55 0.18 250)" }} />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: "oklch(0.90 0.005 250)" }}>Team Members</h1>
          <p className="text-sm" style={{ color: "oklch(0.50 0.01 250)" }}>
            Add staff members so their name is attached to notes and follow-up tasks.
          </p>
        </div>
      </div>

      {/* Add Member Form */}
      <div className="rounded-xl p-5 space-y-4" style={{ background: "oklch(0.18 0.025 250)", border: "1px solid oklch(1 0 0 / 8%)" }}>
        <div className="text-sm font-semibold uppercase tracking-wider" style={{ color: "oklch(0.50 0.01 250)" }}>Add New Member</div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Name */}
          <div>
            <label className="text-xs mb-1 block" style={{ color: "oklch(0.55 0.01 250)" }}>Full Name *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleAdd(); }}
              placeholder="e.g. Sachin Arora"
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: "oklch(0.22 0.025 250)", border: "1px solid oklch(0.55 0.18 250 / 30%)", color: "oklch(0.90 0.005 250)" }}
            />
          </div>

          {/* Role */}
          <div>
            <label className="text-xs mb-1 block" style={{ color: "oklch(0.55 0.01 250)" }}>Role</label>
            <select
              value={role}
              onChange={e => setRole(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: "oklch(0.22 0.025 250)", border: "1px solid oklch(0.55 0.18 250 / 30%)", color: "oklch(0.90 0.005 250)" }}
            >
              {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>

        {/* Color picker */}
        <div>
          <label className="text-xs mb-2 block" style={{ color: "oklch(0.55 0.01 250)" }}>Avatar Color</label>
          <div className="flex gap-2 flex-wrap">
            {COLOR_OPTIONS.map(c => (
              <button
                key={c.value}
                onClick={() => setColor(c.value)}
                title={c.label}
                className="w-8 h-8 rounded-full transition-transform hover:scale-110"
                style={{
                  background: c.value,
                  outline: color === c.value ? `3px solid oklch(0.90 0.005 250)` : "3px solid transparent",
                  outlineOffset: "2px",
                }}
              />
            ))}
          </div>
        </div>

        {/* Preview + Add button */}
        <div className="flex items-center gap-3">
          {name.trim() && (
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ background: color, color: "oklch(0.10 0 0)" }}>
              {getInitials(name)}
            </div>
          )}
          <button
            onClick={handleAdd}
            disabled={addMut.isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 transition-opacity hover:opacity-90"
            style={{ background: "oklch(0.55 0.18 250)", color: "oklch(0.98 0 0)" }}
          >
            <Plus className="w-4 h-4" />
            {addMut.isPending ? "Adding…" : "Add Member"}
          </button>
        </div>
      </div>

      {/* Members List */}
      <div className="space-y-2">
        <div className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: "oklch(0.50 0.01 250)" }}>
          {members.length} {members.length === 1 ? "Member" : "Members"}
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="w-6 h-6 border-2 rounded-full animate-spin mx-auto" style={{ borderColor: "oklch(0.55 0.18 250 / 30%)", borderTopColor: "oklch(0.55 0.18 250)" }} />
          </div>
        ) : members.length === 0 ? (
          <div className="text-center py-12 rounded-xl" style={{ background: "oklch(0.18 0.025 250)", border: "1px solid oklch(1 0 0 / 8%)" }}>
            <UserCircle2 className="w-10 h-10 mx-auto mb-3" style={{ color: "oklch(0.30 0.01 250)" }} />
            <p className="text-sm" style={{ color: "oklch(0.45 0.01 250)" }}>No members yet. Add your first team member above.</p>
          </div>
        ) : (
          members.map(m => (
            <div key={m.id} className="rounded-xl transition-all" style={{ background: "oklch(0.18 0.025 250)", border: "1px solid oklch(1 0 0 / 8%)" }}>
              {editingId === m.id ? (
                /* ── Inline Edit Mode ── */
                <div className="flex items-center gap-3 px-4 py-3 flex-wrap">
                  {/* Avatar preview */}
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ background: m.color, color: "oklch(0.10 0 0)" }}>
                    {getInitials(editName || m.name)}
                  </div>

                  {/* Name input */}
                  <input
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter") saveEdit(m.id);
                      if (e.key === "Escape") cancelEdit();
                    }}
                    autoFocus
                    className="flex-1 min-w-[140px] px-3 py-1.5 rounded-lg text-sm outline-none"
                    style={{ background: "oklch(0.22 0.025 250)", border: "1px solid oklch(0.72 0.12 75 / 50%)", color: "oklch(0.90 0.005 250)" }}
                    placeholder="Full name"
                  />

                  {/* Role select */}
                  <select
                    value={editRole}
                    onChange={e => setEditRole(e.target.value)}
                    className="px-2 py-1.5 rounded-lg text-xs outline-none"
                    style={{ background: "oklch(0.22 0.025 250)", border: "1px solid oklch(0.55 0.18 250 / 30%)", color: "oklch(0.90 0.005 250)" }}
                  >
                    {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>

                  {/* Save */}
                  <button
                    onClick={() => saveEdit(m.id)}
                    disabled={updateMut.isPending}
                    className="p-1.5 rounded-lg transition-opacity hover:opacity-80 disabled:opacity-50"
                    style={{ background: "oklch(0.55 0.18 145 / 20%)", color: "oklch(0.65 0.18 145)" }}
                    title="Save"
                  >
                    <Check className="w-4 h-4" />
                  </button>

                  {/* Cancel */}
                  <button
                    onClick={cancelEdit}
                    className="p-1.5 rounded-lg transition-opacity hover:opacity-80"
                    style={{ background: "oklch(0.25 0.025 250)", color: "oklch(0.55 0.01 250)" }}
                    title="Cancel"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                /* ── View Mode ── */
                <div className="flex items-center gap-3 px-4 py-3">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ background: m.color, color: "oklch(0.10 0 0)" }}>
                    {getInitials(m.name)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm" style={{ color: "oklch(0.88 0.005 250)" }}>{m.name}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {m.role === "Owner" || m.role === "Attorney" ? (
                        <Shield className="w-3 h-3" style={{ color: "oklch(0.72 0.15 80)" }} />
                      ) : (
                        <User className="w-3 h-3" style={{ color: "oklch(0.45 0.01 250)" }} />
                      )}
                      <span className="text-xs" style={{ color: "oklch(0.50 0.01 250)" }}>{m.role}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  {confirmRemoveId === m.id ? (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-xs" style={{ color: "oklch(0.70 0.22 25)" }}>Remove?</span>
                      <button
                        onClick={() => removeMut.mutate({ id: m.id })}
                        disabled={removeMut.isPending}
                        className="px-2 py-0.5 rounded text-xs font-semibold disabled:opacity-50"
                        style={{ background: "oklch(0.55 0.22 25)", color: "oklch(0.98 0 0)" }}
                      >
                        {removeMut.isPending ? "…" : "Yes"}
                      </button>
                      <button
                        onClick={() => setConfirmRemoveId(null)}
                        className="px-2 py-0.5 rounded text-xs font-semibold"
                        style={{ background: "oklch(0.25 0.025 250)", color: "oklch(0.65 0.01 250)" }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {/* Edit button */}
                      <button
                        onClick={() => startEdit(m)}
                        className="p-1.5 rounded-lg transition-opacity hover:opacity-80"
                        style={{ color: "oklch(0.72 0.12 75)" }}
                        title="Edit name / role"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      {/* Delete button */}
                      <button
                        onClick={() => setConfirmRemoveId(m.id)}
                        className="p-1.5 rounded-lg transition-opacity hover:opacity-80"
                        style={{ color: "oklch(0.55 0.22 25)" }}
                        title="Remove member"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
