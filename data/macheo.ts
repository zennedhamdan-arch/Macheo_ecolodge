/**
 * MACHEO ECOLODGE & CAMPING — business data.
 *
 * SINGLE SOURCE OF TRUTH.
 * No component may hard-code business information. Import from here.
 *
 * ----------------------------------------------------------------------------
 * PROVENANCE
 * ----------------------------------------------------------------------------
 * Confirmed by the business brief:
 *   - Name: Macheo Ecolodge & Camping
 *   - Location: Karongi / Kibuye, Rwanda, near Lake Kivu
 *   - Offering: restaurant, bar, rooms, camping tents, boat experiences
 *   - Facilities: lake & mountain views, garden, terrace, Wi-Fi, parking,
 *     bicycle activities, water activities, nature experiences,
 *     proximity to the Congo-Nile Trail
 *   - Exact location: the Google Maps place "Macheo Ecolodge-camping"
 *     (Karongi), supplied by the owner as an embed — see MAP_EMBED_URL below.
 *     This is why the map now renders on the site instead of the placeholder.
 *
 * Everything else (phone numbers, email, exact street, opening hours, prices,
 * room inventory) is NOT confirmed and therefore `null` here. The UI degrades
 * gracefully instead of inventing values. Administrators fill these in from
 * the dashboard (Contact information / Site content); the `supabase/seed.sql`
 * file ships clearly-marked DEMO values so a fresh database is browsable.
 */

export type WeekdayHours = Readonly<{
  /** Human label for the day range, e.g. "Monday – Sunday". */
  days: string;
  /** 24h opening time, e.g. "12:00". */
  opens: string;
  /** 24h closing time, e.g. "22:00". */
  closes: string;
  /** schema.org dayOfWeek values covered by this row. */
  schemaDays: readonly string[];
}>;

export type SocialLink = Readonly<{
  label: string;
  href: string;
  /** Shown in `aria-label` / screen-reader context. */
  a11yLabel: string;
}>;

export type LodgeData = Readonly<{
  name: string;
  legalName: string | null;
  tagline: string;
  /** Town/district label. Karongi district; Kibuye is the familiar name. */
  city: string;
  region: string;
  country: string;
  streetAddress: string | null;
  plusCode: string | null;
  phone: Readonly<{ display: string; e164: string }> | null;
  whatsapp: Readonly<{ display: string; e164: string; href: string }> | null;
  email: string | null;
  website: string | null;
  /** Google Maps link for this exact place — "Get Directions" everywhere. */
  directionsUrl: string | null;
  /**
   * Google Maps EMBED src for the location section (homepage + About).
   * Admin → Site content → "Google Maps embed URL" overrides it; leaving that
   * field empty keeps this confirmed pin rather than removing the map.
   */
  mapEmbedUrl: string | null;
  /** Opening hours: null until the business confirms them. */
  hours: readonly WeekdayHours[];
  socials: readonly SocialLink[];
  /** Neutral, editable self-description. Admins override via Site content. */
  about: readonly string[];
  /** Confirmed facilities — used for the amenities strip and SEO. */
  facilities: readonly string[];
  /** What the place offers, at the highest level. */
  offerings: readonly string[];
}>;

export const lodge: LodgeData = {
  name: "Macheo Ecolodge & Camping",
  legalName: null, // not confirmed
  tagline: "Stay closer to nature. Experience Lake Kivu.",
  city: "Karongi (Kibuye)",
  region: "Western Province",
  country: "Rwanda",
  streetAddress: null, // not confirmed
  plusCode: null, // not confirmed
  phone: null, // not confirmed — admins add it under Contact information
  whatsapp: null, // not confirmed — admins add it under Contact information
  email: null, // not confirmed
  website: null,
  // The owner supplied this Google Maps place ("Macheo Ecolodge-camping",
  // Karongi) as an embed, so both the map and the directions link are real.
  // The link uses the documented Maps URLs search action; the pin in the
  // embed below is the authoritative marker.
  directionsUrl:
    "https://www.google.com/maps/search/?api=1&query=Macheo%20Ecolodge-camping%2C%20Karongi%2C%20Rwanda",
  mapEmbedUrl:
    "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3987.2427230012677!2d29.349730800000003!3d-2.0588439000000003!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x19dd296aca70b895%3A0x6ed582940f63f074!2sMacheo%20Ecolodge-camping!5e0!3m2!1sen!2srw!4v1788793413023!5m2!1sen!2srw",
  hours: [], // not confirmed
  socials: [], // managed in the dashboard (Site content → Social links)
  about: [
    // Neutral defaults — intentionally make no historical claims. Every one
    // of these paragraphs is editable from Admin → Site content.
    "Macheo Ecolodge & Camping is a place to slow down on the shores of Lake Kivu — comfortable rooms, camping under open sky, and a restaurant and bar that bring the day to a gentle close.",
    "Set among gardens with lake and mountain views, Macheo is a base for exploring the water, the hills and the Congo-Nile Trail — and for doing very little at all.",
  ],
  facilities: [
    "Lake & mountain views",
    "Garden",
    "Terrace",
    "Wi-Fi",
    "Parking",
    "Bicycle activities",
    "Water activities",
    "Nature experiences",
    "Near the Congo-Nile Trail",
  ],
  offerings: ["Stay", "Camp", "Eat & Drink", "Explore"],
};

/** Convenience: "Karongi (Kibuye), Rwanda". */
export const locationLabel = `${lodge.city}, ${lodge.country}` as const;

/** Convenience: full one-line address used in the footer + structured data. */
export const addressLine = [lodge.streetAddress, lodge.city, lodge.country]
  .filter(Boolean)
  .join(", ");

/** `tel:` href, or null when no confirmed phone exists. */
export const telHref = lodge.phone ? `tel:${lodge.phone.e164}` : null;
