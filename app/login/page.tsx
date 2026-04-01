"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleLogin() {
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: "var(--bg-base)" }}>

      {/* Background grid */}
      <div className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(var(--border) 1px, transparent 1px),
            linear-gradient(90deg, var(--border) 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
        }}
      />

      {/* Amber glow orb */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-[0.06]"
        style={{
          background: "radial-gradient(circle, var(--amber) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />

      {/* Login card */}
      <div className="relative z-10 w-full max-w-sm mx-4">

        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "var(--amber)", boxShadow: "0 0 20px var(--amber-glow)" }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 1L14 4.5V11.5L8 15L2 11.5V4.5L8 1Z" fill="#080c14" fillOpacity="0.9" />
                <path d="M5 8L7.5 10.5L11 6" stroke="#080c14" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="text-xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
              Bar<span style={{ color: "var(--amber)" }}>Hunter</span>
            </span>
          </div>
          <p className="text-sm" style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
            Legal Recruitment Intelligence
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-8"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            boxShadow: "0 25px 60px rgba(0,0,0,0.4)",
          }}>
          <h1 className="text-lg font-semibold mb-6" style={{ color: "var(--text-primary)" }}>
            Sign in to your account
          </h1>

          <div className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-medium mb-1.5"
                style={{ color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
                EMAIL
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                placeholder="you@example.com"
                className="w-full px-4 py-2.5 rounded-lg text-sm transition-colors"
                style={{
                  background: "var(--bg-raised)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                  outline: "none",
                }}
                onFocus={(e) => (e.target.style.borderColor = "var(--amber)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium mb-1.5"
                style={{ color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
                PASSWORD
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-lg text-sm transition-colors"
                style={{
                  background: "var(--bg-raised)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                  outline: "none",
                }}
                onFocus={(e) => (e.target.style.borderColor = "var(--amber)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
              />
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-lg px-4 py-3 text-sm"
                style={{
                  background: "rgba(220, 60, 60, 0.1)",
                  border: "1px solid rgba(220, 60, 60, 0.3)",
                  color: "#f87171",
                }}>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              onClick={handleLogin}
              disabled={loading || !email || !password}
              className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all mt-2 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: loading ? "var(--amber-dim)" : "var(--amber)",
                color: "#080c14",
                boxShadow: loading ? "none" : "0 0 20px var(--amber-glow)",
              }}
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </div>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: "var(--text-muted)" }}>
          Access restricted to authorized recruiters only
        </p>
      </div>
    </div>
  );
}
