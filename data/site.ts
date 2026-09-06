import { detectedLogo } from "./logo.generated";

/**
 * Site-level copy and navigation for Macheo Ecolodge & Camping.
 * Centralised so no component hard-codes strings or targets.
 */

/** In-page anchors used on the homepage (navbar links are full routes). */
export const SECTION_IDS = {
  hero: "top",
  discover: "discover",
  location: "location",
} as const;

export type SectionId = (typeof SECTION_IDS)[keyof typeof SECTION_IDS];

/**
 * Brand mark.
 *
 * TO USE A DIFFERENT LOGO — just drop the file in, nothing else:
 *
 *     cp your-logo.png public/images/logo.png
 *     npm run build          # or npm run dev
 *
 * `scripts/detect-logo.mjs` runs automatically, finds it, reads its real
 * dimensions and writes `data/logo.generated.ts`. Until a file exists, every
 * lock-up falls back to the typographic wordmark below.
 */
export const brand = {
  /** Auto-detected from public/images/. `null` until a logo file is added. */
  logo: detectedLogo,
  /** Wordmark fallback, split so it can be set on two lines. */
  wordmark: { top: "Macheo", bottom: "Ecolodge & Camping" },
} as const;

export type NavLink = Readonly<{ label: string; href: string }>;

/** The public navigation — one entry per page, no duplicates, no dead ends. */
export const navLinks: readonly NavLink[] = [
  { label: "Home", href: "/" },
  { label: "Stay", href: "/stay" },
  { label: "Camping", href: "/camping" },
  { label: "Experiences", href: "/experiences" },
  { label: "Restaurant & Bar", href: "/restaurant" },
  { label: "Gallery", href: "/gallery" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

/** Footer quick links — the same structure without Home. */
export const footerLinks: readonly NavLink[] = navLinks.filter(
  (link) => link.href !== "/",
);

/** Primary CTA — always points at the reservation page. */
export const primaryCta = {
  label: "Plan Your Stay",
  href: "/reservation",
} as const;

/** Secondary CTA — the homepage discover section. */
export const secondaryCta = {
  label: "Explore Macheo",
  href: "/#discover",
} as const;

export const hero = {
  /** Headline fallback — the admin hero media overrides it when set. */
  headline: ["Macheo Ecolodge", "& Camping"],
  supporting: "Stay closer to nature. Experience Lake Kivu.",
  alternate: "Where nature, comfort and adventure meet.",
  scrollIndicator: "Scroll to explore",
} as const;

/** The five "Discover Macheo" cards on the homepage. */
export const discoverCards = [
  {
    id: "stay",
    title: "Stay",
    body: "Comfortable accommodation surrounded by nature.",
    href: "/stay",
    image: "/images/macheo/room-lake.jpg",
    imageAlt:
      "A comfortable ecolodge room with warm wood, soft light and a view over the garden towards Lake Kivu",
  },
  {
    id: "camp",
    title: "Camp",
    body: "Experience the outdoors and sleep closer to nature.",
    href: "/camping",
    image: "/images/macheo/camping-tents.jpg",
    imageAlt:
      "Camping tents pitched on green ground near the lake at golden hour",
  },
  {
    id: "eat-drink",
    title: "Eat & Drink",
    body: "Enjoy the restaurant and bar.",
    href: "/restaurant",
    image: "/images/macheo/restaurant-terrace.jpg",
    imageAlt:
      "A restaurant terrace with set tables overlooking the lake at dusk",
  },
  {
    id: "explore",
    title: "Explore",
    body: "Discover Lake Kivu and surrounding experiences.",
    href: "/experiences",
    image: "/images/macheo/boat-lake.jpg",
    imageAlt: "A wooden boat crossing the calm water of Lake Kivu",
  },
  {
    id: "experience",
    title: "Experience",
    body: "Create memorable moments through nature and activities.",
    href: "/experiences",
    image: "/images/macheo/cycling-trail.jpg",
    imageAlt: "Cyclists on a green trail with lake and hill views",
  },
] as const;

/** Copy for the homepage introduction. Body can be overridden by admins. */
export const introduction = {
  eyebrow: "Welcome to Macheo",
  headline: "Where nature, comfort and adventure meet.",
} as const;

/** Copy for the homepage dining preview. */
export const diningPreview = {
  eyebrow: "Restaurant & Bar",
  headline: "Eat well, drink slowly.",
  body: "Fresh plates and cool drinks served with lake views — from morning coffee to sundowners on the terrace.",
  cta: "Explore Dining",
  images: [
    {
      src: "/images/macheo/restaurant-terrace.jpg",
      alt: "The restaurant terrace set for dinner with the lake in the background",
    },
    {
      src: "/images/macheo/bar-drinks.jpg",
      alt: "Drinks served at the bar",
    },
    {
      src: "/images/macheo/food-plate.jpg",
      alt: "A freshly prepared plate from the Macheo kitchen",
    },
  ],
} as const;

/** Copy for the final call-to-action band. */
export const finalCta = {
  eyebrow: "Ready when you are",
  headline: "Plan your escape.",
  body: "Rooms, camping, dining and lake experiences — one place, close to nature. Tell us when, and we will take care of the rest.",
} as const;

export const gallery = {
  eyebrow: "Gallery",
  headline: "A look around Macheo.",
  lede: "The lake, the rooms, the camp and the table — a small selection from the gallery.",
  cta: "View Full Gallery",
  empty:
    "Photos are coming soon. In the meantime, the lake and the garden are very much real — come see them in person.",
} as const;

export const galleryPage = {
  eyebrow: "Gallery",
  headline: "The whole picture.",
  lede: "Rooms and tents, plates and boats, lake light and green hills — the full collection.",
  empty:
    "Photos are coming soon. In the meantime, the lake and the garden are very much real — come see them in person.",
} as const;

export const locationSection = {
  eyebrow: "Find us",
  headline: "On the shores of Lake Kivu.",
  body: "Macheo sits in Karongi district — Kibuye to those who know it — along Rwanda's western edge, close to the Congo-Nile Trail.",
} as const;

export const seo = {
  title: "Macheo Ecolodge & Camping | Stay, Camp & Explore Lake Kivu",
  description:
    "Macheo Ecolodge & Camping in Karongi (Kibuye), Rwanda — rooms, camping, a restaurant and bar, and lake experiences on the shores of Lake Kivu, near the Congo-Nile Trail.",
  keywords: [
    "Macheo Ecolodge",
    "Macheo Camping",
    "Lake Kivu accommodation",
    "Karongi lodge",
    "Kibuye camping",
    "Congo Nile Trail",
    "Rwanda ecolodge",
  ],
} as const;

export const legal = {
  privacyHref: "/privacy",
  termsHref: "/terms",
} as const;
