import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { SiteSettingsRow } from "@/lib/supabase/types";
import SettingsManager from "./SettingsManager";

/** Settings — the technical dials for the public site. */
export default async function AdminSettingsPage(): Promise<React.JSX.Element> {
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from("site_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle<SiteSettingsRow>();

  return (
    <>
      <h1 className="admin-title">Settings</h1>
      <p className="admin-muted admin-lede">
        Search-engine metadata and other site-wide switches. The hero video
        switch lives under Site content, and the floating WhatsApp button
        lives under Contact info.
      </p>
      <SettingsManager initial={data ?? null} />
    </>
  );
}
