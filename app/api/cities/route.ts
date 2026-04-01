import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const state = new URL(req.url).searchParams.get("state");

  if (!state) return NextResponse.json({ cities: [] });

  const { data, error } = await supabase
    .from("leads")
    .select("city")
    .eq("state", state)
    .not("city", "is", null)
    .order("city");

  if (error) return NextResponse.json({ cities: [] });

  const cities = [...new Set(data.map((r) => r.city).filter(Boolean))];
  return NextResponse.json({ cities });
}
