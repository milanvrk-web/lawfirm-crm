/* ============================================================
   AI Chief of Staff — Pipeline Health & Lead Prioritization
   Reads each lead's full history and produces priority tiers,
   scores, headlines, and recommended next actions using AI.
   ============================================================ */

import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useCRM } from "@/contexts/CRMContext";
import { formatDate } from "@/lib/store";
import {
  Brain, Zap, Flame, Snowflake, AlertTriangle, RefreshCw,
  ChevronDown, ChevronUp, ExternalLink, Clock, Target,
  TrendingUp, Sparkles, Users, ListChecks, TriangleAlert,
  FileText, Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";

// ─── Types ────────────────────────────────────────────────────

type Tier = "Hot" | "Warm" | "Cold" | "At-Risk";

type Analysis = {
  id: string;
  leadId: string;
  tier: string;
  score: number;
  headline: string;
  nextAction: string;
  riskFlags: string;
  reasoning: string;
  analyzedAt: Date;
};

// ─── Tier config ──────────────────────────────────────────────

const TIER_CONFIG: Record<Tier, {
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  bg: string;
  border: string;
  badge: string;
  text: string;
  glow: string;
}> = {
  Hot: {
    label: "Hot Leads",
    icon: Flame,
    bg: "oklch(0.18 0.04 25)",
    border: "oklch(0.65 0.22 25)",
    badge: "oklch(0.65 0.22 25)",
    text: "oklch(0.90 0.12 25)",
    glow: "0 0 20px oklch(0.65 0.22 25 / 0.3)",
  },
  Warm: {
    label: "Warm Leads",
    icon: TrendingUp,
    bg: "oklch(0.18 0.04 80)",
    border: "oklch(0.72 0.18 80)",
    badge: "oklch(0.72 0.18 80)",
    text: "oklch(0.92 0.10 80)",
    glow: "0 0 20px oklch(0.72 0.18 80 / 0.3)",
  },
  Cold: {
    label: "Cold Leads",
    icon: Snowflake,
    bg: "oklch(0.16 0.03 250)",
    border: "oklch(0.55 0.12 250)",
    badge: "oklch(0.55 0.12 250)",
    text: "oklch(0.80 0.08 250)",
    glow: "0 0 20px oklch(0.55 0.12 250 / 0.2)",
  },
  "At-Risk": {
    label: "At-Risk Leads",
    icon: AlertTriangle,
    bg: "oklch(0.18 0.04 300)",
    border: "oklch(0.65 0.20 300)",
    badge: "oklch(0.65 0.20 300)",
    text: "oklch(0.88 0.10 300)",
    glow: "0 0 20px oklch(0.65 0.20 300 / 0.3)",
  },
};

// ─── Score bar ────────────────────────────────────────────────

function ScoreBar({ score, tier }: { score: number; tier: Tier }) {
  const cfg = TIER_CONFIG[tier];
  return (
    <div className="flex items-center gap-2">
      <div
        className="h-1.5 rounded-full flex-1 overflow-hidden"
        style={{ background: "oklch(0.25 0.01 250)" }}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${score * 10}%`,
            background: cfg.badge,
          }}
        />
      </div>
      <span className="text-xs font-bold tabular-nums" style={{ color: cfg.badge }}>
        {score}/10
      </span>
    </div>
  );
}

// ─── Lead card ────────────────────────────────────────────────

function LeadIntelCard({
  analysis,
  lead,
  onReanalyze,
  isReanalyzing,
}: {
  analysis: Analysis;
  lead: { id: string; name: string; phone: string; caseType: string; stage: string; followUpDate?: string | null };
  onReanalyze: (leadId: string) => void;
  isReanalyzing: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [, navigate] = useLocation();
  const tier = analysis.tier as Tier;
  const cfg = TIER_CONFIG[tier] ?? TIER_CONFIG["Cold"];
  const riskFlags: string[] = (() => {
    try { return JSON.parse(analysis.riskFlags); } catch { return []; }
  })();

  const hoursOld = Math.floor((Date.now() - new Date(analysis.analyzedAt).getTime()) / 3600000);
  const isStale = hoursOld >= 24;

  return (
    <div
      className="rounded-xl border transition-all"
      style={{
        background: cfg.bg,
        borderColor: cfg.border,
        boxShadow: cfg.glow,
      }}
    >
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="font-semibold text-sm truncate" style={{ color: "oklch(0.95 0.01 250)" }}>
                {lead.name}
              </span>
              {lead.phone && (
                <span className="text-xs" style={{ color: "oklch(0.60 0.01 250)" }}>
                  {lead.phone}
                </span>
              )}
              <span
                className="text-xs px-1.5 py-0.5 rounded font-medium"
                style={{ background: "oklch(0.25 0.02 250)", color: "oklch(0.70 0.05 250)" }}
              >
                {lead.caseType}
              </span>
            </div>
            <p className="text-sm leading-snug" style={{ color: cfg.text }}>
              {analysis.headline}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => navigate(`/leads?lead=${lead.id}`)}
              className="p-1.5 rounded-lg transition-colors hover:bg-white/10"
              style={{ color: "oklch(0.55 0.01 250)" }}
              title="Open lead detail"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onReanalyze(lead.id)}
              disabled={isReanalyzing}
              className="p-1.5 rounded-lg transition-colors hover:bg-white/10 disabled:opacity-40"
              style={{ color: "oklch(0.55 0.01 250)" }}
              title="Re-analyze this lead"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isReanalyzing ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        <ScoreBar score={analysis.score} tier={tier} />

        {/* Next action */}
        <div
          className="mt-3 p-2.5 rounded-lg text-xs leading-relaxed"
          style={{ background: "oklch(0.12 0.02 250)", color: "oklch(0.80 0.05 250)" }}
        >
          <span className="font-semibold" style={{ color: cfg.badge }}>Next: </span>
          {analysis.nextAction}
        </div>

        {/* Risk flags */}
        {riskFlags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {riskFlags.map((flag, i) => (
              <span
                key={i}
                className="text-xs px-2 py-0.5 rounded-full border"
                style={{
                  borderColor: "oklch(0.65 0.22 25 / 0.4)",
                  color: "oklch(0.80 0.12 25)",
                  background: "oklch(0.18 0.04 25 / 0.5)",
                }}
              >
                ⚠ {flag}
              </span>
            ))}
          </div>
        )}

        {/* Footer meta */}
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs" style={{ color: "oklch(0.50 0.01 250)" }}>
            {lead.followUpDate && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDate(lead.followUpDate)}
              </span>
            )}
            <span className={isStale ? "text-amber-400" : ""}>
              {isStale ? `⚠ ${hoursOld}h old` : `${hoursOld}h ago`}
            </span>
          </div>
          <button
            onClick={() => setExpanded(e => !e)}
            className="flex items-center gap-1 text-xs transition-colors hover:opacity-80"
            style={{ color: "oklch(0.55 0.01 250)" }}
          >
            Reasoning {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Expanded reasoning */}
      {expanded && (
        <div
          className="px-4 pb-4 text-xs leading-relaxed border-t"
          style={{ borderColor: "oklch(0.25 0.02 250)", color: "oklch(0.65 0.02 250)" }}
        >
          <p className="pt-3">{analysis.reasoning}</p>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────

export default function Intelligence() {
  const { leads } = useCRM();
  const utils = trpc.useUtils();
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set());
  const [isAnalyzingAll, setIsAnalyzingAll] = useState(false);
  const [isGeneratingBriefing, setIsGeneratingBriefing] = useState(false);
  const [activeTab, setActiveTab] = useState<"briefing" | "pipeline">("briefing");

  const { data: analyses = [], isLoading } = trpc.intelligence.getAll.useQuery();
  const { data: latestBriefing, isLoading: briefingLoading } = trpc.intelligence.getLatestBriefing.useQuery();

  const generateBriefingMut = trpc.intelligence.generateBriefing.useMutation({
    onSuccess: () => {
      utils.intelligence.getLatestBriefing.invalidate();
      toast.success("Daily briefing generated!");
      setIsGeneratingBriefing(false);
    },
    onError: (err) => {
      toast.error("Briefing failed: " + err.message);
      setIsGeneratingBriefing(false);
    },
  });

  const handleGenerateBriefing = () => {
    setIsGeneratingBriefing(true);
    toast.info("Generating today's briefing — this may take 15–30 seconds...");
    generateBriefingMut.mutate();
  };

  const analyzeLeadMut = trpc.intelligence.analyzeLead.useMutation({
    onSuccess: () => {
      utils.intelligence.getAll.invalidate();
    },
  });

  const analyzeAllMut = trpc.intelligence.analyzeAll.useMutation({
    onSuccess: (result) => {
      utils.intelligence.getAll.invalidate();
      const failed = result.results.filter(r => !r.ok).length;
      if (failed > 0) {
        toast.warning(`Analyzed ${result.total - failed} leads. ${failed} failed.`);
      } else {
        toast.success(`Successfully analyzed ${result.total} leads!`);
      }
      setIsAnalyzingAll(false);
    },
    onError: (err) => {
      toast.error("Analysis failed: " + err.message);
      setIsAnalyzingAll(false);
    },
  });

  const handleReanalyze = async (leadId: string) => {
    setAnalyzingIds(prev => new Set(prev).add(leadId));
    try {
      await analyzeLeadMut.mutateAsync({ leadId });
      toast.success("Lead re-analyzed successfully");
    } catch (err: unknown) {
      toast.error("Analysis failed: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setAnalyzingIds(prev => { const s = new Set(prev); s.delete(leadId); return s; });
    }
  };

  const handleAnalyzeAll = () => {
    setIsAnalyzingAll(true);
    toast.info("Analyzing all active leads — this may take 30–60 seconds...");
    analyzeAllMut.mutate();
  };

  // Build a map of leadId → analysis
  const analysisMap = useMemo(() => {
    const map = new Map<string, Analysis>();
    for (const a of analyses) {
      map.set(a.leadId, a as Analysis);
    }
    return map;
  }, [analyses]);

  // Active leads (not Lost or Retained) that have been analyzed
  const activeLeads = leads.filter(l => l.stage !== "Lost" && l.stage !== "Retained");
  const analyzedLeads = activeLeads.filter(l => analysisMap.has(l.id));
  const unanalyzedCount = activeLeads.length - analyzedLeads.length;

  // Group by tier
  const tiers: Tier[] = ["Hot", "Warm", "At-Risk", "Cold"];
  const grouped = useMemo(() => {
    const g: Record<Tier, typeof analyzedLeads> = { Hot: [], Warm: [], Cold: [], "At-Risk": [] };
    for (const lead of analyzedLeads) {
      const analysis = analysisMap.get(lead.id)!;
      const tier = analysis.tier as Tier;
      if (g[tier]) g[tier].push(lead);
    }
    // Sort each tier by score descending
    for (const tier of tiers) {
      g[tier].sort((a, b) => {
        const sa = analysisMap.get(a.id)?.score ?? 0;
        const sb = analysisMap.get(b.id)?.score ?? 0;
        return sb - sa;
      });
    }
    return g;
  }, [analyzedLeads, analysisMap]);

  const staleCount = analyses.filter(a => {
    const hoursOld = Math.floor((Date.now() - new Date(a.analyzedAt).getTime()) / 3600000);
    return hoursOld >= 24;
  }).length;

  // Parse briefing JSON fields
  const topActions: { leadName: string; tier: string; action: string }[] = useMemo(() => {
    if (!latestBriefing?.topActions) return [];
    try { return JSON.parse(latestBriefing.topActions); } catch { return []; }
  }, [latestBriefing]);
  const escalations: { leadName: string; reason: string }[] = useMemo(() => {
    if (!latestBriefing?.escalations) return [];
    try { return JSON.parse(latestBriefing.escalations); } catch { return []; }
  }, [latestBriefing]);
  const memberAssignments: { memberName: string; tasks: string[] }[] = useMemo(() => {
    if (!latestBriefing?.memberAssignments) return [];
    try { return JSON.parse(latestBriefing.memberAssignments); } catch { return []; }
  }, [latestBriefing]);

  const tierBadgeColors: Record<string, string> = {
    Hot: "oklch(0.65 0.22 25)",
    Warm: "oklch(0.72 0.18 80)",
    "At-Risk": "oklch(0.65 0.20 300)",
    Cold: "oklch(0.55 0.12 250)",
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "oklch(0.20 0.05 280)", border: "1px solid oklch(0.55 0.18 280)" }}
            >
              <Brain className="w-5 h-5" style={{ color: "oklch(0.75 0.18 280)" }} />
            </div>
            <h1 className="text-xl font-bold" style={{ color: "oklch(0.95 0.01 250)" }}>
              AI Chief of Staff
            </h1>
          </div>
          <p className="text-sm" style={{ color: "oklch(0.55 0.01 250)" }}>
            Pipeline health, daily briefings, and team task assignments — automated every night at midnight PST
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {staleCount > 0 && (
            <span className="text-xs px-2 py-1 rounded-full" style={{ background: "oklch(0.22 0.06 80)", color: "oklch(0.80 0.15 80)" }}>
              {staleCount} stale (&gt;24h)
            </span>
          )}
          <button
            onClick={handleGenerateBriefing}
            disabled={isGeneratingBriefing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-60"
            style={{ background: "oklch(0.22 0.06 280)", color: "oklch(0.80 0.15 280)", border: "1px solid oklch(0.40 0.12 280)" }}
          >
            {isGeneratingBriefing ? (
              <><RefreshCw className="w-4 h-4 animate-spin" /> Generating…</>
            ) : (
              <><FileText className="w-4 h-4" /> Generate Briefing</>
            )}
          </button>
          <button
            onClick={handleAnalyzeAll}
            disabled={isAnalyzingAll}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-60"
            style={{ background: "oklch(0.55 0.18 280)", color: "oklch(0.98 0.01 250)" }}
          >
            {isAnalyzingAll ? (
              <><RefreshCw className="w-4 h-4 animate-spin" /> Analyzing…</>
            ) : (
              <><Zap className="w-4 h-4" /> Analyze Pipeline</>
            )}
          </button>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl" style={{ background: "oklch(0.14 0.02 250)" }}>
        {(["briefing", "pipeline"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: activeTab === tab ? "oklch(0.20 0.04 280)" : "transparent",
              color: activeTab === tab ? "oklch(0.90 0.08 280)" : "oklch(0.50 0.01 250)",
              border: activeTab === tab ? "1px solid oklch(0.35 0.10 280)" : "1px solid transparent",
            }}
          >
            {tab === "briefing" ? <><Sparkles className="w-4 h-4" /> Daily Briefing</> : <><ListChecks className="w-4 h-4" /> Pipeline Analysis</>}
          </button>
        ))}
      </div>

      {/* ── BRIEFING TAB ─────────────────────────────────────────── */}
      {activeTab === "briefing" && (
        <div>
          {briefingLoading && (
            <div className="text-center py-16" style={{ color: "oklch(0.55 0.01 250)" }}>
              <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-40 animate-pulse" />
              <p>Loading briefing…</p>
            </div>
          )}

          {!briefingLoading && !latestBriefing && (
            <div className="text-center py-20">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: "oklch(0.18 0.04 280)", border: "1px solid oklch(0.35 0.10 280)" }}
              >
                <FileText className="w-8 h-8" style={{ color: "oklch(0.55 0.15 280)" }} />
              </div>
              <h3 className="text-base font-semibold mb-2" style={{ color: "oklch(0.80 0.02 250)" }}>
                No briefing yet
              </h3>
              <p className="text-sm mb-6 max-w-sm mx-auto" style={{ color: "oklch(0.50 0.01 250)" }}>
                Generate today's briefing to get an AI-written morning report with top actions, escalations, and per-member task assignments. Runs automatically every night at midnight PST.
              </p>
              <button
                onClick={handleGenerateBriefing}
                disabled={isGeneratingBriefing}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold mx-auto transition-all disabled:opacity-60"
                style={{ background: "oklch(0.55 0.18 280)", color: "white" }}
              >
                {isGeneratingBriefing ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" /> Generating…</>
                ) : (
                  <><Sparkles className="w-4 h-4" /> Generate Today's Briefing</>
                )}
              </button>
            </div>
          )}

          {!briefingLoading && latestBriefing && (
            <div className="space-y-5">
              {/* Briefing date + meta */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 text-sm" style={{ color: "oklch(0.60 0.05 280)" }}>
                  <Calendar className="w-4 h-4" />
                  <span className="font-semibold" style={{ color: "oklch(0.85 0.08 280)" }}>
                    {new Date(latestBriefing.briefingDate + "T12:00:00").toLocaleDateString("en-US", { timeZone: "America/Los_Angeles", weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                  </span>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "oklch(0.18 0.04 280)", color: "oklch(0.65 0.12 280)", border: "1px solid oklch(0.35 0.10 280)" }}>
                  Auto-refreshes nightly at midnight PST
                </span>
              </div>

              {/* Main briefing markdown */}
              <div
                className="rounded-xl border p-5"
                style={{ background: "oklch(0.14 0.02 250)", borderColor: "oklch(0.22 0.03 250)" }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <Brain className="w-4 h-4" style={{ color: "oklch(0.75 0.18 280)" }} />
                  <span className="text-sm font-semibold" style={{ color: "oklch(0.80 0.05 280)" }}>Morning Report</span>
                </div>
                <div className="prose prose-invert prose-sm max-w-none" style={{ color: "oklch(0.80 0.02 250)" }}>
                  <Streamdown>{latestBriefing.content}</Streamdown>
                </div>
              </div>

              {/* Top actions + Escalations row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Top Actions */}
                <div
                  className="rounded-xl border p-4"
                  style={{ background: "oklch(0.14 0.02 250)", borderColor: "oklch(0.22 0.03 250)" }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Target className="w-4 h-4" style={{ color: "oklch(0.72 0.18 80)" }} />
                    <span className="text-sm font-semibold" style={{ color: "oklch(0.85 0.08 80)" }}>Top Actions Today</span>
                    <span className="ml-auto text-xs px-1.5 py-0.5 rounded-full" style={{ background: "oklch(0.18 0.04 80)", color: "oklch(0.72 0.18 80)" }}>{topActions.length}</span>
                  </div>
                  {topActions.length === 0 ? (
                    <p className="text-xs" style={{ color: "oklch(0.45 0.01 250)" }}>No top actions — run pipeline analysis first.</p>
                  ) : (
                    <div className="space-y-2">
                      {topActions.map((a, i) => (
                        <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-lg" style={{ background: "oklch(0.17 0.02 250)" }}>
                          <span
                            className="text-xs px-1.5 py-0.5 rounded font-bold shrink-0 mt-0.5"
                            style={{ background: "oklch(0.18 0.04 80)", color: tierBadgeColors[a.tier] ?? "oklch(0.70 0.05 250)" }}
                          >
                            {a.tier}
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold" style={{ color: "oklch(0.88 0.02 250)" }}>{a.leadName}</p>
                            <p className="text-xs mt-0.5" style={{ color: "oklch(0.65 0.01 250)" }}>{a.action}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Escalations */}
                <div
                  className="rounded-xl border p-4"
                  style={{ background: "oklch(0.14 0.02 250)", borderColor: "oklch(0.22 0.03 250)" }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <TriangleAlert className="w-4 h-4" style={{ color: "oklch(0.65 0.22 25)" }} />
                    <span className="text-sm font-semibold" style={{ color: "oklch(0.85 0.10 25)" }}>Escalations</span>
                    <span className="ml-auto text-xs px-1.5 py-0.5 rounded-full" style={{ background: "oklch(0.18 0.04 25)", color: "oklch(0.65 0.22 25)" }}>{escalations.length}</span>
                  </div>
                  {escalations.length === 0 ? (
                    <p className="text-xs" style={{ color: "oklch(0.45 0.01 250)" }}>No escalations — all leads are on track.</p>
                  ) : (
                    <div className="space-y-2">
                      {escalations.map((e, i) => (
                        <div key={i} className="p-2.5 rounded-lg" style={{ background: "oklch(0.17 0.03 25)" }}>
                          <p className="text-xs font-semibold" style={{ color: "oklch(0.88 0.08 25)" }}>{e.leadName}</p>
                          <p className="text-xs mt-0.5" style={{ color: "oklch(0.70 0.05 25)" }}>{e.reason}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Member assignments */}
              {memberAssignments.length > 0 && (
                <div
                  className="rounded-xl border p-4"
                  style={{ background: "oklch(0.14 0.02 250)", borderColor: "oklch(0.22 0.03 250)" }}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <Users className="w-4 h-4" style={{ color: "oklch(0.65 0.15 200)" }} />
                    <span className="text-sm font-semibold" style={{ color: "oklch(0.85 0.08 200)" }}>Team Task Assignments</span>
                    <span className="text-xs ml-auto" style={{ color: "oklch(0.45 0.01 250)" }}>AI-assigned based on pipeline priorities</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {memberAssignments.map((m, i) => (
                      <div key={i} className="rounded-lg p-3" style={{ background: "oklch(0.17 0.02 250)" }}>
                        <div className="flex items-center gap-2 mb-2">
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                            style={{ background: "oklch(0.25 0.05 200)", color: "oklch(0.75 0.15 200)" }}
                          >
                            {m.memberName.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-semibold" style={{ color: "oklch(0.88 0.02 250)" }}>{m.memberName}</span>
                          <span className="ml-auto text-xs" style={{ color: "oklch(0.50 0.01 250)" }}>{m.tasks.length} task{m.tasks.length !== 1 ? "s" : ""}</span>
                        </div>
                        <ul className="space-y-1">
                          {m.tasks.map((task, j) => (
                            <li key={j} className="flex items-start gap-1.5 text-xs" style={{ color: "oklch(0.68 0.01 250)" }}>
                              <span className="mt-0.5 shrink-0" style={{ color: "oklch(0.65 0.15 200)" }}>•</span>
                              {task}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── PIPELINE TAB ─────────────────────────────────────────── */}
      {activeTab === "pipeline" && (
        <div className="space-y-6">
          {/* Summary stats */}
          {analyses.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {tiers.map(tier => {
                const cfg = TIER_CONFIG[tier];
                const Icon = cfg.icon;
                const count = grouped[tier].length;
                return (
                  <div
                    key={tier}
                    className="rounded-xl p-3 border flex items-center gap-3"
                    style={{ background: cfg.bg, borderColor: cfg.border }}
                  >
                    <Icon className="w-5 h-5 shrink-0" style={{ color: cfg.badge }} />
                    <div>
                      <div className="text-xl font-bold" style={{ color: cfg.badge }}>{count}</div>
                      <div className="text-xs" style={{ color: cfg.text }}>{cfg.label}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Unanalyzed notice */}
          {unanalyzedCount > 0 && (
            <div
              className="rounded-xl p-4 flex items-center justify-between gap-4 border"
              style={{ background: "oklch(0.16 0.03 280)", borderColor: "oklch(0.40 0.10 280)" }}
            >
              <div className="flex items-center gap-3">
                <Target className="w-5 h-5 shrink-0" style={{ color: "oklch(0.65 0.18 280)" }} />
                <div>
                  <p className="text-sm font-medium" style={{ color: "oklch(0.90 0.05 280)" }}>
                    {unanalyzedCount} lead{unanalyzedCount !== 1 ? "s" : ""} not yet analyzed
                  </p>
                  <p className="text-xs" style={{ color: "oklch(0.55 0.05 280)" }}>
                    Click "Analyze Pipeline" to get AI priority scores for all active leads
                  </p>
                </div>
              </div>
              <button
                onClick={handleAnalyzeAll}
                disabled={isAnalyzingAll}
                className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all disabled:opacity-60 shrink-0"
                style={{ background: "oklch(0.55 0.18 280)", color: "white" }}
              >
                Analyze Now
              </button>
            </div>
          )}

          {/* Loading state */}
          {isLoading && (
            <div className="text-center py-16" style={{ color: "oklch(0.55 0.01 250)" }}>
              <Brain className="w-10 h-10 mx-auto mb-3 opacity-40 animate-pulse" />
              <p>Loading analyses…</p>
            </div>
          )}

          {/* Empty state */}
          {!isLoading && analyses.length === 0 && (
            <div className="text-center py-20">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: "oklch(0.18 0.04 280)", border: "1px solid oklch(0.35 0.10 280)" }}
              >
                <Brain className="w-8 h-8" style={{ color: "oklch(0.55 0.15 280)" }} />
              </div>
              <h3 className="text-base font-semibold mb-2" style={{ color: "oklch(0.80 0.02 250)" }}>
                No analyses yet
              </h3>
              <p className="text-sm mb-6 max-w-sm mx-auto" style={{ color: "oklch(0.50 0.01 250)" }}>
                Click "Analyze Pipeline" to have AI read every lead's full history and rank them by conversion likelihood.
              </p>
              <button
                onClick={handleAnalyzeAll}
                disabled={isAnalyzingAll}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold mx-auto transition-all disabled:opacity-60"
                style={{ background: "oklch(0.55 0.18 280)", color: "white" }}
              >
                {isAnalyzingAll ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" /> Analyzing…</>
                ) : (
                  <><Zap className="w-4 h-4" /> Analyze Pipeline</>
                )}
              </button>
            </div>
          )}

          {/* Tier columns */}
          {!isLoading && analyses.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-5">
              {tiers.map(tier => {
                const cfg = TIER_CONFIG[tier];
                const Icon = cfg.icon;
                const tierLeads = grouped[tier];
                return (
                  <div key={tier}>
                    {/* Column header */}
                    <div className="flex items-center gap-2 mb-3 px-1">
                      <Icon className="w-4 h-4" style={{ color: cfg.badge }} />
                      <span className="text-sm font-semibold" style={{ color: cfg.badge }}>
                        {cfg.label}
                      </span>
                      <span
                        className="ml-auto text-xs px-1.5 py-0.5 rounded-full font-bold"
                        style={{ background: cfg.bg, color: cfg.badge, border: `1px solid ${cfg.border}` }}
                      >
                        {tierLeads.length}
                      </span>
                    </div>
                    {/* Cards */}
                    <div className="flex flex-col gap-3">
                      {tierLeads.length === 0 ? (
                        <div
                          className="rounded-xl border border-dashed p-6 text-center text-xs"
                          style={{ borderColor: cfg.border, color: "oklch(0.45 0.01 250)" }}
                        >
                          No {tier.toLowerCase()} leads
                        </div>
                      ) : (
                        tierLeads.map(lead => {
                          const analysis = analysisMap.get(lead.id)!;
                          return (
                            <LeadIntelCard
                              key={lead.id}
                              analysis={analysis}
                              lead={lead}
                              onReanalyze={handleReanalyze}
                              isReanalyzing={analyzingIds.has(lead.id)}
                            />
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
