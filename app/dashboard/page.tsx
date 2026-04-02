export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import LeadsClient from "./LeadsClient";

export default async function DashboardPage() {
  const supabase = await createClient();

  const { count: totalLeads }     = await supabase.from("leads").select("*", { count: "exact", head: true });
  const { count: activeCount }    = await supabase.from("leads").select("*", { count: "exact", head: true }).eq("member_status", "Active");
  const { count: notActiveCount } = await supabase.from("leads").select("*", { count: "exact", head: true }).eq("member_status", "Not Active");
  const { data: stateRows }       = await supabase.rpc("get_distinct_states");
  const states = stateRows?.map((r: { state: string }) => r.state) ?? [];
  const activePct = totalLeads && activeCount ? Math.round((activeCount / totalLeads) * 100) : 0;

  const stats = [
    {
      label: "Total Leads",
      value: totalLeads?.toLocaleString() ?? "—",
      sub: "in database",
      color: "#3182ce",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      ),
    },
    {
      label: "States",
      value: states.length.toString(),
      sub: states.join(", ") || "—",
      color: "#dd6b20",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      ),
    },
    {
      label: "Active Members",
      value: activeCount?.toLocaleString() ?? "—",
      sub: `${activePct}% of total`,
      color: "#38a169",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      ),
    },
    {
      label: "Not Active",
      value: notActiveCount?.toLocaleString() ?? "—",
      sub: "Inactive, deceased, resigned",
      color: "#718096",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="10"/>
          <line x1="15" y1="9" x2="9" y2="15"/>
          <line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
      ),
    },
  ];

  return (
    <div>
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-1" style={{ color: "#1a2332" }}>
          Lead Prospecting
        </h1>
        <p className="text-sm" style={{ color: "#8a9ab0" }}>
          Filter and export lawyer leads from state bar databases
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {stats.map((s) => (
          <div key={s.label}
            className="rounded-xl p-6"
            style={{
              background: "#ffffff",
              border: "1px solid #e2e6ed",
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            }}>
            {/* Icon + number on same line */}
            <div className="flex items-center gap-2 mb-3">
              <span style={{ color: s.color }}>{s.icon}</span>
              <span className="text-3xl font-bold" style={{ color: s.color, lineHeight: 1 }}>
                {s.value}
              </span>
            </div>
            <p className="text-base font-bold mb-1" style={{ color: "#1a2332" }}>{s.label}</p>
            <p className="text-sm" style={{ color: "#8a9ab0" }}>{s.sub}</p>
          </div>
        ))}
      </div>

      <LeadsClient states={states} />
    </div>
  );
}
