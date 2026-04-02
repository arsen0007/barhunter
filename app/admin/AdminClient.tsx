"use client";

import { useState } from "react";

interface RecruiterStat {
  user_id: string;
  email: string;
  full_name: string | null;
  total_downloads: number;
  total_leads: number;
  last_download: string | null;
}

interface DownloadLog {
  id: string;
  user_id: string;
  state: string | null;
  filters_json: Record<string, string | null> | null;
  leads_before_conflict: number | null;
  file_name: string | null;
  created_at: string;
  profiles: { email: string; full_name: string | null } | null;
}

interface PlatformStats {
  totalLeads: number;
  totalDownloads: number;
  totalLeadsDownloaded: number;
}

interface Props {
  recruiterStats: RecruiterStat[];
  logs: DownloadLog[];
  platformStats: PlatformStats;
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

function formatFilters(filters: Record<string, string | null> | null) {
  if (!filters) return "—";
  const parts = [];
  if (filters.state) parts.push(filters.state);
  if (filters.city) parts.push(filters.city);
  if (filters.category) parts.push(filters.category);
  if (filters.status) parts.push(filters.status);
  if (filters.admission_year) parts.push(`After ${filters.admission_year}`);
  return parts.length ? parts.join(" · ") : "No filters";
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function AdminClient({ recruiterStats, logs, platformStats }: Props) {
  const [activeTab, setActiveTab] = useState<"overview" | "logs">("overview");

  const statCard = (label: string, value: string | number, sub?: string, color?: string) => (
    <div className="rounded-xl p-4" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
      <div className="text-xs mb-1" style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{label}</div>
      <div className="text-2xl font-bold" style={{ color: color ?? "var(--text-primary)" }}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
      {sub && <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{sub}</div>}
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>
          Admin Dashboard
        </h1>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Platform activity, recruiter performance, and download logs
        </p>
      </div>

      {/* Platform stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {statCard("TOTAL LEADS IN DB", platformStats.totalLeads)}
        {statCard("TOTAL DOWNLOADS", platformStats.totalDownloads)}
        {statCard("TOTAL LEADS EXPORTED", platformStats.totalLeadsDownloaded, "across all recruiters", "var(--crimson)")}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl w-fit"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
        {(["overview", "logs"] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className="px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all"
            style={{
              background: activeTab === tab ? "var(--crimson)" : "transparent",
              color: activeTab === tab ? "#ffffff" : "var(--text-secondary)",
            }}>
            {tab === "overview" ? "Recruiter Overview" : "Download Logs"}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {activeTab === "overview" && (
        <div className="rounded-lg overflow-hidden"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
          {recruiterStats.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <p className="font-medium mb-1" style={{ color: "var(--text-primary)" }}>No recruiter activity yet</p>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>Downloads will appear here once recruiters start using the platform</p>
            </div>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["Recruiter", "Total Downloads", "Total Leads Exported", "Last Active"].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-medium"
                      style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)", background: "var(--section-header)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recruiterStats.map((r, i) => (
                  <tr key={r.user_id}
                    style={{ borderBottom: "1px solid var(--border)", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#f7f9fc")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)")}>

                    {/* Recruiter */}
                    <td className="px-5 py-4">
                      <div className="font-medium" style={{ color: "var(--text-primary)" }}>
                        {r.full_name || r.email}
                      </div>
                      {r.full_name && (
                        <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{r.email}</div>
                      )}
                    </td>

                    {/* Downloads */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                          {r.total_downloads.toLocaleString()}
                        </span>
                        {r.total_downloads === 0 && (
                          <span className="text-xs px-2 py-0.5 rounded-full"
                            style={{ background: "var(--section-header)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
                            no activity
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Leads exported */}
                    <td className="px-5 py-4">
                      <span className="text-lg font-bold"
                        style={{ color: r.total_leads > 0 ? "var(--crimson)" : "var(--text-muted)" }}>
                        {r.total_leads.toLocaleString()}
                      </span>
                    </td>

                    {/* Last active */}
                    <td className="px-5 py-4" style={{ color: "var(--text-secondary)", fontSize: "0.85em" }}>
                      {r.last_download ? (
                        <div>
                          <div>{timeAgo(r.last_download)}</div>
                          <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                            {formatDate(r.last_download)}
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: "var(--text-muted)" }}>Never</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── LOGS TAB ── */}
      {activeTab === "logs" && (
        <div className="rounded-lg overflow-hidden"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <p className="font-medium mb-1" style={{ color: "var(--text-primary)" }}>No downloads yet</p>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>All download activity will be logged here</p>
            </div>
          ) : (
            <>
              <div className="px-5 py-3 text-xs"
                style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border)", background: "var(--section-header)" }}>
                Showing last {logs.length} downloads · most recent first
              </div>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {["Recruiter", "Filters Used", "Leads", "File", "Time"].map((h) => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-medium"
                        style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)", background: "var(--section-header)" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, i) => {
                    const recruiter = log.profiles;
                    return (
                      <tr key={log.id}
                        style={{ borderBottom: "1px solid var(--border)", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#f7f9fc")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)")}>

                        {/* Recruiter */}
                        <td className="px-5 py-3">
                          <div className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>
                            {recruiter?.full_name || recruiter?.email || "Unknown"}
                          </div>
                          {recruiter?.full_name && (
                            <div className="text-xs" style={{ color: "var(--text-muted)" }}>{recruiter.email}</div>
                          )}
                        </td>

                        {/* Filters */}
                        <td className="px-5 py-3 max-w-[250px]">
                          <div className="flex flex-wrap gap-1">
                            {log.filters_json && Object.entries(log.filters_json)
                              .filter(([, v]) => v)
                              .map(([k, v]) => (
                                <span key={k} className="px-2 py-0.5 rounded text-xs"
                                  style={{ background: "#f7f9fc", border: "1px solid var(--border)", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                                  {k === "admission_year" ? `After ${v}` : v}
                                </span>
                              ))
                            }
                            {(!log.filters_json || Object.values(log.filters_json).every(v => !v)) && (
                              <span style={{ color: "var(--text-muted)" }}>No filters</span>
                            )}
                          </div>
                        </td>

                        {/* Lead count */}
                        <td className="px-5 py-3">
                          <span className="font-bold" style={{ color: "var(--crimson)", fontFamily: "var(--font-mono)" }}>
                            {log.leads_before_conflict?.toLocaleString() ?? "—"}
                          </span>
                        </td>

                        {/* Filename */}
                        <td className="px-5 py-3 max-w-[200px]">
                          <div className="truncate text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                            {log.file_name ?? "—"}
                          </div>
                        </td>

                        {/* Time */}
                        <td className="px-5 py-3 whitespace-nowrap">
                          <div className="text-sm" style={{ color: "var(--text-secondary)" }}>
                            {timeAgo(log.created_at)}
                          </div>
                          <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                            {formatDate(log.created_at)}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}
    </div>
  );
}
