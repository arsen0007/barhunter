import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);

  const state      = searchParams.get("state");
  const city       = searchParams.get("city");
  const category   = searchParams.get("category");
  const admissionYear = searchParams.get("admissionYear");
  const status     = searchParams.get("status");
  const page       = parseInt(searchParams.get("page") ?? "1");
  const pageSize   = parseInt(searchParams.get("pageSize") ?? "100");

  const fields = [
    "id", "first_name", "last_name", "email", "phone",
    "company", "address", "city", "state", "zip",
    "practice_areas", "main_category", "admission_date",
    "member_status", "bar_number", "law_school"
  ].join(", ");

  let query = supabase
    .from("leads")
    .select(fields, { count: "exact" });

  if (state)         query = query.eq("state", state);
  if (city)          query = query.eq("city", city);
  if (category)      query = query.eq("main_category", category);
  if (admissionYear) query = query.gte("admission_date", `${admissionYear}-01-01`);
  if (status)        query = query.eq("member_status", status);

  query = query.order("last_name");

  const from = (page - 1) * pageSize;
  query = query.range(from, from + pageSize - 1);

  const { data, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data, count, page, pageSize });
}
