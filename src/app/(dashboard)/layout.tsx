import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardNav } from "@/components/dashboard-nav";
import type { Trainer } from "@/types/database";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: trainer } = await supabase
    .from("trainers")
    .select("*")
    .eq("supabase_auth_id", user.id)
    .single<Trainer>();

  if (!trainer) {
    redirect("/onboarding");
  }

  return (
    <div className="flex min-h-full flex-col">
      <main className="flex-1 pb-20 md:pb-6">{children}</main>
      <DashboardNav trainer={trainer} />
    </div>
  );
}
