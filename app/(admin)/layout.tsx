import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { RoleProvider } from "@/lib/role-context";
import { PlanProvider } from "@/lib/plan-context";
import { verifySession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await verifySession();
  if (!session) redirect("/login");

  return (
    <RoleProvider role={session.role}>
    <PlanProvider plan={session.plan ?? "starter"} featureOverrides={session.featureOverrides ?? {}}>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header
            userName={session.name}
            userEmail={session.email}
            userRole={session.role}
            isImpersonating={session.isImpersonating}
          />
          <main className="flex-1 flex flex-col overflow-auto bg-muted/30 p-4 pb-20 lg:p-6 lg:pb-6">{children}</main>
        </div>
        <MobileBottomNav />
      </div>
    </PlanProvider>
    </RoleProvider>
  );
}
