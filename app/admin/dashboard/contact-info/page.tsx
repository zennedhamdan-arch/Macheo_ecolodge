import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  BusinessInfoRow,
  ContactMessageRow,
  SiteSettingsRow,
  SocialLinkRow,
} from "@/lib/supabase/types";
import BusinessSettingsManager from "./BusinessSettingsManager";
import ContactInbox from "./ContactInbox";

/**
 * Contact information.
 *
 * Two halves: the contact details the whole public site reads (phone,
 * WhatsApp, email, address, directions, opening hours, social links), and
 * the inbox of messages sent through the public contact form.
 */
export default async function AdminContactInfoPage(): Promise<React.JSX.Element> {
  const supabase = await createSupabaseServerClient();

  const [info, socials, settings, messages] = await Promise.all([
    supabase.from("business_info").select("*").eq("id", 1).maybeSingle().returns<BusinessInfoRow>(),
    supabase
      .from("social_links")
      .select("*")
      // Newest first, like every other admin list (see lib/adminSort).
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })
      .returns<SocialLinkRow[]>(),
    supabase.from("site_settings").select("*").eq("id", 1).maybeSingle().returns<SiteSettingsRow>(),
    supabase
      .from("contact_messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100)
      .returns<ContactMessageRow[]>(),
  ]);

  return (
    <>
      <h1 className="admin-title">Contact information</h1>
      <p className="admin-muted admin-lede">
        These values feed the public site — the contact page, the footer, the
        location panel and every Call / WhatsApp button. Each field overrides
        the defaults built into the site; leave a field empty to keep the
        default. Changes appear on the site within about a minute.
      </p>

      <BusinessSettingsManager
        initialInfo={info.data ?? null}
        initialSocials={socials.data ?? []}
        initialSettings={settings.data ?? null}
      />

      <h2 className="admin-section-title" style={{ marginTop: "2.5rem" }}>
        Messages from the contact form
      </h2>
      <ContactInbox initial={messages.data ?? []} />
    </>
  );
}
