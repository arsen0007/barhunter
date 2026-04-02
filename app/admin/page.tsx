export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AdminClient from "./AdminClient";

export default async function AdminPage() {
  const supabase = await createClient();

  // Auth check — admin only
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/dashboard");

  // Recruiter stats via DB function
  const { data: recruiterStats } = await supabase
    .rpc("get_recruiter_stats");

  // Recent download logs — last 200, joined with profile email
  const { data: logs } = await supabase
    .from("download_logs")
    .select(`
      id,
      user_id,
      state,
      filters_json,
      leads_before_conflict,
      file_name,
      created_at,
      profiles (
        email,
        full_name
      )
    `)
    .order("created_at", { ascending: false })
    .limit(200);

  // ✅ FIX: normalize profiles from array → object
  const formattedLogs = (logs ?? []).map((log) => ({
    ...log,
    profiles: log.profiles?.[0] || null,
  }));

  // Platform totals
  const { count: totalLeads } = await supabase
    .from("leads").select("*", { count: "exact", head: true });

  const { count: totalDownloads } = await supabase
    .from("download_logs").select("*", { count: "exact", head: true });

  const { data: totalLeadsDownloaded } = await supabase
    .from("download_logs")
    .select("leads_before_conflict");

  const sumLeadsDownloaded = totalLeadsDownloaded
    ?.reduce((acc, r) => acc + (r.leads_before_conflict ?? 0), 0) ?? 0;

  return (
    <AdminClient
      recruiterStats={recruiterStats ?? []}
      logs={formattedLogs} 
      platformStats={{
        totalLeads: totalLeads ?? 0,
        totalDownloads: totalDownloads ?? 0,
        totalLeadsDownloaded: sumLeadsDownloaded,
      }}
    />
  );
}