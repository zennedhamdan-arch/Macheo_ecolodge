/**
 * Every call to action on the site, derived from the business data.
 *
 * If a piece of contact information is missing, the corresponding action is
 * simply omitted — nothing is faked, and no dead link is ever rendered.
 */

import { lodge } from "@/data/macheo";

export type SiteAction = Readonly<{
  id: string;
  label: string;
  href: string;
  external: boolean;
  /** Extra context for screen readers, e.g. the number being dialled. */
  hint?: string;
}>;

/**
 * "Plan Your Stay" — opens the dedicated reservation page.
 *
 * Every primary CTA on the site funnels here: the navbar button, the hero,
 * the accommodation cards and the footer.
 */
export const planStayAction: SiteAction = {
  id: "plan-stay",
  label: "Plan Your Stay",
  href: "/reservation",
  external: false,
  hint: "Go to the reservation form",
};

export const exploreAction: SiteAction = {
  id: "explore",
  label: "Explore Macheo",
  href: "/#discover",
  external: false,
};

export const contactAction: SiteAction = {
  id: "contact",
  label: "Contact Us",
  href: "/contact",
  external: false,
};

export const whatsappAction: SiteAction | null = lodge.whatsapp
  ? {
      id: "whatsapp",
      label: "WhatsApp",
      href: lodge.whatsapp.href,
      external: true,
      hint: `Message ${lodge.whatsapp.display} on WhatsApp`,
    }
  : null;

export const directionsAction: SiteAction | null = lodge.directionsUrl
  ? {
      id: "directions",
      label: "Get Directions",
      href: lodge.directionsUrl,
      external: true,
      hint: `Directions to ${lodge.name} in ${lodge.city}`,
    }
  : null;

/** Compact list used by the final CTA band and the footer. */
export const primaryActions: readonly SiteAction[] = [
  planStayAction,
  contactAction,
  whatsappAction,
].filter((a): a is SiteAction => a !== null);
