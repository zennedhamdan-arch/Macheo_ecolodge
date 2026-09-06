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
  directionsUrl: string | null;
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
  directionsUrl: null, // embedded map and directions appear once confirmed
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
