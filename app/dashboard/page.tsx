export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import LeadsClient from "./LeadsClient";

export default async function DashboardPage() {
  const supabase = await createClient();

  const { count: totalLeads } = await supabase
    .from("leads").select("*", { count: "exact", head: true });

  const { count: activeCount } = await supabase
    .from("leads").select("*", { count: "exact", head: true })
    .eq("member_status", "Active");

  const { count: notActiveCount } = await supabase
    .from("leads").select("*", { count: "exact", head: true })
    .eq("member_status", "Not Active");

  // Proper distinct query via DB function — avoids Supabase 1000 row REST cap
  const { data: stateRows } = await supabase
    .rpc("get_distinct_states");

  const states = stateRows?.map((r: { state: string }) => r.state) ?? [];

  const activePct = totalLeads && activeCount
    ? Math.round((activeCount / totalLeads) * 100) : 0;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>
          Lead Prospecting
        </h1>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Filter and export lawyer leads from state bar databases
        </p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="rounded-xl p-4" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
          <div className="text-xs mb-1" style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>TOTAL LEADS</div>
          <div className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{totalLeads?.toLocaleString() ?? "—"}</div>
        </div>

        <div className="rounded-xl p-4" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
          <div className="text-xs mb-1" style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>STATES</div>
          <div className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{states.length}</div>
        </div>

        <div className="rounded-xl p-4" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
          <div className="text-xs mb-1" style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>ACTIVE MEMBERS</div>
          <div className="text-2xl font-bold" style={{ color: "#4ade80" }}>{activeCount?.toLocaleString() ?? "—"}</div>
          <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{activePct}% of total</div>
        </div>

        <div className="rounded-xl p-4" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
          <div className="text-xs mb-1" style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>NOT ACTIVE</div>
          <div className="text-2xl font-bold" style={{ color: "var(--text-secondary)" }}>{notActiveCount?.toLocaleString() ?? "—"}</div>
          <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Inactive, deceased, resigned</div>
        </div>
      </div>

      <LeadsClient states={states} />
    </div>
  );
}