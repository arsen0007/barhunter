"use client";

import { useState } from "react";

interface Log {
  id: string;
  state: string | null;
  filters_json: Record<string, string | null> | null;
  leads_before_conflict: number | null;
  file_name: string | null;
  created_at: string;
}

interface Profile {
  email: string;
  full_name: string | null;
  created_at: string;
}

interface Summary {
  totalDownloads: number;
  totalLeads: number;
  topState: string | null;
  topCategory: string | null;
}

interface Props {
  profile: Profile;
  logs: Log[];
  summary: Summary;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function memberSince(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export default function MyStatsClient({ profile, logs, summary }: Props) {
  const [search, setSearch] = useState("");

  const filtered = logs.filter((l) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      l.state?.toLowerCase().includes(q) ||
      l.file_name?.toLowerCase().includes(q) ||
      Object.values(l.filters_json ?? {}).some((v) => v?.toLowerCase().includes(q))
    );
  });

  // Build activity chart — last 14 days
  const last14: { date: string; label: string; count: number; leads: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const dayLogs = logs.filter((l) => l.created_at.slice(0, 10) === dateStr);
    last14.push({
      date: dateStr,
      label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      count: dayLogs.length,
      leads: dayLogs.reduce((a, l) => a + (l.leads_before_conflict ?? 0), 0),
    });
  }
  const maxLeads = Math.max(...last14.map((d) => d.leads), 1);

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>
            My Activity
          </h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            {profile.full_name || profile.email} · Member since {memberSince(profile.created_at)}
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="rounded-xl p-4" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
          <div className="text-xs mb-1" style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>TOTAL DOWNLOADS</div>
          <div className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{summary.totalDownloads}</div>
          <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>download sessions</div>
        </div>

        <div className="rounded-xl p-4" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
          <div className="text-xs mb-1" style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>LEADS EXPORTED</div>
          <div className="text-2xl font-bold" style={{ color: "var(--amber)" }}>{summary.totalLeads.toLocaleString()}</div>
          <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>total leads downloaded</div>
        </div>

        <div className="rounded-xl p-4" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
          <div className="text-xs mb-1" style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>TOP STATE</div>
          <div className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            {summary.topState ?? "—"}
          </div>
          <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>most leads exported from</div>
        </div>

        <div className="rounded-xl p-4" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
          <div className="text-xs mb-1" style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>TOP CATEGORY</div>
          <div className="text-lg font-bold leading-tight" style={{ color: "var(--text-primary)" }}>
            {summary.topCategory ?? "—"}
          </div>
          <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>most searched category</div>
        </div>
      </div>

      {/* Activity chart — last 14 days */}
      <div className="rounded-2xl p-5 mb-8"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Leads Exported — Last 14 Days</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              {last14.reduce((a, d) => a + d.leads, 0).toLocaleString()} leads across {last14.filter(d => d.count > 0).length} active days
            </p>
          </div>
        </div>

        {summary.totalDownloads === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>No downloads yet — start searching leads to see activity here</p>
          </div>
        ) : (
          <div className="flex items-end gap-1.5 h-28">
            {last14.map((day) => (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                {/* Tooltip */}
                {day.leads > 0 && (
                  <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10"
                    style={{ background: "var(--bg-raised)", border: "1px solid var(--border)", borderRadius: "6px", padding: "4px 8px", whiteSpace: "nowrap" }}>
                    <span className="text-xs font-medium" style={{ color: "var(--amber)" }}>{day.leads.toLocaleString()} leads</span>
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}> · {day.count} download{day.count !== 1 ? "s" : ""}</span>
                  </div>
                )}
                <div className="w-full rounded-sm transition-all"
                  style={{
                    height: day.leads > 0 ? `${Math.max((day.leads / maxLeads) * 96, 4)}px` : "3px",
                    background: day.leads > 0 ? "var(--amber)" : "var(--border)",
                    opacity: day.leads > 0 ? 1 : 0.4,
                  }}
                />
                <span className="text-xs" style={{ color: "var(--text-muted)", fontSize: "0.65em" }}>
                  {day.label.split(" ")[1]}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Download history table */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>

        {/* Table header */}
        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-raised)" }}>
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Download History</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{logs.length} total downloads</p>
          </div>

          {/* Search */}
          {logs.length > 0 && (
            <div className="relative">
              <input
                type="text"
                placeholder="Search by state, category..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-4 py-1.5 rounded-lg text-sm w-56"
                style={{
                  background: "var(--bg-base)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                  outline: "none",
                }}
                onFocus={(e) => (e.target.style.borderColor = "var(--amber)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
              />
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2" width="12" height="12"
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                style={{ color: "var(--text-muted)" }}>
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
            </div>
          )}
        </div>

        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="text-3xl mb-3">📥</div>
            <p className="font-medium mb-1" style={{ color: "var(--text-primary)" }}>No downloads yet</p>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Your download history will appear here
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>No results for "{search}"</p>
          </div>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Filters Used", "Leads Downloaded", "File Name", "When"].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-medium"
                    style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)", background: "var(--bg-raised)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((log, i) => (
                <tr key={log.id}
                  style={{ borderBottom: "1px solid var(--border)", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)")}>

                  {/* Filters */}
                  <td className="px-5 py-3 max-w-[280px]">
                    <div className="flex flex-wrap gap-1">
                      {log.filters_json && Object.entries(log.filters_json)
                        .filter(([, v]) => v)
                        .map(([k, v]) => (
                          <span key={k} className="px-2 py-0.5 rounded text-xs"
                            style={{ background: "var(--bg-hover)", border: "1px solid var(--border)", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                            {k === "admission_year" ? `After ${v}` : v}
                          </span>
                        ))}
                      {(!log.filters_json || Object.values(log.filters_json).every(v => !v)) && (
                        <span style={{ color: "var(--text-muted)" }}>No filters</span>
                      )}
                    </div>
                  </td>

                  {/* Lead count */}
                  <td className="px-5 py-3">
                    <span className="text-base font-bold" style={{ color: "var(--amber)", fontFamily: "var(--font-mono)" }}>
                      {log.leads_before_conflict?.toLocaleString() ?? "—"}
                    </span>
                    <span className="text-xs ml-1" style={{ color: "var(--text-muted)" }}>leads</span>
                  </td>

                  {/* Filename */}
                  <td className="px-5 py-3 max-w-[220px]">
                    <div className="truncate text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                      {log.file_name ?? "—"}
                    </div>
                  </td>

                  {/* Time */}
                  <td className="px-5 py-3 whitespace-nowrap">
                    <div className="text-sm" style={{ color: "var(--text-secondary)" }}>{timeAgo(log.created_at)}</div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{formatDate(log.created_at)}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
