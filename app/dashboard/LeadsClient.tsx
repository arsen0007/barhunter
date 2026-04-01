"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const MAIN_CATEGORIES = [
  "Business Law", "Criminal Law", "Intellectual Property Law",
  "General Civil / Consumer Law", "Insurance / Insurance Law",
  "Bankruptcy", "Family Law", "Military Law", "Estate Planning / Elder Law",
  "Immigration Law", "Torts", "Real Estate Law", "Labor / Employment",
  "Mediation", "Taxes", "General Classification",
];

const ADMISSION_YEARS = Array.from({ length: 35 }, (_, i) => 2024 - i);

interface Lead {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  practice_areas: string[] | null;
  main_category: string | null;
  admission_date: string | null;
  member_status: string | null;
  bar_number: string | null;
  law_school: string | null;
}

interface ConflictResult {
  clean: Lead[];
  removedByEmail: number;
  removedByPhone: number;
  removedByName: number;
  removedByBar: number;
  total: number;
}

interface Props { states: string[]; }

// ── Filename builder ──
function buildFileName(
  f: { state: string; city: string; category: string; year: string; status: string },
  suffix?: string
) {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const parts = ["barhunter"];
  if (f.state) parts.push(f.state);
  if (f.city) parts.push(f.city.replace(/\s+/g, ""));
  if (f.category) parts.push(f.category.replace(/[\s/]+/g, ""));
  if (f.status === "Active") parts.push("Active");
  else if (f.status === "Not Active") parts.push("NotActive");
  if (f.year) parts.push(`${f.year}plus`);
  if (suffix) parts.push(suffix);
  parts.push(today);
  return parts.join("_") + ".csv";
}

// ── CSV generator ──
function generateCSV(leads: Lead[]): string {
  const headers = [
    "FirstName", "LastName", "Email", "Phone", "Company",
    "Address", "City", "State", "Zip", "PracticeAreas",
    "MainCategory", "AdmissionDate", "MemberStatus", "BarNumber", "LawSchool",
  ];
  const rows = leads.map((l) => [
    l.first_name ?? "", l.last_name ?? "", l.email ?? "", l.phone ?? "",
    l.company ?? "", l.address ?? "", l.city ?? "", l.state ?? "", l.zip ?? "",
    (l.practice_areas ?? []).join("; "), l.main_category ?? "",
    l.admission_date ?? "", l.member_status ?? "", l.bar_number ?? "", l.law_school ?? "",
  ]);
  return [headers, ...rows]
    .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

function triggerDownload(csv: string, fileName: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = fileName; a.click();
  URL.revokeObjectURL(url);
}

// ── Normalizers ──
function normalizeName(s: string | null): string {
  if (!s) return "";
  return s.toLowerCase().replace(/[^a-z]/g, "").trim();
}

function normalizePhone(s: string | null): string {
  if (!s) return "";
  const digits = s.replace(/\D/g, "");
  return digits.startsWith("1") && digits.length === 11 ? digits.slice(1) : digits;
}

function splitEmails(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .replace(/\x0b/g, ";")
    .replace(/\n/g, ";")
    .split(/[;,]/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.includes("@") && e.includes("."));
}

// ── CSV parser (client-side, no library needed) ──
function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  // Parse header — handle quoted fields
  const parseRow = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        result.push(current.trim()); current = "";
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseRow(lines[0]).map((h) => h.toLowerCase().trim());
  return lines.slice(1).map((line) => {
    const vals = parseRow(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = vals[i] ?? ""; });
    return row;
  });
}

// ── THE CONFLICT ENGINE v3 ──
// Runs entirely in the browser. Company file never touches server.
//
// Stage 1: first name + ANY email (both after splitting)  → remove (high confidence)
// Stage 2: phone number only (10 digits exact)            → remove (high confidence)
// Stage 3: first name + last name                         → remove (name match)
// Stage 4: bar number exact match                         → remove (bulletproof)
//
interface ColumnMap {
  first: string;
  last: string;
  email: string;
  phone: string;
  bar_number: string;
}

