import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const stateParam = new URL(req.url).searchParams.get("state");

  if (!stateParam) return NextResponse.json({ cities: [] });

  const states = stateParam.split(",").map(s => s.trim()).filter(Boolean);

  // .range(0, 4999) bypasses the default 1000 row Supabase RPC cap
  const { data, error } = await supabase
    .rpc("get_distinct_cities", { p_states: states })
    .range(0, 4999);

  if (error) return NextResponse.json({ cities: [] });

  const cities = (data ?? []).map((r: { city: string }) => r.city).filter(Boolean);
  return NextResponse.json({ cities });
}
