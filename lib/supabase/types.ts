/**
 * Database types.
 *
 * Hand-written to match supabase/migrations/*.sql (0001–0007). They can be
 * regenerated with the Supabase CLI once a project exists:
 *
 *   npx supabase gen types typescript --project-id <id> > lib/supabase/types.ts
 *
 * Until then these are the contract, and `npm run db:test` proves the SQL
 * matches them.
 */

export type DietaryTag = "Vegan" | "Gluten-free";

export type MenuVariantRow = Readonly<{ label: string; price: number | null }>;

export type OpeningHourRow = Readonly<{
  day: string;
  opens: string;
  closes: string;
}>;

export type SiteSettingsRow = {
  id: number;
  site_title: string;
  meta_description: string;
  canonical_url: string | null;
  hero_video_enabled: boolean;
  maintenance_mode: boolean;
  whatsapp_floating_enabled: boolean;
  whatsapp_default_message: string | null;
  updated_at: string;
};

export type BusinessInfoRow = {
  id: number;
  name: string;
  legal_name: string | null;
  tagline: string | null;
  street: string | null;
  city: string | null;
  country: string | null;
  plus_code: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  directions_url: string | null;
  website: string | null;
  opening_hours: OpeningHourRow[];
  updated_at: string;
};

export type HeroMediaRow = {
  id: string;
  title: string | null;
  subtitle: string | null;
  video_url: string | null;
  poster_url: string | null;
  video_path: string | null;
  poster_path: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type MenuCategoryRow = {
  id: string;
  slug: string;
  name: string;
  intro: string | null;
  sort_order: number;
  published: boolean;
};

export type MenuSectionRow = {
  id: string;
  category_id: string;
  title: string | null;
  note: string | null;
  sort_order: number;
};

export type MenuItemRow = {
  id: string;
  section_id: string;
  name: string;
  description: string | null;
  price: number | null;
  image_url: string | null;
  image_path: string | null;
  dietary: DietaryTag[];
  variants: MenuVariantRow[];
  availability_note: string | null;
  available: boolean;
  sort_order: number;
};

export type ExperienceCategory = "Lake" | "Nature" | "Adventure" | "Local";

export type ExperienceRow = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  image_path: string | null;
  price: number | null;
  duration: string | null;
  category: ExperienceCategory | null;
  active: boolean;
  sort_order: number;
};

export type GalleryCategory =
  | "Stay"
  | "Camping"
  | "Restaurant & Bar"
  | "Experiences"
  | "Lake Kivu"
  | "Nature";

export type GalleryItemRow = {
  id: string;
  image_url: string;
  image_path: string | null;
  caption: string | null;
  alt_text: string;
  /** Curation flag: published + featured rows feed the homepage showcase. */
  featured: boolean;
  /** Optional bucket: Stay | Camping | Restaurant & Bar | Experiences | Lake Kivu | Nature. */
  category: GalleryCategory | null;
  published: boolean;
  sort_order: number;
};

export type SocialLinkRow = {
  id: string;
  platform: string;
  label: string;
  url: string;
  active: boolean;
  sort_order: number;
};

export type AccommodationKind = "room" | "camping";

export type AccommodationRow = {
  id: string;
  kind: AccommodationKind;
  name: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  /** Ordered public image URLs; the first is the lead image. */
  images: string[];
  capacity: number | null;
  beds: string | null;
  amenities: string[];
  /** Camping-only tent information; null for rooms. */
  tent_info: string | null;
  /** Integer RWF; null means "ask when booking". */
  price: number | null;
  available: boolean;
  featured: boolean;
  published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type SiteContentRow = {
  id: number;
  hero_title: string | null;
  hero_subtitle: string | null;
  intro_heading: string | null;
  intro_body: string | null;
  about_story: string | null;
  about_place: string | null;
  about_philosophy: string | null;
  about_nature: string | null;
  about_experience: string | null;
  footer_text: string | null;
  /** Google Maps embed URL; null until the location is officially confirmed. */
  map_embed_url: string | null;
  updated_at: string;
};

export type ContactMessageRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string;
  is_read: boolean;
  created_at: string;
};

export type ReservationStatus =
  | "pending"
  | "confirmed"
  | "declined"
  | "cancelled"
  | "completed";

export type ReservationRequestRow = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  party_size: number;
  preferred_at: string;
  notes: string | null;
  status: ReservationStatus;
  admin_notes: string | null;
  reference_code: string;
  check_in: string | null;
  check_out: string | null;
  adults: number;
  children: number;
  accommodation_pref: string | null;
  camping_pref: string | null;
  experience_interest: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminUserRow = {
  id: string;
  email: string;
  full_name: string | null;
  role: "owner" | "editor";
  created_at: string;
};

/** Shape consumed by `createClient<Database>()`. */
export type Database = {
  public: {
    Tables: {
      admin_users: {
        Row: AdminUserRow;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      site_settings: {
        Row: SiteSettingsRow;
        Insert: Partial<SiteSettingsRow>;
        Update: Partial<SiteSettingsRow>;
        Relationships: [];
      };
      business_info: {
        Row: BusinessInfoRow;
        Insert: Partial<BusinessInfoRow>;
        Update: Partial<BusinessInfoRow>;
        Relationships: [];
      };
      site_content: {
        Row: SiteContentRow;
        Insert: Partial<SiteContentRow>;
        Update: Partial<SiteContentRow>;
        Relationships: [];
      };
      hero_media: {
        Row: HeroMediaRow;
        Insert: Partial<HeroMediaRow>;
        Update: Partial<HeroMediaRow>;
        Relationships: [];
      };
      menu_categories: {
        Row: MenuCategoryRow;
        Insert: Partial<MenuCategoryRow>;
        Update: Partial<MenuCategoryRow>;
        Relationships: [];
      };
      menu_sections: {
        Row: MenuSectionRow;
        Insert: Partial<MenuSectionRow>;
        Update: Partial<MenuSectionRow>;
        Relationships: [];
      };
      menu_items: {
        Row: MenuItemRow;
        Insert: Partial<MenuItemRow>;
        Update: Partial<MenuItemRow>;
        Relationships: [];
      };
      experiences: {
        Row: ExperienceRow;
        Insert: Partial<ExperienceRow>;
        Update: Partial<ExperienceRow>;
        Relationships: [];
      };
      gallery_items: {
        Row: GalleryItemRow;
        Insert: Partial<GalleryItemRow>;
        Update: Partial<GalleryItemRow>;
        Relationships: [];
      };
      accommodations: {
        Row: AccommodationRow;
        Insert: Partial<AccommodationRow>;
        Update: Partial<AccommodationRow>;
        Relationships: [];
      };
      social_links: {
        Row: SocialLinkRow;
        Insert: Partial<SocialLinkRow>;
        Update: Partial<SocialLinkRow>;
        Relationships: [];
      };
      reservation_requests: {
        Row: ReservationRequestRow;
        Insert: Pick<
          ReservationRequestRow,
          "name" | "phone" | "check_in" | "check_out"
        > &
          Partial<
            Pick<
              ReservationRequestRow,
              | "email"
              | "notes"
              | "party_size"
              | "preferred_at"
              | "adults"
              | "children"
              | "accommodation_pref"
              | "camping_pref"
              | "experience_interest"
              | "reference_code"
            >
          >;
        Update: Partial<ReservationRequestRow>;
        Relationships: [];
      };
      contact_messages: {
        Row: ContactMessageRow;
        Insert: Pick<ContactMessageRow, "name" | "email" | "message"> &
          Partial<Pick<ContactMessageRow, "phone" | "subject">>;
        Update: Partial<ContactMessageRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
