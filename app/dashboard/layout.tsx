import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DashboardNav from "@/components/DashboardNav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Get profile for role
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, email")
    .eq("id", user.id)
    .single();

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg-base)" }}>
      <DashboardNav
        userEmail={profile?.email ?? user.email ?? ""}
        userRole={profile?.role ?? "recruiter"}
        userName={profile?.full_name ?? ""}
      />
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
}
