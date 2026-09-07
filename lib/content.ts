import "server-only";

import { cache } from "react";

import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import type {
  AccommodationKind,
  AccommodationRow,
  ExperienceRow,
  GalleryItemRow,
  HeroMediaRow,
  MenuCategoryRow,
  MenuItemRow,
  MenuSectionRow,
  SiteContentRow,
  SocialLinkRow,
} from "@/lib/supabase/types";
import {
  menu as staticMenu,
  type DietaryTag,
  type MenuCategoryData,
  type MenuItem,
  type MenuSection,
} from "@/data/menu";
import { lodge as staticLodge, type LodgeData } from "@/data/macheo";

/**
 * The public site's content layer.
 *
 * Every loader follows the same rule:
 *
 *   Supabase configured and returns rows  →  use the database
 *   Supabase absent, erroring, or empty   →  use the committed data in data/
 *
 * The fallback is not defensive padding, it is the product decision: a missing
 * environment variable, a paused Supabase project or a network blip must not
 * take the site off the internet. The worst outcome should be that a recent
 * edit isn't shown yet, never a blank page.
 *
 * `cache()` deduplicates within a single render pass, so a loader used by
 * both the page and the structured data runs one query, not two.
 */

/** RWF has no minor unit, so an integer is the whole price. */
export function formatPrice(amount: number | null): string | null {
  if (amount === null) return null;
  return `${amount.toLocaleString("en-US")} RWF`;
}

/** Slug-safe id, so DB-backed items keep working as anchors and React keys. */
export function slugify(value: string, fallback: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug.length > 0 ? slug : fallback;
}

/* -------------------------------------------------------------------------- */
/* Menu                                                                       */
/* -------------------------------------------------------------------------- */

type MenuQueryResult = {
  categories: MenuCategoryRow[];
  sections: MenuSectionRow[];
  items: MenuItemRow[];
};

function buildMenu({ categories, sections, items }: MenuQueryResult): MenuCategoryData[] {
  const sectionsByCategory = new Map<string, MenuSectionRow[]>();
  for (const section of sections) {
    const list = sectionsByCategory.get(section.category_id) ?? [];
    list.push(section);
    sectionsByCategory.set(section.category_id, list);
  }

  const itemsBySection = new Map<string, MenuItemRow[]>();
  for (const item of items) {
    const list = itemsBySection.get(item.section_id) ?? [];
    list.push(item);
    itemsBySection.set(item.section_id, list);
  }

  return categories
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((category): MenuCategoryData => {
      const categorySections = (sectionsByCategory.get(category.id) ?? [])
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((section, sectionIndex): MenuSection => {
          const sectionItems = (itemsBySection.get(section.id) ?? [])
            .slice()
            .sort((a, b) => a.sort_order - b.sort_order)
            // `available` is the "86 it for tonight" switch. RLS still returns
            // the row so the admin can see it; the public view hides it.
            .filter((item) => item.available)
            .map(
              (item): MenuItem => ({
                id: slugify(item.name, item.id),
                name: item.name,
                ...(item.description ? { description: item.description } : {}),
                price: formatPrice(item.price),
                ...(item.variants.length > 0
                  ? {
                      variants: item.variants.map((variant) => ({
                        label: variant.label,
                        price: formatPrice(variant.price) ?? "",
                      })),
                    }
                  : {}),
                ...(item.image_url ? { image: item.image_url } : {}),
                ...(item.dietary.length > 0
                  ? { dietary: item.dietary as readonly DietaryTag[] }
                  : {}),
                ...(item.availability_note
                  ? { availability: item.availability_note }
                  : {}),
              }),
            );

          return {
            id: slugify(section.title ?? `${category.slug}-${sectionIndex}`, section.id),
            ...(section.title ? { title: section.title } : {}),
            ...(section.note ? { note: section.note } : {}),
            items: sectionItems,
          };
        })
        // An empty section would render a heading with nothing under it.
        .filter((section) => section.items.length > 0);

      return {
        id: category.slug,
        category: category.name,
        ...(category.intro ? { intro: category.intro } : {}),
        sections: categorySections,
      };
    })
    .filter((category) => category.sections.length > 0);
}

export const getMenu = cache(async (): Promise<readonly MenuCategoryData[]> => {
  if (!isSupabaseConfigured) return staticMenu;

  try {
    const supabase = createSupabasePublicClient();
    if (!supabase) throw new Error("not configured");
    /* `sort_order` ascending is the owner's manual order; `created_at`
       DESCENDING is the tie-break for rows that share one (the seed leaves
       them all at 0), so the newest item wins — the same rule the dashboard
       lists use, which keeps the public page and the admin list in the same
       order and puts anything just created at the top. */
    const [categories, sections, items] = await Promise.all([
      supabase
        .from("menu_categories")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false }),
      supabase
        .from("menu_sections")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false }),
      supabase
        .from("menu_items")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false }),
    ]);

    if (categories.error || sections.error || items.error) throw new Error("menu query failed");
    if (!categories.data || categories.data.length === 0) return staticMenu;

    const built = buildMenu({
      categories: categories.data,
      sections: sections.data ?? [],
      items: items.data ?? [],
    });

    return built.length > 0 ? built : staticMenu;
  } catch {
    return staticMenu;
  }
});

