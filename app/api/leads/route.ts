import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);

  const stateParam    = searchParams.get("state");
  const cityParam     = searchParams.get("city");
  const categoryParam = searchParams.get("category");
  const admissionYear = searchParams.get("admissionYear");
  const status        = searchParams.get("status");
  const page          = parseInt(searchParams.get("page") ?? "1");
  const pageSize      = parseInt(searchParams.get("pageSize") ?? "100");

  // Split comma-separated multi-values
  const states     = stateParam    ? stateParam.split(",").map(s => s.trim()).filter(Boolean)    : [];
  const cities     = cityParam     ? cityParam.split(",").map(s => s.trim()).filter(Boolean)     : [];
  const categories = categoryParam ? categoryParam.split(",").map(s => s.trim()).filter(Boolean) : [];

  const statesNormal  = states.filter(s => s !== "__unknown__");
  const statesUnknown = states.includes("__unknown__");
  const citiesNormal  = cities.filter(s => s !== "__unknown__");
  const citiesUnknown = cities.includes("__unknown__");
  const catsNormal    = categories.filter(s => s !== "__unknown__");
  const catsUnknown   = categories.includes("__unknown__");

  const fields = [
    "id","first_name","last_name","email","phone",
    "company","address","city","state","zip",
    "practice_areas","main_category","admission_date",
    "member_status","bar_number","law_school"
  ].join(", ");

  let query = supabase.from("leads").select(fields, { count: "exact" });

  // ── State filter ──
  if (statesNormal.length > 0 && statesUnknown) {
    query = query.or(`state.in.(${statesNormal.join(",")}),state.is.null`);
  } else if (statesNormal.length > 0) {
    query = query.in("state", statesNormal);
  } else if (statesUnknown) {
    query = query.is("state", null);
  }

  // ── City filter ──
  if (citiesNormal.length > 0 && citiesUnknown) {
    query = query.or(`city.in.(${citiesNormal.join(",")}),city.is.null`);
  } else if (citiesNormal.length > 0) {
    query = query.in("city", citiesNormal);
  } else if (citiesUnknown) {
    query = query.is("city", null);
  }

  // ── Category filter ──
  if (catsNormal.length > 0 && catsUnknown) {
    query = query.or(`main_category.in.(${catsNormal.join(",")}),main_category.is.null`);
  } else if (catsNormal.length > 0) {
    query = query.in("main_category", catsNormal);
  } else if (catsUnknown) {
    query = query.is("main_category", null);
  }

  // ── Single filters ──
  if (admissionYear) query = query.gte("admission_date", `${admissionYear}-01-01`);
  if (status)        query = query.eq("member_status", status);

  query = query.order("last_name");
  const from = (page - 1) * pageSize;
  query = query.range(from, from + pageSize - 1);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data, count, page, pageSize });
}
