/**
 * Pipeline Editor
 * Lets the user manage pipeline stages (add, rename, reorder, delete, change color)
 * and attach sub-task checklist templates to any stage.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  GripVertical, Plus, Trash2, Pencil, Check, X, ChevronDown, ChevronRight,
  ListChecks, Palette, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

// ─── Color palette ────────────────────────────────────────────────────────────
const COLOR_PALETTE = [
  { label: "Blue",    value: "oklch(0.55 0.18 250)" },
  { label: "Gold",    value: "oklch(0.72 0.15 80)"  },
  { label: "Purple",  value: "oklch(0.65 0.20 300)" },
  { label: "Green",   value: "oklch(0.55 0.18 145)" },
  { label: "Teal",    value: "oklch(0.65 0.18 200)" },
  { label: "Red",     value: "oklch(0.60 0.22 25)"  },
  { label: "Pink",    value: "oklch(0.65 0.20 350)" },
  { label: "Indigo",  value: "oklch(0.55 0.20 270)" },
  { label: "Amber",   value: "oklch(0.72 0.18 60)"  },
  { label: "Slate",   value: "oklch(0.55 0.01 250)" },
];

// ─── Types ────────────────────────────────────────────────────────────────────
type Stage = {
  id: string;
  name: string;
  color: string;
  order: number;
  isDefault: number;
};

type ChecklistTemplate = {
  id: string;
  stageId: string;
  label: string;
  description: string | null;
  order: number;
};

// ─── Main component ───────────────────────────────────────────────────────────
export default function PipelineEditor() {
  const utils = trpc.useUtils();

  // ── Stage data ──
  const { data: stages = [], isLoading } = trpc.pipeline.getStages.useQuery();
  const { data: allTemplates = [] } = trpc.pipeline.getAllChecklistTemplates.useQuery();

  // ── Stage mutations ──
  const createStage = trpc.pipeline.createStage.useMutation({
    onSuccess: () => { utils.pipeline.getStages.invalidate(); toast.success("Stage added"); setShowAddStage(false); setNewStageName(""); setNewStageColor(COLOR_PALETTE[0].value); },
    onError: () => toast.error("Failed to add stage"),
  });
  const updateStage = trpc.pipeline.updateStage.useMutation({
    onSuccess: () => { utils.pipeline.getStages.invalidate(); toast.success("Stage updated"); setEditingStageId(null); },
    onError: () => toast.error("Failed to update stage"),
  });
  const deleteStage = trpc.pipeline.deleteStage.useMutation({
    onSuccess: () => { utils.pipeline.getStages.invalidate(); toast.success("Stage deleted"); setConfirmDeleteStageId(null); },
    onError: () => toast.error("Failed to delete stage"),
  });
  const reorderStages = trpc.pipeline.reorderStages.useMutation({
    onSuccess: () => utils.pipeline.getStages.invalidate(),
  });

  // ── Checklist template mutations ──
  const createTemplate = trpc.pipeline.createChecklistTemplate.useMutation({
    onSuccess: () => { utils.pipeline.getAllChecklistTemplates.invalidate(); toast.success("Step added"); setNewTemplateLabel(""); setNewTemplateDesc(""); },
    onError: () => toast.error("Failed to add step"),
  });
  const updateTemplate = trpc.pipeline.updateChecklistTemplate.useMutation({
    onSuccess: () => { utils.pipeline.getAllChecklistTemplates.invalidate(); toast.success("Step updated"); setEditingTemplateId(null); },
    onError: () => toast.error("Failed to update step"),
  });
  const deleteTemplate = trpc.pipeline.deleteChecklistTemplate.useMutation({
    onSuccess: () => { utils.pipeline.getAllChecklistTemplates.invalidate(); toast.success("Step deleted"); },
    onError: () => toast.error("Failed to delete step"),
  });

  // ── Local UI state ──
  const [showAddStage, setShowAddStage] = useState(false);
  const [newStageName, setNewStageName] = useState("");
  const [newStageColor, setNewStageColor] = useState(COLOR_PALETTE[0].value);

  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [editStageName, setEditStageName] = useState("");
  const [editStageColor, setEditStageColor] = useState("");

  const [confirmDeleteStageId, setConfirmDeleteStageId] = useState<string | null>(null);

  const [expandedStageId, setExpandedStageId] = useState<string | null>(null);
  const [newTemplateLabel, setNewTemplateLabel] = useState("");
  const [newTemplateDesc, setNewTemplateDesc] = useState("");
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [editTemplateLabel, setEditTemplateLabel] = useState("");
  const [editTemplateDesc, setEditTemplateDesc] = useState("");

  // ── Drag-to-reorder state ──
  const [dragStageId, setDragStageId] = useState<string | null>(null);
  const [dragOverStageId, setDragOverStageId] = useState<string | null>(null);

  // ── Helpers ──
  const sorted = [...stages].sort((a, b) => a.order - b.order);

  const startEditStage = (stage: Stage) => {
    setEditingStageId(stage.id);
    setEditStageName(stage.name);
    setEditStageColor(stage.color);
  };

  const handleAddStage = () => {
    if (!newStageName.trim()) { toast.error("Stage name is required"); return; }
    createStage.mutate({ name: newStageName.trim(), color: newStageColor, order: sorted.length });
  };

  const handleUpdateStage = (id: string) => {
    if (!editStageName.trim()) { toast.error("Stage name is required"); return; }
    updateStage.mutate({ id, name: editStageName.trim(), color: editStageColor });
  };

  const handleDragStart = (id: string) => setDragStageId(id);
  const handleDragOver = (e: React.DragEvent, id: string) => { e.preventDefault(); setDragOverStageId(id); };
  const handleDrop = (targetId: string) => {
    if (!dragStageId || dragStageId === targetId) { setDragStageId(null); setDragOverStageId(null); return; }
    const from = sorted.findIndex(s => s.id === dragStageId);
    const to = sorted.findIndex(s => s.id === targetId);
    if (from === -1 || to === -1) return;
    const reordered = [...sorted];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    const updates = reordered.map((s, i) => ({ id: s.id, order: i }));
    reorderStages.mutate(updates);
    setDragStageId(null);
    setDragOverStageId(null);
  };

  const templatesForStage = (stageId: string): ChecklistTemplate[] =>
    allTemplates.filter(t => t.stageId === stageId).sort((a, b) => a.order - b.order);

  const handleAddTemplate = (stageId: string) => {
    if (!newTemplateLabel.trim()) { toast.error("Step label is required"); return; }
    const count = templatesForStage(stageId).length;
    createTemplate.mutate({ stageId, label: newTemplateLabel.trim(), description: newTemplateDesc.trim() || undefined, order: count });
  };

  const startEditTemplate = (t: ChecklistTemplate) => {
    setEditingTemplateId(t.id);
    setEditTemplateLabel(t.label);
    setEditTemplateDesc(t.description ?? "");
  };

  const handleUpdateTemplate = (id: string) => {
    if (!editTemplateLabel.trim()) { toast.error("Step label is required"); return; }
    updateTemplate.mutate({ id, label: editTemplateLabel.trim(), description: editTemplateDesc.trim() || undefined });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-sm" style={{ color: "oklch(0.45 0.01 250)" }}>Loading pipeline…</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "oklch(0.93 0.005 250)" }}>Pipeline Editor</h1>
          <p className="text-sm mt-0.5" style={{ color: "oklch(0.45 0.01 250)" }}>
            Manage stages, reorder them, and add checklist steps to any stage.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setShowAddStage(true)}
          style={{ background: "oklch(0.72 0.15 80)", color: "oklch(0.15 0.02 80)" }}
        >
          <Plus className="w-4 h-4 mr-1" /> Add Stage
        </Button>
      </div>

      {/* Stage list */}
      <div className="space-y-2">
        {sorted.map(stage => {
          const isExpanded = expandedStageId === stage.id;
          const isEditing = editingStageId === stage.id;
          const isDragOver = dragOverStageId === stage.id;
          const templates = templatesForStage(stage.id);

          return (
            <div
              key={stage.id}
              draggable
              onDragStart={() => handleDragStart(stage.id)}
              onDragOver={e => handleDragOver(e, stage.id)}
              onDrop={() => handleDrop(stage.id)}
              onDragEnd={() => { setDragStageId(null); setDragOverStageId(null); }}
              className="rounded-xl overflow-hidden transition-all"
              style={{
                border: `1px solid ${isDragOver ? stage.color : "oklch(1 0 0 / 8%)"}`,
                background: "oklch(0.16 0.025 250)",
                opacity: dragStageId === stage.id ? 0.5 : 1,
              }}
            >
              {/* Stage row */}
              <div className="flex items-center gap-3 px-4 py-3">
                {/* Drag handle */}
                <GripVertical className="w-4 h-4 flex-shrink-0 cursor-grab" style={{ color: "oklch(0.35 0.01 250)" }} />

                {/* Color dot */}
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: stage.color }} />

                {/* Name / edit inline */}
                {isEditing ? (
                  <div className="flex-1 flex items-center gap-2">
                    <Input
                      value={editStageName}
                      onChange={e => setEditStageName(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") handleUpdateStage(stage.id); if (e.key === "Escape") setEditingStageId(null); }}
                      className="h-7 text-sm flex-1"
                      autoFocus
                    />
                    {/* Color picker */}
                    <div className="flex gap-1">
                      {COLOR_PALETTE.map(c => (
                        <button
                          key={c.value}
                          title={c.label}
                          onClick={() => setEditStageColor(c.value)}
                          className="w-4 h-4 rounded-full transition-transform hover:scale-125"
                          style={{
                            background: c.value,
                            outline: editStageColor === c.value ? `2px solid white` : "none",
                            outlineOffset: "1px",
                          }}
                        />
                      ))}
                    </div>
                    <button onClick={() => handleUpdateStage(stage.id)} className="p-1 rounded hover:bg-white/10">
                      <Check className="w-4 h-4" style={{ color: "oklch(0.55 0.18 145)" }} />
                    </button>
                    <button onClick={() => setEditingStageId(null)} className="p-1 rounded hover:bg-white/10">
                      <X className="w-4 h-4" style={{ color: "oklch(0.60 0.22 25)" }} />
                    </button>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center gap-2">
                    <span className="text-sm font-semibold" style={{ color: "oklch(0.88 0.005 250)" }}>{stage.name}</span>
                    {stage.isDefault === 1 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "oklch(0.22 0.025 250)", color: "oklch(0.45 0.01 250)" }}>default</span>
                    )}
                    {templates.length > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1" style={{ background: "oklch(0.65 0.18 200 / 15%)", color: "oklch(0.65 0.18 200)" }}>
                        <ListChecks className="w-3 h-3" /> {templates.length} steps
                      </span>
                    )}
                  </div>
                )}

                {/* Actions */}
                {!isEditing && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => setExpandedStageId(isExpanded ? null : stage.id)}
                      className="p-1.5 rounded hover:bg-white/10 transition-colors"
                      title="Manage checklist steps"
                    >
                      {isExpanded
                        ? <ChevronDown className="w-4 h-4" style={{ color: "oklch(0.65 0.18 200)" }} />
                        : <ChevronRight className="w-4 h-4" style={{ color: "oklch(0.45 0.01 250)" }} />
                      }
                    </button>
                    <button
                      onClick={() => startEditStage(stage)}
                      className="p-1.5 rounded hover:bg-white/10 transition-colors"
                      title="Edit stage"
                    >
                      <Pencil className="w-4 h-4" style={{ color: "oklch(0.72 0.15 80)" }} />
                    </button>
                    {stage.isDefault !== 1 && (
                      <button
                        onClick={() => setConfirmDeleteStageId(stage.id)}
                        className="p-1.5 rounded hover:bg-white/10 transition-colors"
                        title="Delete stage"
                      >
                        <Trash2 className="w-4 h-4" style={{ color: "oklch(0.60 0.22 25)" }} />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Checklist templates section */}
              {isExpanded && (
                <div className="border-t px-4 pb-4 pt-3 space-y-2" style={{ borderColor: "oklch(1 0 0 / 8%)" }}>
                  <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "oklch(0.45 0.01 250)" }}>
                    Checklist Steps for "{stage.name}"
                  </div>

                  {templates.length === 0 && (
                    <p className="text-xs italic" style={{ color: "oklch(0.35 0.01 250)" }}>
                      No steps yet. Add steps below — they'll appear as a checklist on every card in this stage.
                    </p>
                  )}

                  {templates.map(t => (
                    <div key={t.id} className="rounded-lg px-3 py-2 flex items-start gap-2" style={{ background: "oklch(0.20 0.025 250)" }}>
                      <ListChecks className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "oklch(0.65 0.18 200)" }} />
                      {editingTemplateId === t.id ? (
                        <div className="flex-1 space-y-1.5">
                          <Input
                            value={editTemplateLabel}
                            onChange={e => setEditTemplateLabel(e.target.value)}
                            placeholder="Step label"
                            className="h-7 text-sm"
                            autoFocus
                          />
                          <Input
                            value={editTemplateDesc}
                            onChange={e => setEditTemplateDesc(e.target.value)}
                            placeholder="Description (optional)"
                            className="h-7 text-xs"
                          />
                          <div className="flex gap-2">
                            <Button size="sm" className="h-6 text-xs px-2" onClick={() => handleUpdateTemplate(t.id)}
                              style={{ background: "oklch(0.55 0.18 145)", color: "white" }}>Save</Button>
                            <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => setEditingTemplateId(null)}>Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium" style={{ color: "oklch(0.82 0.005 250)" }}>{t.label}</div>
                          {t.description && <div className="text-xs mt-0.5" style={{ color: "oklch(0.45 0.01 250)" }}>{t.description}</div>}
                        </div>
                      )}
                      {editingTemplateId !== t.id && (
                        <div className="flex gap-1 flex-shrink-0">
                          <button onClick={() => startEditTemplate(t)} className="p-1 rounded hover:bg-white/10">
                            <Pencil className="w-3.5 h-3.5" style={{ color: "oklch(0.72 0.15 80)" }} />
                          </button>
                          <button onClick={() => deleteTemplate.mutate({ id: t.id })} className="p-1 rounded hover:bg-white/10">
                            <Trash2 className="w-3.5 h-3.5" style={{ color: "oklch(0.60 0.22 25)" }} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Add step form */}
                  <div className="rounded-lg px-3 py-2 space-y-1.5 border border-dashed" style={{ borderColor: "oklch(1 0 0 / 15%)" }}>
                    <Input
                      value={newTemplateLabel}
                      onChange={e => setNewTemplateLabel(e.target.value)}
                      placeholder="New step label…"
                      className="h-7 text-sm"
                      onKeyDown={e => { if (e.key === "Enter") handleAddTemplate(stage.id); }}
                    />
                    <Input
                      value={newTemplateDesc}
                      onChange={e => setNewTemplateDesc(e.target.value)}
                      placeholder="Description (optional)"
                      className="h-7 text-xs"
                    />
                    <Button
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => handleAddTemplate(stage.id)}
                      disabled={createTemplate.isPending}
                      style={{ background: "oklch(0.65 0.18 200)", color: "white" }}
                    >
                      <Plus className="w-3 h-3 mr-1" /> Add Step
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Stage inline form */}
      {showAddStage && (
        <div className="rounded-xl p-4 space-y-3" style={{ background: "oklch(0.16 0.025 250)", border: "1px solid oklch(1 0 0 / 12%)" }}>
          <div className="text-sm font-semibold" style={{ color: "oklch(0.88 0.005 250)" }}>New Stage</div>
          <Input
            value={newStageName}
            onChange={e => setNewStageName(e.target.value)}
            placeholder="Stage name (e.g. Signed Docs)"
            autoFocus
            onKeyDown={e => { if (e.key === "Enter") handleAddStage(); if (e.key === "Escape") setShowAddStage(false); }}
          />
          <div>
            <div className="text-xs mb-1.5" style={{ color: "oklch(0.45 0.01 250)" }}>Color</div>
            <div className="flex gap-2 flex-wrap">
              {COLOR_PALETTE.map(c => (
                <button
                  key={c.value}
                  title={c.label}
                  onClick={() => setNewStageColor(c.value)}
                  className="w-6 h-6 rounded-full transition-transform hover:scale-110"
                  style={{
                    background: c.value,
                    outline: newStageColor === c.value ? `2px solid white` : "none",
                    outlineOffset: "2px",
                  }}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAddStage} disabled={createStage.isPending}
              style={{ background: "oklch(0.72 0.15 80)", color: "oklch(0.15 0.02 80)" }}>
              <Plus className="w-4 h-4 mr-1" /> Add Stage
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowAddStage(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Confirm delete dialog */}
      <Dialog open={!!confirmDeleteStageId} onOpenChange={open => { if (!open) setConfirmDeleteStageId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" style={{ color: "oklch(0.72 0.15 80)" }} />
              Delete Stage
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm" style={{ color: "oklch(0.65 0.01 250)" }}>
            Are you sure you want to delete this stage? Any leads currently in this stage will need to be moved manually. This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteStageId(null)}>Cancel</Button>
            <Button
              size="sm"
              onClick={() => confirmDeleteStageId && deleteStage.mutate({ id: confirmDeleteStageId })}
              disabled={deleteStage.isPending}
              style={{ background: "oklch(0.60 0.22 25)", color: "white" }}
            >
              Delete Stage
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
