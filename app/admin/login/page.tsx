import { Suspense } from "react";
import { redirect } from "next/navigation";

import { getAdminUser } from "@/lib/supabase/server";
import LoginForm from "./LoginForm";

/**
 * An already-signed-in allow-listed admin has nothing to do here — straight to
 * the dashboard. A signed-in account that is NOT on the `admin_users`
 * allow-list still gets the sign-in form: being authenticated says nothing
 * about being authorized.
 */
export default async function AdminLoginPage(): Promise<React.JSX.Element> {
  const session = await getAdminUser();
  if (session) redirect("/admin/dashboard");

  return (
    <main className="admin-shell admin-centered">
      <div className="admin-card admin-narrow">
        <p className="admin-eyebrow">Macheo Ecolodge &amp; Camping</p>
        <h1 className="admin-title">Sign in</h1>
        <Suspense fallback={<p className="admin-muted">Loading…</p>}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
