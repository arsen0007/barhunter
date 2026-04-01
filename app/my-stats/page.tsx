export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import MyStatsClient from "./MyStatsClient";

export default async function MyStatsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Own profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("email, full_name, role, created_at")
    .eq("id", user.id)
    .single();

  // Own download logs
  const { data: logs } = await supabase
    .from("download_logs")
    .select("id, state, filters_json, leads_before_conflict, file_name, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const totalDownloads = logs?.length ?? 0;
  const totalLeads = logs?.reduce((acc, l) => acc + (l.leads_before_conflict ?? 0), 0) ?? 0;

  // Most downloaded state
  const stateCounts: Record<string, number> = {};
  logs?.forEach((l) => {
    if (l.state) stateCounts[l.state] = (stateCounts[l.state] ?? 0) + (l.leads_before_conflict ?? 0);
  });
  const topState = Object.entries(stateCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  // Most used category
  const catCounts: Record<string, number> = {};
  logs?.forEach((l) => {
    const cat = l.filters_json?.category;
    if (cat) catCounts[cat] = (catCounts[cat] ?? 0) + 1;
  });
  const topCategory = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  return (
    <MyStatsClient
      profile={{ email: profile?.email ?? "", full_name: profile?.full_name ?? null, created_at: profile?.created_at ?? "" }}
      logs={logs ?? []}
      summary={{ totalDownloads, totalLeads, topState, topCategory }}
    />
  );
}