function runConflictCheck(
  leads: Lead[],
  conflictRows: Record<string, string>[],
  colMap: ColumnMap
): ConflictResult {

  const emailConflicts = new Set<string>(); // "firstname|email"
  const phoneConflicts = new Set<string>(); // "phone10digits"
  const nameConflicts  = new Set<string>(); // "firstname|lastname"
  const barConflicts   = new Set<string>(); // "barnumber"

  for (const row of conflictRows) {
    const first  = normalizeName(row[colMap.first] ?? "");
    const last   = normalizeName(row[colMap.last] ?? "");
    const phone  = normalizePhone(row[colMap.phone] ?? "");
    const emails = splitEmails(row[colMap.email] ?? "");
    const bar    = (row[colMap.bar_number] ?? "").trim().toLowerCase().replace(/\s/g, "");

    if (first) emails.forEach((e) => emailConflicts.add(`${first}|${e}`));
    if (phone.length === 10) phoneConflicts.add(phone);
    if (first && last) nameConflicts.add(`${first}|${last}`);
    if (bar && bar !== "nan") barConflicts.add(bar);
  }

  const clean: Lead[] = [];
  let removedByEmail = 0;
  let removedByPhone = 0;
  let removedByName  = 0;
  let removedByBar   = 0;

  for (const lead of leads) {
    const first  = normalizeName(lead.first_name);
    const last   = normalizeName(lead.last_name);
    const phone  = normalizePhone(lead.phone);
    const emails = splitEmails(lead.email);
    const bar    = (lead.bar_number ?? "").trim().toLowerCase().replace(/\s/g, "");

    // Stage 1 — first name + any email
    if (first && emails.some((e) => emailConflicts.has(`${first}|${e}`))) {
      removedByEmail++; continue;
    }
    // Stage 2 — phone exact
    if (phone.length === 10 && phoneConflicts.has(phone)) {
      removedByPhone++; continue;
    }
    // Stage 3 — first + last name
    if (first && last && nameConflicts.has(`${first}|${last}`)) {
      removedByName++; continue;
    }
    // Stage 4 — bar number
    if (bar && barConflicts.has(bar)) {
      removedByBar++; continue;
    }

    clean.push(lead);
  }

  return { clean, removedByEmail, removedByPhone, removedByName, removedByBar, total: leads.length };
}

