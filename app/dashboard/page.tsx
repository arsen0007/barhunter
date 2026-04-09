export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import LeadsClient from "./LeadsClient";

const CA_PROVINCES = new Set(["AB","BC","MB","NB","NL","NS","NT","NU","ON","PE","QC","SK","YT"]);

export default async function DashboardPage() {
  const supabase = await createClient();

  const [
    { count: totalLeads },
    { count: activeCount },
    { count: notActiveCount },
    { data: stateRows },
  ] = await Promise.all([
    supabase.from("leads").select("*", { count: "exact", head: true }),
    supabase.from("leads").select("*", { count: "exact", head: true }).eq("member_status", "Active"),
    supabase.from("leads").select("*", { count: "exact", head: true }).eq("member_status", "Not Active"),
    supabase.rpc("get_distinct_states"),
  ]);

  const states = (stateRows ?? []).map((r: { state: string }) => r.state);
  const usStates = states.filter((s: string) => !CA_PROVINCES.has(s));
  const caProvinces = states.filter((s: string) => CA_PROVINCES.has(s));
  const activePct = totalLeads && activeCount ? Math.round((activeCount / totalLeads) * 100) : 0;

  const countrySub = [
    usStates.length > 0 ? `${usStates.length} US state${usStates.length !== 1 ? "s" : ""}` : null,
    caProvinces.length > 0 ? `${caProvinces.length} CA province${caProvinces.length !== 1 ? "s" : ""}` : null,
  ].filter(Boolean).join(" · ");

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-bold mb-0.5" style={{ color: "#1a2332" }}>Lead Prospecting</h1>
        <p className="text-sm" style={{ color: "#8a9ab0" }}>Filter and export lawyer leads from state bar databases</p>
      </div>

      {/* ── STAT CARDS — 2 rows of 3 ── */}
      <div className="grid grid-cols-3 gap-3 mb-5">

        {/* Row 1 */}
        <StatCard
          color="#3182ce"
          value={totalLeads?.toLocaleString() ?? "—"}
          label="Total Leads"
          sub="in database"
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
        />
        <StatCard
          color="#38a169"
          value={activeCount?.toLocaleString() ?? "—"}
          label="Active Members"
          sub={`${activePct}% of total`}
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>}
        />
        <StatCard
          color="#718096"
          value={notActiveCount?.toLocaleString() ?? "—"}
          label="Not Active"
          sub="Inactive, deceased, resigned"
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>}
        />

        {/* Row 2 */}
        <StatCard
          color="#dd6b20"
          value={states.length.toString()}
          label="States / Provinces"
          sub={states.join(", ") || "—"}
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>}
        />
        <StatCard
          color="#805ad5"
          value={[usStates.length > 0 ? "US" : null, caProvinces.length > 0 ? "CA" : null].filter(Boolean).join(" · ") || "—"}
          label="Countries"
          sub={countrySub || "—"}
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>}
        />
        <StatCard
          color="#e53e3e"
          value="16"
          label="Practice Categories"
          sub="mapped from bar data"
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>}
        />
      </div>

      <LeadsClient states={states} />
    </div>
  );
}

function StatCard({ color, value, label, sub, icon }: {
  color: string; value: string; label: string; sub: string; icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl p-4 flex items-center gap-3"
      style={{ background: "#fff", border: "1px solid #e2e6ed", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}18`, color }}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-xl font-bold leading-tight" style={{ color }}>{value}</div>
        <div className="text-xs font-semibold mt-0.5" style={{ color: "#1a2332" }}>{label}</div>
        <div className="text-xs truncate" style={{ color: "#8a9ab0" }}>{sub}</div>
      </div>
    </div>
  );
}
