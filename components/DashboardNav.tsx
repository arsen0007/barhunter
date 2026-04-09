"use client";

import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Props {
  userEmail: string;
  userRole: string;
  userName: string;
}

export default function DashboardNav({ userEmail, userRole, userName }: Props) {
  const router   = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const links = [
    {
      href: "/dashboard",
      label: "Leads",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      ),
    },
    {
      href: "/my-stats",
      label: "My Activity",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><polyline points="12 8 12 12 14 14"/>
        </svg>
      ),
    },
    ...(userRole === "admin" ? [{
      href: "/admin",
      label: "Admin",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      ),
    }] : []),
  ];

  const displayName = userName || userEmail;
  const initials = displayName.split(/[\s@]/).filter(Boolean).slice(0, 2)
    .map((s: string) => s[0].toUpperCase()).join("");

  return (
    <aside className="flex flex-col h-screen sticky top-0 flex-shrink-0"
      style={{ width: "210px", background: "#1e2d3d", borderRight: "1px solid rgba(255,255,255,0.06)" }}>

      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex items-center gap-2 flex-shrink-0">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#8b1a1a"/>
            <circle cx="12" cy="9" r="2.5" fill="white"/>
          </svg>
          <span className="text-sm font-bold text-white tracking-tight whitespace-nowrap">
            Bar<span style={{ color: "#e88080" }}>Hunter</span>
          </span>
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: "1px", background: "rgba(255,255,255,0.07)", margin: "0 16px 8px" }} />

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-0.5">
        {links.map((link) => {
          const active = pathname === link.href ||
            (link.href !== "/dashboard" && pathname.startsWith(link.href));
          return (
            <a key={link.href} href={link.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
              style={{
                background: active ? "rgba(139,26,26,0.25)" : "transparent",
                color: active ? "#ffffff" : "#8fa3bc",
                borderLeft: active ? "3px solid #8b1a1a" : "3px solid transparent",
              }}
              onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "#c8d8e8"; } }}
              onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#8fa3bc"; } }}>
              <span style={{ opacity: active ? 1 : 0.65 }}>{link.icon}</span>
              {link.label}
            </a>
          );
        })}
      </nav>

      {/* User */}
      <div className="px-4 pb-5 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="flex items-center gap-2.5">
          {/* Avatar with green dot */}
          <div className="relative flex-shrink-0">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ background: "#8b1a1a" }}>
              {initials}
            </div>
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2"
              style={{ background: "#38a169", borderColor: "#1e2d3d" }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-white truncate">
              {displayName.split("@")[0]}
            </div>
            <div className="text-xs capitalize" style={{ color: "#8fa3bc" }}>{userRole}</div>
          </div>
          {/* Sign out icon button */}
          <button onClick={handleSignOut} title="Sign out"
            className="flex-shrink-0 p-1.5 rounded transition-all"
            style={{ color: "#8fa3bc" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#fff"; e.currentTarget.style.background = "rgba(255,255,255,0.08)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#8fa3bc"; e.currentTarget.style.background = "transparent"; }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
