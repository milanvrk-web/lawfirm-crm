/* ============================================================
   Graham Immigration Law, PC — Lock Screen
   Shown before the app loads if ACCESS_CODE is set.
   Verified session is stored in sessionStorage so users
   don't re-enter the code on every page navigation.
   ============================================================ */

import { useState, useRef, useEffect } from "react";
import { Scale, Lock, Eye, EyeOff } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface LockScreenProps {
  onUnlock: () => void;
}

export default function LockScreen({ onUnlock }: LockScreenProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [showCode, setShowCode] = useState(false);
  const [shaking, setShaking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const verify = trpc.access.verify.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        sessionStorage.setItem("crm_unlocked", "1");
        onUnlock();
      } else {
        setError("Incorrect access code. Please try again.");
        setShaking(true);
        setCode("");
        setTimeout(() => setShaking(false), 600);
        inputRef.current?.focus();
      }
    },
    onError: () => {
      setError("Something went wrong. Please try again.");
    },
  });

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setError("");
    verify.mutate({ code: code.trim() });
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "oklch(0.13 0.025 250)" }}
    >
      <div
        className={`w-full max-w-sm rounded-2xl border p-8 shadow-2xl transition-all ${shaking ? "animate-shake" : ""}`}
        style={{
          background: "oklch(0.15 0.03 250)",
          borderColor: "oklch(1 0 0 / 10%)",
        }}
      >
        {/* Logo */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div
            className="flex items-center justify-center w-14 h-14 rounded-2xl shadow-lg"
            style={{ background: "oklch(0.72 0.12 75)" }}
          >
            <Scale className="w-7 h-7" style={{ color: "oklch(0.13 0.025 250)" }} />
          </div>
          <div className="text-center">
            <h1
              className="text-xl font-bold tracking-wide"
              style={{ color: "oklch(0.93 0.005 250)", fontFamily: "'Playfair Display', serif" }}
            >
              Graham Immigration Law, PC
            </h1>
            <p className="text-sm mt-0.5" style={{ color: "oklch(0.55 0.01 250)" }}>
              Leads · Payments · Revenue
            </p>
          </div>
        </div>

        {/* Lock icon */}
        <div className="flex justify-center mb-6">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-full"
            style={{ background: "oklch(0.72 0.12 75 / 15%)" }}
          >
            <Lock className="w-5 h-5" style={{ color: "oklch(0.72 0.12 75)" }} />
          </div>
        </div>

        <p
          className="text-center text-sm mb-6"
          style={{ color: "oklch(0.65 0.01 250)" }}
        >
          Enter the access code to continue
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              ref={inputRef}
              type={showCode ? "text" : "password"}
              value={code}
              onChange={(e) => { setCode(e.target.value); setError(""); }}
              placeholder="Access code"
              className="w-full px-4 py-3 pr-12 rounded-xl text-sm outline-none transition-all"
              style={{
                background: "oklch(0.18 0.03 250)",
                border: `1px solid ${error ? "oklch(0.65 0.22 25)" : "oklch(1 0 0 / 12%)"}`,
                color: "oklch(0.93 0.005 250)",
              }}
              autoComplete="off"
              spellCheck={false}
            />
            <button
              type="button"
              onClick={() => setShowCode(!showCode)}
              className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-80 transition-opacity"
              style={{ color: "oklch(0.65 0.01 250)" }}
              tabIndex={-1}
            >
              {showCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {error && (
            <p className="text-xs text-center" style={{ color: "oklch(0.65 0.22 25)" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!code.trim() || verify.isPending}
            className="w-full py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: "oklch(0.72 0.12 75)",
              color: "oklch(0.13 0.025 250)",
            }}
          >
            {verify.isPending ? "Verifying…" : "Unlock"}
          </button>
        </form>
      </div>

      {/* Shake animation */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          15% { transform: translateX(-8px); }
          30% { transform: translateX(8px); }
          45% { transform: translateX(-6px); }
          60% { transform: translateX(6px); }
          75% { transform: translateX(-4px); }
          90% { transform: translateX(4px); }
        }
        .animate-shake { animation: shake 0.6s ease-in-out; }
      `}</style>
    </div>
  );
}