/* -------------------------------------------------------------------------- */
/* Business info                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Database values override the committed ones field by field.
 *
 * A partial row must not blank out a value that is already set, so every
 * field falls back individually rather than the record being replaced
 * wholesale.
 */
export const getLodge = cache(async (): Promise<LodgeData> => {
  if (!isSupabaseConfigured) return staticLodge;

  try {
    const supabase = createSupabasePublicClient();
    if (!supabase) throw new Error("not configured");
    const { data, error } = await supabase
      .from("business_info")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (error || !data) return staticLodge;

    return {
      ...staticLodge,
      name: data.name || staticLodge.name,
      legalName: data.legal_name || staticLodge.legalName,
      tagline: data.tagline || staticLodge.tagline,
      streetAddress: data.street || staticLodge.streetAddress,
      city: data.city || staticLodge.city,
      country: data.country || staticLodge.country,
      plusCode: data.plus_code || staticLodge.plusCode,
      email: data.email || staticLodge.email,
      website: data.website || staticLodge.website,
      directionsUrl: data.directions_url || staticLodge.directionsUrl,
      phone: data.phone
        ? { display: formatPhone(data.phone), e164: data.phone }
        : staticLodge.phone,
      whatsapp: data.whatsapp
        ? {
            display: formatPhone(data.whatsapp),
            e164: data.whatsapp,
            href: `https://wa.me/${data.whatsapp.replace(/[^\d]/g, "")}`,
          }
        : staticLodge.whatsapp,
    };
  } catch {
    return staticLodge;
  }
});

/** "+250794317286" -> "+250 794 317 286". */
function formatPhone(e164: string): string {
  const digits = e164.replace(/[^\d]/g, "");
  if (digits.length === 12 && digits.startsWith("250")) {
    return `+${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`;
  }
  return e164;
}

/* -------------------------------------------------------------------------- */
/* Hero media                                                                 */
/* -------------------------------------------------------------------------- */

export type HeroMediaContent = Readonly<{
  kind: "video" | "image";
  /** Present when kind === "video". */
  videoUrl: string | null;
  /** Poster for the video, or the image itself when kind === "image". */
  imageUrl: string | null;
  title: string | null;
  subtitle: string | null;
}>;

/**
 * The active hero media, or null to fall back to the built-in photograph.
 *
 * An active row with a video plays a video; an active row with only a
 * poster/image shows that image. Returns null unless there is genuinely
 * something to show — a hero that renders an empty element is worse than
 * the bundled default.
 */
export const getHeroMedia = cache(async (): Promise<HeroMediaContent | null> => {
  if (!isSupabaseConfigured) return null;

  try {
    const supabase = createSupabasePublicClient();
    if (!supabase) throw new Error("not configured");

    const [settings, hero] = await Promise.all([
      supabase.from("site_settings").select("hero_video_enabled").eq("id", 1).maybeSingle(),
      supabase
        .from("hero_media")
        .select("*")
        .eq("is_active", true)
        .maybeSingle<HeroMediaRow>(),
    ]);

    if (hero.error || !hero.data) return null;
    const hasVideo = Boolean(hero.data.video_url);
    if (hasVideo && settings.data && settings.data.hero_video_enabled === false) {
      // Video switched off globally — keep the poster as a still if there is one.
      if (!hero.data.poster_url) return null;
      return {
        kind: "image",
        videoUrl: null,
        imageUrl: hero.data.poster_url,
        title: hero.data.title,
        subtitle: hero.data.subtitle,
      };
    }
    if (hasVideo) {
      return {
        kind: "video",
        videoUrl: hero.data.video_url,
        imageUrl: hero.data.poster_url,
        title: hero.data.title,
        subtitle: hero.data.subtitle,
      };
    }
    if (hero.data.poster_url) {
      return {
        kind: "image",
        videoUrl: null,
        imageUrl: hero.data.poster_url,
        title: hero.data.title,
        subtitle: hero.data.subtitle,
      };
    }
    return null;
  } catch {
    return null;
  }
});

/* -------------------------------------------------------------------------- */
/* Site content — editable copy                                               */
/* -------------------------------------------------------------------------- */

export const getSiteContent = cache(async (): Promise<Partial<SiteContentRow>> => {
  if (!isSupabaseConfigured) return {};
  try {
    const supabase = createSupabasePublicClient();
    if (!supabase) throw new Error("not configured");
    const { data, error } = await supabase
      .from("site_content")
      .select("*")
      .eq("id", 1)
      .maybeSingle<SiteContentRow>();
    if (error || !data) return {};
    return data;
  } catch {
    return {};
  }
});

/**
 * The Google Maps embed shown in the location section (homepage and About).
 *
 * Admin → Site content → "Google Maps embed URL" wins when it is set; an
 * empty field falls back to the owner-confirmed embed in `data/macheo.ts`
 * rather than taking the map away — the same "empty means keep the default"
 * rule the rest of the dashboard follows. `null` (no default and nothing
 * saved) leaves the drawn placeholder in place, never a guessed pin.
 */
