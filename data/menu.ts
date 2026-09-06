/**
 * MACHEO ECOLODGE & CAMPING — demo menu fallback.
 *
 * ============================================================================
 *  STATUS: NEUTRAL DEMO CONTENT
 * ============================================================================
 *  The real menu has NOT been confirmed by the business, so this file ships
 *  an intentionally neutral structure — categories and dish *styles* only,
 *  with NO prices. It exists so the Restaurant & Bar page (and the database
 *  fallback logic) always has something honest to render.
 *
 *  The intended workflow is the admin dashboard (Restaurant & Bar), where
 *  the owners publish the real menu — names, descriptions, prices, photos.
 *  Once menu_categories has rows, this file is never shown again.
 *
 *  TO EDIT: change the data below. The UI adapts on its own — a category
 *  whose items have photos renders as a card grid, one without renders as an
 *  editorial price list.
 */

/** Dietary badges. Extend the union rather than passing loose strings. */
export type DietaryTag = "Vegan" | "Gluten-free";

/** A priced option within a single dish, e.g. portion sizes. */
export type MenuVariant = Readonly<{
  label: string;
  price: string;
}>;

export type MenuItem = Readonly<{
  /** Stable id — used as a React key and as an anchor target. */
  id: string;
  name: string;
  /** Omit when the printed menu gives no description. */
  description?: string;
  /**
   * Display price including currency, e.g. "9,500 RWF".
   * `null` when the dish is priced by variant — or when no price has been
   * confirmed yet (the current demo state).
   */
  price: string | null;
  /** Portion or option pricing, e.g. 400g / 500g / 1kg. */
  variants?: readonly MenuVariant[];
  /** Path under /public, e.g. "/images/macheo/food-plate.webp". */
  image?: string;
  dietary?: readonly DietaryTag[];
  /** Availability note, e.g. "Ask if available". */
  availability?: string;
}>;

/** A group of items inside a category. Most categories have exactly one. */
export type MenuSection = Readonly<{
  id: string;
  /** Only set on categories that hold several groups, e.g. Drinks. */
  title?: string;
  /** A note that applies to the whole group. */
  note?: string;
  items: readonly MenuItem[];
}>;

export type MenuCategoryData = Readonly<{
  /** Stable id — used for tab state, anchors and `aria-controls`. */
  id: string;
  category: string;
  /** Short line under the category heading. */
  intro?: string;
  sections: readonly MenuSection[];
}>;

export const MENU_STATUS = {
  /**
   * The committed menu is a NEUTRAL DEMO: structure only, no prices. The
   * page renders this notice instead of pretending the list is final.
   */
  isPlaceholder: true,
  notice:
    "A taste of what the kitchen is about — the full menu with prices is published as soon as it is finalised. Ask us about today's fresh catch and seasonal plates.",
} as const;

/** Wraps a flat item list as a category's single, untitled section. */
function one(id: string, items: readonly MenuItem[]): readonly MenuSection[] {
  return [{ id, items }];
}

export const menu: readonly MenuCategoryData[] = [
  /* ------------------------------------------------------------------ */
  {
    id: "food",
    category: "Food",
    intro: "Fresh, lake-side cooking — breakfast, lunch and dinner.",
    sections: one("food-main", [
        {
          id: "breakfast",
          name: "Breakfast Plates",
          description: "Fruit, eggs, toast and local honey — a slow start with lake views.",
          price: null,
        },
        {
          id: "lake-fish",
          name: "Fresh Lake Fish",
          description: "The day's catch from Lake Kivu, grilled and served with sides.",
          price: null,
          availability: "Subject to the day's catch",
        },
        {
          id: "grilled-classics",
          name: "From the Grill",
          description: "Grilled meats and vegetables, cooked over open heat.",
          price: null,
        },
        {
          id: "vegetarian",
          name: "Garden & Vegetarian Plates",
          description: "Seasonal vegetables, beans and grains from the hills.",
          price: null,
        },
        {
          id: "snacks",
          name: "Snacks & Small Plates",
          description: "Light bites for the terrace — perfect with a cold drink.",
          price: null,
        },
      ]),
  },

  /* ------------------------------------------------------------------ */
  {
    id: "drinks",
    category: "Drinks",
    intro: "From morning coffee to sundowners at the bar.",
    sections: [
      {
        id: "drinks-hot",
        title: "Hot",
        items: [
          {
            id: "rwandan-coffee",
            name: "Rwandan Coffee",
            description: "Locally grown, freshly brewed.",
            price: null,
          },
          { id: "tea", name: "Tea & Herbal Infusions", price: null },
        ],
      },
      {
        id: "drinks-cold",
        title: "Cold",
        items: [
          { id: "fresh-juices", name: "Fresh Juices", price: null },
          { id: "soft-drinks", name: "Soft Drinks & Water", price: null },
          { id: "beers", name: "Beers", price: null },
          {
            id: "wines-spirits",
            name: "Wines & Spirits",
            price: null,
            availability: "Ask the bar for the current selection",
          },
          { id: "cocktails", name: "Cocktails & Mocktails", price: null },
        ],
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  {
    id: "specials",
    category: "Specials",
    intro: "Ask about today's special — it changes with the season and the catch.",
    sections: one("specials-main", [
        {
          id: "daily-special",
          name: "Chef's Special of the Day",
          description: "Ask your server what today brings.",
          price: null,
        },
        {
          id: "sundowners",
          name: "Sundowners on the Terrace",
          description: "The best seat for the light over the lake.",
          price: null,
        },
      ]),
  },
];
