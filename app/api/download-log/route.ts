import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { filters_json, leads_count, leads_after_conflict, file_name } = body;

  const { error } = await supabase.from("download_logs").insert({
    user_id: user.id,
    state: filters_json?.state ?? null,
    filters_json,
    leads_before_conflict: leads_count,
    leads_after_conflict: leads_after_conflict ?? leads_count,
    file_name,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
