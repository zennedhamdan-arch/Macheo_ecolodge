import { lodge } from "@/data/macheo";
import { seo } from "@/data/site";
import { serializeJsonLd } from "@/lib/jsonld";

/**
 * schema.org LodgingBusiness data.
 *
 * Only confirmed fields are emitted. Anything unknown (geo coordinates,
 * ratings, opening hours) is left out entirely rather than guessed — bad
 * structured data is worse than none.
 */
export default function StructuredData(): React.JSX.Element {
  const openingHours = lodge.hours.map((row) => ({
    "@type": "OpeningHoursSpecification",
    dayOfWeek: row.schemaDays,
    opens: row.opens,
    closes: row.closes,
  }));

  const sameAs = lodge.socials.map((s) => s.href);

  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    name: lodge.name,
    description: seo.description,
    address: {
      "@type": "PostalAddress",
      ...(lodge.streetAddress ? { streetAddress: lodge.streetAddress } : {}),
      addressLocality: lodge.city,
      addressRegion: lodge.region,
      addressCountry: "RW",
    },
    amenitiesFeature: lodge.facilities.map((facility) => ({
      "@type": "LocationFeatureSpecification",
      name: facility,
    })),
  };

  if (lodge.legalName) data.legalName = lodge.legalName;
  if (openingHours.length > 0) data.openingHoursSpecification = openingHours;
  if (lodge.phone) data.telephone = lodge.phone.e164;
  if (lodge.email) data.email = lodge.email;
  if (lodge.website) data.url = lodge.website;
  if (lodge.directionsUrl) data.hasMap = lodge.directionsUrl;
  if (sameAs.length > 0) data.sameAs = sameAs;

  return (
    <script
      type="application/ld+json"
      // Serialized safely for an HTML script context (see lib/jsonld.ts):
      // <, > and & become short-form Unicode escapes — identical JSON, inert
      // in HTML, so no value can ever terminate the script element.
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
