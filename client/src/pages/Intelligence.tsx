/* ============================================================
   AI Lead Intelligence — Pipeline Health Analyzer
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
  TrendingUp, TrendingDown, Minus,
} from "lucide-react";
import { toast } from "sonner";

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

  const { data: analyses = [], isLoading } = trpc.intelligence.getAll.useQuery();

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

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "oklch(0.20 0.05 280)", border: "1px solid oklch(0.55 0.18 280)" }}
            >
              <Brain className="w-5 h-5" style={{ color: "oklch(0.75 0.18 280)" }} />
            </div>
            <h1 className="text-xl font-bold" style={{ color: "oklch(0.95 0.01 250)" }}>
              AI Lead Intelligence
            </h1>
          </div>
          <p className="text-sm" style={{ color: "oklch(0.55 0.01 250)" }}>
            AI-powered pipeline health analysis — identifies hot leads, flags at-risk cases, and recommends next actions
          </p>
        </div>
        <div className="flex items-center gap-3">
          {staleCount > 0 && (
            <span className="text-xs px-2 py-1 rounded-full" style={{ background: "oklch(0.22 0.06 80)", color: "oklch(0.80 0.15 80)" }}>
              {staleCount} stale (&gt;24h)
            </span>
          )}
          <button
            onClick={handleAnalyzeAll}
            disabled={isAnalyzingAll}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-60"
            style={{
              background: "oklch(0.55 0.18 280)",
              color: "oklch(0.98 0.01 250)",
            }}
          >
            {isAnalyzingAll ? (
              <><RefreshCw className="w-4 h-4 animate-spin" /> Analyzing…</>
            ) : (
              <><Zap className="w-4 h-4" /> Analyze Pipeline</>
            )}
          </button>
        </div>
      </div>

      {/* Summary stats */}
      {analyses.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
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
          className="rounded-xl p-4 mb-6 flex items-center justify-between gap-4 border"
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
  );
}
