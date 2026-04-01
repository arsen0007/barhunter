"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Props {
  userEmail: string;
  userRole: string;
  userName: string;
}

export default function DashboardNav({ userEmail, userRole, userName }: Props) {
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <nav className="sticky top-0 z-50 px-6 py-0"
      style={{
        background: "rgba(8, 12, 20, 0.85)",
        borderBottom: "1px solid var(--border)",
        backdropFilter: "blur(12px)",
      }}>
      <div className="max-w-[1400px] mx-auto flex items-center justify-between h-14">

        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md flex items-center justify-center"
            style={{ background: "var(--amber)" }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M8 1L14 4.5V11.5L8 15L2 11.5V4.5L8 1Z" fill="#080c14" fillOpacity="0.9" />
              <path d="M5 8L7.5 10.5L11 6" stroke="#080c14" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="font-bold tracking-tight text-sm">
            Bar<span style={{ color: "var(--amber)" }}>Hunter</span>
          </span>
        </div>

        {/* Nav links */}
        <div className="flex items-center gap-1">
          <a href="/dashboard"
            className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
            style={{ color: "var(--text-secondary)" }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.color = "var(--text-primary)";
              (e.target as HTMLElement).style.background = "var(--bg-raised)";
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.color = "var(--text-secondary)";
              (e.target as HTMLElement).style.background = "transparent";
            }}>
            Leads
          </a>
          <a href="/my-stats"
            className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
            style={{ color: "var(--text-secondary)" }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.color = "var(--text-primary)";
              (e.target as HTMLElement).style.background = "var(--bg-raised)";
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.color = "var(--text-secondary)";
              (e.target as HTMLElement).style.background = "transparent";
            }}>
            My Activity
          </a>
          {userRole === "admin" && (
            <a href="/admin"
              className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
              style={{ color: "var(--text-secondary)" }}
              onMouseEnter={(e) => {
                (e.target as HTMLElement).style.color = "var(--text-primary)";
                (e.target as HTMLElement).style.background = "var(--bg-raised)";
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLElement).style.color = "var(--text-secondary)";
                (e.target as HTMLElement).style.background = "transparent";
              }}>
              Admin
            </a>
          )}
        </div>

        {/* User + signout */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
              {userName || userEmail}
            </div>
            <div className="text-xs" style={{
              color: userRole === "admin" ? "var(--amber)" : "var(--text-muted)",
              fontFamily: "var(--font-mono)",
            }}>
              {userRole}
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="px-3 py-1.5 rounded-md text-xs font-medium transition-all"
            style={{
              background: "var(--bg-raised)",
              border: "1px solid var(--border)",
              color: "var(--text-secondary)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget.style.borderColor = "var(--border-bright)");
              (e.currentTarget.style.color = "var(--text-primary)");
            }}
            onMouseLeave={(e) => {
              (e.currentTarget.style.borderColor = "var(--border)");
              (e.currentTarget.style.color = "var(--text-secondary)");
            }}
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}
