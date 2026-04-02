"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);
  const router   = useRouter();
  const supabase = createClient();

  async function handleLogin() {
    setLoading(true); setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); setLoading(false); }
    else { router.push("/dashboard"); router.refresh(); }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "#eaecf0" }}
    >
      {/* Card */}
      <div
        className="w-full max-w-sm rounded-2xl p-10"
        style={{
          background: "#ffffff",
          boxShadow: "0 4px 32px rgba(0,0,0,0.10)",
        }}
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-7">
          <div className="flex items-center gap-2 mb-5">
            {/* Pin icon in crimson */}
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
                fill="#8b1a1a"
              />
              <circle cx="12" cy="9" r="2.5" fill="white" />
            </svg>
            <span className="text-2xl font-bold" style={{ color: "#1a2332" }}>
              Bar<span style={{ color: "#8b1a1a" }}>Hunter</span>
            </span>
          </div>

          <h1 className="text-xl font-bold mb-1" style={{ color: "#1a2332" }}>
            Sign in
          </h1>
          <p className="text-sm" style={{ color: "#8a9ab0" }}>
            Access restricted to authorized users
          </p>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {/* Email */}
          <div>
            <label
              className="block text-sm font-medium mb-1.5"
              style={{ color: "#4a5568" }}
            >
              Email
            </label>
            <div className="relative">
              <span
                className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: "#8a9ab0" }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                placeholder="recruiter@barhunter.com"
                style={{
                  width: "100%",
                  padding: "10px 12px 10px 36px",
                  border: "1px solid #e2e6ed",
                  borderRadius: "10px",
                  fontSize: "14px",
                  background: "#f8f9fb",
                  color: "#1a2332",
                  outline: "none",
                  transition: "border-color 0.15s",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#8b1a1a")}
                onBlur={(e) => (e.target.style.borderColor = "#e2e6ed")}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label
              className="block text-sm font-medium mb-1.5"
              style={{ color: "#4a5568" }}
            >
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              placeholder="••••••••••"
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid #e2e6ed",
                borderRadius: "10px",
                fontSize: "14px",
                background: "#f8f9fb",
                color: "#1a2332",
                outline: "none",
                transition: "border-color 0.15s",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#8b1a1a")}
              onBlur={(e) => (e.target.style.borderColor = "#e2e6ed")}
            />
          </div>

          {/* Error */}
          {error && (
            <div
              className="rounded-lg px-3 py-2.5 text-sm"
              style={{
                background: "rgba(139,26,26,0.07)",
                border: "1px solid rgba(139,26,26,0.2)",
                color: "#8b1a1a",
              }}
            >
              {error}
            </div>
          )}

          {/* Login button */}
          <button
            onClick={handleLogin}
            disabled={loading || !email || !password}
            className="w-full py-3 text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: "#8b1a1a",
              color: "white",
              borderRadius: "10px",
              marginTop: "4px",
              letterSpacing: "0.02em",
            }}
            onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = "#7a1616"; }}
            onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = "#8b1a1a"; }}
          >
            {loading ? "Signing in..." : "Login"}
          </button>
        </div>
      </div>
    </div>
  );
}
