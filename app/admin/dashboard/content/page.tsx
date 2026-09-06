import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { HeroMediaRow, SiteContentRow, SiteSettingsRow } from "@/lib/supabase/types";
import HeroManager from "./HeroManager";
import SiteCopyManager from "./SiteCopyManager";

/**
 * Site content — everything that shapes the public words and the hero:
 * hero media (image or video), homepage copy, About-page copy, the footer
 * line and the map embed. Basic business content never requires a code
 * change again.
 */
export default async function AdminContentPage(): Promise<React.JSX.Element> {
  const supabase = await createSupabaseServerClient();

  const [media, settings, content] = await Promise.all([
    supabase
      .from("hero_media")
      .select("*")
      .order("created_at", { ascending: false })
      .returns<HeroMediaRow[]>(),
    supabase
      .from("site_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle<SiteSettingsRow>(),
    supabase
      .from("site_content")
      .select("*")
      .eq("id", 1)
      .maybeSingle<SiteContentRow>(),
  ]);

  return (
    <>
      <h1 className="admin-title">Site content</h1>
      <p className="admin-muted admin-lede">
        The hero media at the top of the homepage, and the editable wording on
        the Home, About and Camping pages. Uploading a new hero does not
        publish it — you choose which one is live, and you can switch back at
        any time. With nothing active, the built-in Lake Kivu photograph is
        shown.
      </p>

      <HeroManager
        initialMedia={media.data ?? []}
        heroVideoEnabled={settings.data?.hero_video_enabled ?? true}
      />

      <div style={{ marginTop: "2rem" }}>
        <SiteCopyManager initial={content.data ?? null} />
      </div>
    </>
  );
}