// ── CONFLICT MODAL ──
function ConflictModal({
  totalLeads,
  allLeads,
  filters,
  onClose,
  onLog,
}: {
  totalLeads: number;
  allLeads: Lead[];
  filters: { state: string; city: string; category: string; year: string; status: string };
  onClose: () => void;
  onLog: (before: number, after: number, fileName: string) => void;
}) {
  type Step = "upload" | "map" | "result";
  const [step, setStep] = useState<Step>("upload");
  const [dragOver, setDragOver] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [conflictRows, setConflictRows] = useState<Record<string, string>[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [colMap, setColMap] = useState<ColumnMap>({ first: "", last: "", email: "", phone: "", bar_number: "" });
  const [emailPreview, setEmailPreview] = useState<{ total: number; rows: number } | null>(null);
  const [result, setResult] = useState<ConflictResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Auto-detect columns from headers
  function autoDetect(headers: string[]): ColumnMap {
    const find = (candidates: string[]) =>
      headers.find((h) => candidates.includes(h.toLowerCase())) ?? "";
    return {
      first: find(["first", "first name", "firstname", "first_name", "given name"]),
      last: find(["last", "last name", "lastname", "last_name", "surname"]),
      email: find(["email", "email address", "emails", "e-mail", "email_address", "firm name"]),
      phone: find(["phone", "phone number", "phone_number", "phonenumber", "mobile", "cell"]),
      bar_number: find(["bar number", "bar_number", "barnumber", "bar no", "bar#", "license number"]),
    };
  }

  function processFile(file: File) {
    setProcessing(true);
    setUploadedFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const rows = parseCSV(text);
        if (rows.length === 0) {
          alert("Could not read the file. Make sure it\'s a valid CSV.");
          setProcessing(false);
          return;
        }
        const headers = Object.keys(rows[0]);
        setCsvHeaders(headers);
        setConflictRows(rows);
        const detected = autoDetect(headers);
        setColMap(detected);
        setStep("map");
      } catch {
        alert("Error reading file. Please check the format.");
      }
      setProcessing(false);
    };
    reader.readAsText(file);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }

  // Update email preview when email column is mapped
  function handleColChange(field: keyof ColumnMap, val: string) {
    const newMap = { ...colMap, [field]: val };
    setColMap(newMap);
    if (field === "email" && val) {
      let total = 0, rows = 0;
      for (const row of conflictRows) {
        const emails = splitEmails(row[val] ?? "");
        if (emails.length > 0) { total += emails.length; rows++; }
      }
      setEmailPreview({ total, rows });
    }
  }

  function runCheck() {
    if (!colMap.first || !colMap.email) {
      alert("Please map at least First Name and Email columns.");
      return;
    }
    const res = runConflictCheck(allLeads, conflictRows, colMap);
    setResult(res);
    setStep("result");
  }

  function downloadClean() {
    if (!result) return;
    const name = buildFileName(filters, "clean");
    triggerDownload(generateCSV(result.clean), name);
    onLog(result.total, result.clean.length, name);
    onClose();
  }

  function downloadAll() {
    const name = buildFileName(filters);
    triggerDownload(generateCSV(allLeads), name);
    onLog(totalLeads, totalLeads, name);
    onClose();
  }

  const totalRemoved = result ? result.removedByEmail + result.removedByPhone + result.removedByName + result.removedByBar : 0;

  const FIELDS: { key: keyof ColumnMap; label: string; required: boolean }[] = [
    { key: "first", label: "First Name", required: true },
    { key: "last", label: "Last Name", required: false },
    { key: "email", label: "Email", required: true },
    { key: "phone", label: "Phone", required: false },
    { key: "bar_number", label: "Bar Number", required: false },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>

      <div className="w-full max-w-lg rounded-2xl overflow-hidden"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "0 24px 64px rgba(0,0,0,0.6)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-raised)" }}>
          <div>
            <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
              Conflict Check
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              {totalLeads.toLocaleString()} leads ready · file stays on your device
            </p>
          </div>
          {/* Step indicator */}
          <div className="flex items-center gap-2 mr-4">
            {(["upload", "map", "result"] as Step[]).map((s, i) => (
              <div key={s} className="flex items-center gap-1">
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{
                    background: step === s ? "var(--amber)" : (
                      ["upload", "map", "result"].indexOf(step) > i ? "rgba(232,160,32,0.3)" : "var(--bg-hover)"
                    ),
                    color: step === s ? "#080c14" : "var(--text-muted)",
                  }}>
                  {i + 1}
                </div>
                {i < 2 && <div className="w-3 h-px" style={{ background: "var(--border)" }} />}
              </div>
            ))}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-hover)"; e.currentTarget.style.color = "var(--text-primary)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-muted)"; }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── STEP 1: UPLOAD ── */}
        {step === "upload" && (
          <div className="p-6">
            <div
              className="rounded-xl border-2 border-dashed flex flex-col items-center justify-center py-12 cursor-pointer transition-all mb-4"
              style={{
                borderColor: dragOver ? "var(--amber)" : "var(--border)",
                background: dragOver ? "rgba(232,160,32,0.04)" : "var(--bg-raised)",
              }}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}>
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileInput} />

              {processing ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-6 h-6 rounded-full border-2 animate-spin"
                    style={{ borderColor: "var(--amber)", borderTopColor: "transparent" }} />
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>Reading file...</p>
                </div>
              ) : (
                <>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
                    className="mb-3" style={{ color: dragOver ? "var(--amber)" : "var(--text-muted)" }}>
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  <p className="text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>
                    Upload your existing client list
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Drop CSV here or click to browse
                  </p>
                  <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
                    Any column names are fine — you&apos;ll map them next
                  </p>
                </>
              )}
            </div>

            <div className="flex justify-center">
              <button onClick={downloadAll}
                className="text-xs py-2 px-4 rounded-lg"
                style={{ color: "var(--text-muted)" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-secondary)"; e.currentTarget.style.background = "var(--bg-raised)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.background = "transparent"; }}>
                Skip — download all {totalLeads.toLocaleString()} leads without conflict check
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: COLUMN MAPPER ── */}
        {step === "map" && (
          <div className="p-6">
            <div className="mb-4">
              <p className="text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>
                Map your columns
              </p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                We detected {conflictRows.length.toLocaleString()} rows in <span style={{ color: "var(--amber)" }}>{uploadedFileName}</span>.
                Match each field to the right column.
              </p>
            </div>

            <div className="space-y-3 mb-5">
              {FIELDS.map(({ key, label, required }) => (
                <div key={key} className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 w-32 flex-shrink-0">
                    <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{label}</span>
                    {required && (
                      <span className="text-xs px-1.5 py-0.5 rounded"
                        style={{ background: "rgba(232,160,32,0.1)", color: "var(--amber)", border: "1px solid rgba(232,160,32,0.2)" }}>
                        required
                      </span>
                    )}
                  </div>
                  <select
                    value={colMap[key]}
                    onChange={(e) => handleColChange(key, e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg text-sm"
                    style={{
                      background: "var(--bg-raised)",
                      border: `1px solid ${colMap[key] ? "var(--amber)" : "var(--border)"}`,
                      color: colMap[key] ? "var(--text-primary)" : "var(--text-muted)",
                    }}>
                    <option value="">— not mapped —</option>
                    {csvHeaders.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            {/* Email preview */}
            {emailPreview && (
              <div className="rounded-lg px-4 py-3 mb-5 flex items-center gap-3"
                style={{ background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.15)" }}>
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#4ade80" }} />
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  Found <span className="font-bold" style={{ color: "#4ade80" }}>{emailPreview.total.toLocaleString()}</span> emails
                  across <span className="font-semibold">{emailPreview.rows.toLocaleString()}</span> rows after cleaning
                  {emailPreview.total > emailPreview.rows && (
                    <span style={{ color: "var(--text-muted)" }}>
                      {" "}({emailPreview.total - emailPreview.rows} rows had multiple emails — all will be checked)
                    </span>
                  )}
                </p>
              </div>
            )}

            {/* Matching logic explanation */}
            <div className="rounded-lg px-4 py-3 mb-5"
              style={{ background: "var(--bg-raised)", border: "1px solid var(--border)" }}>
              <p className="text-xs font-semibold mb-2" style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                MATCHING LOGIC
              </p>
              <div className="space-y-1.5">
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: "#ef4444" }} />
                  <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                    <span className="font-semibold">Stage 1</span> — First name + any email match
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: "#f97316" }} />
                  <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                    <span className="font-semibold">Stage 2</span> — Phone number exact match
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: "#eab308" }} />
                  <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                    <span className="font-semibold">Stage 3</span> — First + last name match
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: "#8b5cf6" }} />
                  <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                    <span className="font-semibold">Stage 4</span> — Bar number exact match
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setStep("upload")}
                className="px-4 py-2 rounded-xl text-sm font-medium"
                style={{ background: "var(--bg-raised)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                ← Back
              </button>
              <button onClick={runCheck}
                disabled={!colMap.first || !colMap.email}
                className="flex-1 py-2 rounded-xl text-sm font-semibold disabled:opacity-40"
                style={{ background: "var(--amber)", color: "#080c14" }}>
                Run Conflict Check
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: RESULTS ── */}
        {step === "result" && result && (
          <div className="p-6">
            <div className="rounded-xl p-4 mb-5"
              style={{ background: "var(--bg-raised)", border: "1px solid var(--border)" }}>

              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs font-semibold" style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                    CONFLICT SUMMARY
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                    Checked against {uploadedFileName}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold" style={{ color: "#4ade80" }}>
                    {result.clean.length.toLocaleString()}
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>clean leads</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between py-2"
                  style={{ borderBottom: "1px solid var(--border)" }}>
                  <span className="text-sm" style={{ color: "var(--text-secondary)" }}>Total leads found</span>
                  <span className="font-mono font-medium" style={{ color: "var(--text-primary)" }}>
                    {result.total.toLocaleString()}
                  </span>
                </div>

                {result.removedByEmail > 0 && (
                  <div className="flex items-center justify-between py-1.5 px-3 rounded-lg"
                    style={{ background: "rgba(239,68,68,0.06)" }}>
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#ef4444" }} />
                      <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                        Removed — first name + email
                      </span>
                    </div>
                    <span className="text-xs font-mono font-semibold" style={{ color: "#ef4444" }}>
                      −{result.removedByEmail.toLocaleString()}
                    </span>
                  </div>
                )}

                {result.removedByPhone > 0 && (
                  <div className="flex items-center justify-between py-1.5 px-3 rounded-lg"
                    style={{ background: "rgba(249,115,22,0.06)" }}>
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#f97316" }} />
                      <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                        Removed — phone number match
                      </span>
                    </div>
                    <span className="text-xs font-mono font-semibold" style={{ color: "#f97316" }}>
                      −{result.removedByPhone.toLocaleString()}
                    </span>
                  </div>
                )}

                {result.removedByName > 0 && (
                  <div className="flex items-center justify-between py-1.5 px-3 rounded-lg"
                    style={{ background: "rgba(234,179,8,0.06)" }}>
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#eab308" }} />
                      <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                        Removed — first + last name match
                      </span>
                    </div>
                    <span className="text-xs font-mono font-semibold" style={{ color: "#eab308" }}>
                      −{result.removedByName.toLocaleString()}
                    </span>
                  </div>
                )}

                {result.removedByBar > 0 && (
                  <div className="flex items-center justify-between py-1.5 px-3 rounded-lg"
                    style={{ background: "rgba(139,92,246,0.06)" }}>
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#8b5cf6" }} />
                      <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                        Removed — bar number match
                      </span>
                    </div>
                    <span className="text-xs font-mono font-semibold" style={{ color: "#8b5cf6" }}>
                      −{result.removedByBar.toLocaleString()}
                    </span>
                  </div>
                )}

                {totalRemoved === 0 && (
                  <div className="flex items-center gap-2 py-2 px-3 rounded-lg"
                    style={{ background: "rgba(74,222,128,0.06)" }}>
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#4ade80" }} />
                    <span className="text-xs" style={{ color: "#4ade80" }}>
                      No conflicts found — all leads are clean
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between py-2 pt-3"
                  style={{ borderTop: "1px solid var(--border)" }}>
                  <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    Clean leads ready
                  </span>
                  <span className="font-mono font-bold text-base" style={{ color: "#4ade80" }}>
                    {result.clean.length.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button onClick={downloadClean}
                className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
                style={{ background: "var(--amber)", color: "#080c14", boxShadow: "0 0 20px var(--amber-glow)" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download {result.clean.length.toLocaleString()} Clean Leads
              </button>

              <div className="flex gap-2">
                <button onClick={() => setStep("map")}
                  className="flex-1 py-2 rounded-xl text-xs font-medium"
                  style={{ background: "var(--bg-raised)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                  ← Adjust mapping
                </button>
                <button onClick={downloadAll}
                  className="flex-1 py-2 rounded-xl text-xs font-medium"
                  style={{ background: "var(--bg-raised)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                  Download all {result.total.toLocaleString()} anyway
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── MAIN COMPONENT ──
export default function LeadsClient({ states }: Props) {
  const [selState, setSelState] = useState("");
  const [selCity, setSelCity] = useState("");
  const [selCategory, setSelCategory] = useState("");
  const [selYear, setSelYear] = useState("");
  const [selStatus, setSelStatus] = useState("Active");

  const [cities, setCities] = useState<string[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false); // fetching all for modal
  const [hasQueried, setHasQueried] = useState(false);

  // Conflict modal state
  const [showConflict, setShowConflict] = useState(false);
  const [allLeads, setAllLeads] = useState<Lead[]>([]);

  const currentFilters = { state: selState, city: selCity, category: selCategory, year: selYear, status: selStatus };

  useEffect(() => {
    setSelCity(""); setCities([]);
    if (!selState) return;
    fetch(`/api/cities?state=${selState}`)
      .then((r) => r.json()).then((d) => setCities(d.cities ?? []));
  }, [selState]);

  function buildParams(extra?: Record<string, string>) {
    const p = new URLSearchParams();
    if (selState) p.set("state", selState);
    if (selCity) p.set("city", selCity);
    if (selCategory) p.set("category", selCategory);
    if (selYear) p.set("admissionYear", selYear);
    if (selStatus) p.set("status", selStatus);
    if (extra) Object.entries(extra).forEach(([k, v]) => p.set(k, v));
    return p;
  }

  const fetchLeads = useCallback(async (pageNum = 1) => {
    setLoading(true); setHasQueried(true);
    const res = await fetch(`/api/leads?${buildParams({ page: String(pageNum) })}`);
    const json = await res.json();
    setLeads(json.data ?? []); setTotalCount(json.count ?? 0);
    setPage(pageNum); setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selState, selCity, selCategory, selYear, selStatus]);

  // Open conflict modal — fetch ALL leads first
  async function openConflictModal() {
    setFetching(true);

    // Supabase REST API caps at 1,000 rows per request.
    // Paginate in 1,000-row chunks until we have everything.
    const PAGE_SIZE = 1000;
    let page = 1;
    let collected: Lead[] = [];
    let total = Infinity;

    while (collected.length < total) {
      const params = buildParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      const res = await fetch(`/api/leads?${params}`);
      const json = await res.json();
      const chunk: Lead[] = json.data ?? [];
      if (page === 1) total = json.count ?? chunk.length;
      collected = collected.concat(chunk);
      if (chunk.length < PAGE_SIZE) break; // last page
      page++;
    }

    setAllLeads(collected);
    setFetching(false);
    setShowConflict(true);
  }

  function logDownload(before: number, after: number, fileName: string) {
    fetch("/api/download-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filters_json: {
          state: selState || null, city: selCity || null,
          category: selCategory || null, admission_year: selYear || null,
          status: selStatus || null,
        },
        leads_count: before,
        leads_after_conflict: after,
        file_name: fileName,
      }),
    });
  }

  function handleReset() {
    setSelState(""); setSelCity(""); setSelCategory(""); setSelYear(""); setSelStatus("Active");
    setLeads([]); setTotalCount(null); setHasQueried(false); setPage(1);
  }

  const totalPages = totalCount ? Math.ceil(totalCount / 100) : 0;
  const hasFilters = selState || selCity || selCategory || selYear || selStatus !== "Active";

  const selectStyle = (hasValue: boolean) => ({
    background: "var(--bg-raised)", border: "1px solid var(--border)",
    color: hasValue ? "var(--text-primary)" : "var(--text-muted)",
  });

  return (
    <div>
      {/* CONFLICT MODAL */}
      {showConflict && (
        <ConflictModal
          totalLeads={allLeads.length}
          allLeads={allLeads}
          filters={currentFilters}
          onClose={() => setShowConflict(false)}
          onLog={logDownload}
        />
      )}

      {/* FILTER BAR */}
      <div className="rounded-2xl p-5 mb-6" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1.5 min-w-[140px]">
            <label className="text-xs font-medium" style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>STATE</label>
            <select value={selState} onChange={(e) => setSelState(e.target.value)} className="px-3 py-2 rounded-lg text-sm" style={selectStyle(!!selState)}>
              <option value="">All states</option>
              {states.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5 min-w-[180px]">
            <label className="text-xs font-medium" style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>CITY</label>
            <select value={selCity} onChange={(e) => setSelCity(e.target.value)} disabled={!selState || cities.length === 0}
              className="px-3 py-2 rounded-lg text-sm disabled:opacity-40" style={selectStyle(!!selCity)}>
              <option value="">All cities</option>
              {cities.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5 min-w-[220px]">
            <label className="text-xs font-medium" style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>PRACTICE CATEGORY</label>
            <select value={selCategory} onChange={(e) => setSelCategory(e.target.value)} className="px-3 py-2 rounded-lg text-sm" style={selectStyle(!!selCategory)}>
              <option value="">All categories</option>
              {MAIN_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5 min-w-[160px]">
            <label className="text-xs font-medium" style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>ADMITTED AFTER</label>
            <select value={selYear} onChange={(e) => setSelYear(e.target.value)} className="px-3 py-2 rounded-lg text-sm" style={selectStyle(!!selYear)}>
              <option value="">Any year</option>
              {ADMISSION_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5 min-w-[150px]">
            <label className="text-xs font-medium" style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>STATUS</label>
            <select value={selStatus} onChange={(e) => setSelStatus(e.target.value)} className="px-3 py-2 rounded-lg text-sm"
              style={{ background: "var(--bg-raised)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
              <option value="">All statuses</option>
              <option value="Active">Active only</option>
              <option value="Not Active">Not Active only</option>
            </select>
          </div>
          <div className="flex-1" />
          <div className="flex gap-2">
            {hasFilters && (
              <button onClick={handleReset} className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ background: "var(--bg-raised)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                Reset
              </button>
            )}
            <button onClick={() => fetchLeads(1)} disabled={loading}
              className="px-5 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
              style={{ background: "var(--amber)", color: "#080c14", boxShadow: "0 0 16px var(--amber-glow)" }}>
              {loading ? "Loading..." : "Search Leads"}
            </button>
          </div>
        </div>
      </div>

      {/* RESULTS HEADER */}
      {hasQueried && (
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            {loading ? "Searching..." : (
              <>
                <span style={{ color: "var(--amber)", fontFamily: "var(--font-mono)", fontSize: "1.1em" }}>
                  {totalCount?.toLocaleString()}
                </span>{" "}leads found
                {totalCount && totalCount > 100 && (
                  <span style={{ color: "var(--text-muted)" }}> · page {page} of {totalPages}</span>
                )}
              </>
            )}
          </span>

          {totalCount! > 0 && !loading && (
            <button onClick={openConflictModal} disabled={fetching}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
              style={{ background: "var(--amber)", color: "#080c14", boxShadow: "0 0 16px var(--amber-glow)" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              {fetching ? "Preparing..." : `Download ${totalCount?.toLocaleString()} leads`}
            </button>
          )}
        </div>
      )}

      {/* EMPTY STATES */}
      {!hasQueried && (
        <div className="rounded-2xl flex flex-col items-center justify-center py-24"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
          <div className="text-3xl mb-3">⚖️</div>
          <p className="font-medium mb-1" style={{ color: "var(--text-primary)" }}>Select filters and search</p>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Use the filters above to find leads</p>
        </div>
      )}
      {hasQueried && !loading && leads.length === 0 && (
        <div className="rounded-2xl flex flex-col items-center justify-center py-24"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
          <p className="font-medium mb-1" style={{ color: "var(--text-primary)" }}>No leads found</p>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Try adjusting your filters</p>
        </div>
      )}

      {/* TABLE */}
      {hasQueried && leads.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["Name", "Email", "Phone", "Company", "Address", "City / State", "Practice Areas", "Admitted", "Status"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium whitespace-nowrap"
                      style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)", background: "var(--bg-raised)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leads.map((lead, i) => (
                  <tr key={lead.id}
                    style={{ borderBottom: "1px solid var(--border)", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)")}>
                    <td className="px-4 py-3 whitespace-nowrap font-medium" style={{ color: "var(--text-primary)" }}>
                      {[lead.first_name, lead.last_name].filter(Boolean).join(" ") || "—"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {lead.email ? <a href={`mailto:${lead.email}`} style={{ color: "var(--amber)", textDecoration: "none" }}
                        onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
                        onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}>{lead.email}</a>
                        : <span style={{ color: "var(--text-muted)" }}>—</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap"
                      style={{ color: "var(--text-secondary)", fontFamily: "var(--font-mono)", fontSize: "0.8em" }}>
                      {lead.phone ?? "—"}
                    </td>
                    <td className="px-4 py-3 max-w-[160px]" style={{ color: "var(--text-secondary)" }}>
                      <div className="truncate">{lead.company ?? "—"}</div>
                    </td>
                    <td className="px-4 py-3 max-w-[200px]" style={{ color: "var(--text-secondary)" }}>
                      <div className="truncate">{lead.address ?? "—"}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap" style={{ color: "var(--text-secondary)" }}>
                      {[lead.city, lead.state].filter(Boolean).join(", ") || "—"}
                    </td>
                    <td className="px-4 py-3 max-w-[200px]">
                      <div className="flex flex-wrap gap-1">
                        {(lead.practice_areas ?? []).slice(0, 2).map((area) => (
                          <span key={area} className="px-2 py-0.5 rounded text-xs"
                            style={{ background: "var(--bg-hover)", border: "1px solid var(--border)", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                            {area}
                          </span>
                        ))}
                        {(lead.practice_areas ?? []).length > 2 && (
                          <span className="px-2 py-0.5 rounded text-xs"
                            style={{ background: "var(--amber-glow)", border: "1px solid var(--amber-dim)", color: "var(--amber)" }}>
                            +{(lead.practice_areas ?? []).length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap"
                      style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "0.8em" }}>
                      {lead.admission_date ? new Date(lead.admission_date).getFullYear() : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          background: lead.member_status === "Active" ? "rgba(34,197,94,0.1)" : "rgba(255,255,255,0.05)",
                          color: lead.member_status === "Active" ? "#4ade80" : "var(--text-muted)",
                          border: `1px solid ${lead.member_status === "Active" ? "rgba(34,197,94,0.3)" : "var(--border)"}`,
                        }}>
                        {lead.member_status ?? "—"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: "1px solid var(--border)" }}>
              <span className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                Page {page} of {totalPages} · {totalCount?.toLocaleString()} total
              </span>
              <div className="flex gap-2">
                <button onClick={() => fetchLeads(page - 1)} disabled={page <= 1 || loading}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-30"
                  style={{ background: "var(--bg-raised)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                  ← Prev
                </button>
                <button onClick={() => fetchLeads(page + 1)} disabled={page >= totalPages || loading}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-30"
                  style={{ background: "var(--bg-raised)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}