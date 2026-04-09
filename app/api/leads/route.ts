import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);

  const stateParam      = searchParams.get("state");
  const cityParam       = searchParams.get("city");
  const categoryParam   = searchParams.get("category");
  const admissionAfter  = searchParams.get("admissionYear");
  const admissionBefore = searchParams.get("admissionBefore");
  const status          = searchParams.get("status");
  const page            = parseInt(searchParams.get("page") ?? "1");
  const pageSize        = parseInt(searchParams.get("pageSize") ?? "100");

  const states     = stateParam    ? stateParam.split(",").map(s => s.trim()).filter(Boolean)    : [];
  const cities     = cityParam     ? cityParam.split(",").map(s => s.trim()).filter(Boolean)     : [];
  const categories = categoryParam ? categoryParam.split(",").map(s => s.trim()).filter(Boolean) : [];

  const fields = [
    "id","first_name","last_name","email","phone",
    "company","address","city","state","zip",
    "practice_areas","main_category","admission_date",
    "member_status","bar_number","law_school"
  ].join(", ");

  let query = supabase.from("leads").select(fields, { count: "exact" });

  if (states.length > 0)     query = query.in("state", states);
  if (cities.length > 0)     query = query.in("city", cities);
  if (categories.length > 0) query = query.in("main_category", categories);
  if (admissionAfter)        query = query.gte("admission_date", `${admissionAfter}-01-01`);
  if (admissionBefore)       query = query.lte("admission_date", `${admissionBefore}-12-31`);
  if (status)                query = query.eq("member_status", status);

  query = query.order("last_name");
  const from = (page - 1) * pageSize;
  query = query.range(from, from + pageSize - 1);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data, count, page, pageSize });
}