export const getMapEmbedUrl = cache(async (): Promise<string | null> => {
  const content = await getSiteContent();
  const saved = content.map_embed_url;
  if (typeof saved === "string" && saved.trim().length > 0) return saved.trim();
  return staticLodge.mapEmbedUrl;
});

/* -------------------------------------------------------------------------- */
/* Accommodations (rooms + camping)                                           */
/* -------------------------------------------------------------------------- */

export const getAccommodations = cache(
  async (kind?: AccommodationKind): Promise<AccommodationRow[]> => {
    if (!isSupabaseConfigured) return [];
    try {
      const supabase = createSupabasePublicClient();
      if (!supabase) throw new Error("not configured");
      let query = supabase
        .from("accommodations")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (kind) query = query.eq("kind", kind);
      const { data, error } = await query;
      if (error || !data) return [];
      // RLS already restricts to published rows for the anon client.
      return data as AccommodationRow[];
    } catch {
      return [];
    }
  },
);

export const getAccommodationBySlug = cache(
  async (slug: string): Promise<AccommodationRow | null> => {
    if (!isSupabaseConfigured) return null;
    try {
      const supabase = createSupabasePublicClient();
      if (!supabase) throw new Error("not configured");
      const { data, error } = await supabase
        .from("accommodations")
        .select("*")
        .eq("slug", slug)
        .maybeSingle<AccommodationRow>();
      if (error || !data) return null;
      return data;
    } catch {
      return null;
    }
  },
);

/* -------------------------------------------------------------------------- */
/* Collections                                                                */
/* -------------------------------------------------------------------------- */

async function selectAll<T>(
  table: "experiences" | "gallery_items" | "social_links",
): Promise<T[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const supabase = createSupabasePublicClient();
    if (!supabase) throw new Error("not configured");
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error || !data) return [];
    return data as T[];
  } catch {
    return [];
  }
}

export const getExperiences = cache(() => selectAll<ExperienceRow>("experiences"));
export const getGalleryItems = cache(() => selectAll<GalleryItemRow>("gallery_items"));

/**
 * The homepage showcase: published AND featured, in display order, capped.
 *
 * RLS already limits the public client to published rows — the extra filters
 * document the contract and keep the homepage from pulling the whole
 * collection's metadata, let alone images.
 */
export const getFeaturedGallery = cache(async (limit: number): Promise<GalleryItemRow[]> => {
  if (!isSupabaseConfigured) return [];
  try {
    const supabase = createSupabasePublicClient();
    if (!supabase) return [];
    const { data } = await supabase
      .from("gallery_items")
      .select("*")
      .eq("published", true)
      .eq("featured", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(limit);
    return (data ?? []) as GalleryItemRow[];
  } catch {
    return [];
  }
});

/* -------------------------------------------------------------------------- */
/* Floating WhatsApp button                                                   */
/* -------------------------------------------------------------------------- */

/**
 * The floating WhatsApp button's configuration. The number comes from
 * business_info (Admin → Contact information); the on/off switch and the
 * pre-filled message come from site_settings (Admin → Settings).
 *
 * `null` means "do not render it at all" — switched off, or no number set.
 */
export type WhatsAppFloating = Readonly<{
  /** Full wa.me deep link, message included when one is set. */
  href: string;
  message: string;
}>;

const WHATSAPP_DEFAULT_MESSAGE = "Hello Macheo, I'd like to make an enquiry.";

export const getWhatsAppFloating = cache(async (): Promise<WhatsAppFloating | null> => {
  const business = await getLodge();
  if (!business.whatsapp) return null;

  const digits = business.whatsapp.e164.replace(/[^\d]/g, "");
  if (digits.length === 0) return null;

  let enabled = true;
  let message = WHATSAPP_DEFAULT_MESSAGE;

  if (isSupabaseConfigured) {
    try {
      const supabase = createSupabasePublicClient();
      if (supabase) {
        const { data } = await supabase
          .from("site_settings")
          .select("whatsapp_floating_enabled, whatsapp_default_message")
          .eq("id", 1)
          .maybeSingle();

        if (data) {
          enabled = data.whatsapp_floating_enabled;
          if (
            typeof data.whatsapp_default_message === "string" &&
            data.whatsapp_default_message.trim().length > 0
          ) {
            message = data.whatsapp_default_message;
          }
        }
      }
    } catch {
      /* The button is an enhancement; the defaults stand. */
    }
  }

  if (!enabled) return null;

  return {
    href: `https://wa.me/${digits}?text=${encodeURIComponent(message)}`,
    message,
  };
});

/** Social links from the dashboard; none committed until the business adds them. */
export const getSocialLinks = cache(async () => {
  const rows = await selectAll<SocialLinkRow>("social_links");
  return rows.map((row) => ({
    platform: row.platform,
    label: row.label,
    href: row.url,
  }));
});
