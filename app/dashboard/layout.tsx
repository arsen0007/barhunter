import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DashboardNav from "@/components/DashboardNav";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, email")
    .eq("id", user.id)
    .single();

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg-page)" }}>
      <DashboardNav
        userEmail={profile?.email ?? user.email ?? ""}
        userRole={profile?.role ?? "recruiter"}
        userName={profile?.full_name ?? ""}
      />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[1300px] mx-auto px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
