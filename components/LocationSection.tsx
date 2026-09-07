import { lodge } from "@/data/macheo";
import { locationSection, SECTION_IDS } from "@/data/site";
import { directionsAction } from "@/lib/actions";
import { getLodge, getMapEmbedUrl } from "@/lib/content";
import styles from "./LocationSection.module.css";

/**
 * Where Macheo is, and how to get there — the homepage and the About page
 * share this one section, so there is a single map, one set of words and one
 * directions link to keep correct.
 *
 * The embed is the owner-confirmed Google Maps place, overridable from
 * Admin → Site content (see `getMapEmbedUrl`). If neither exists the section
 * falls back to the drawn placeholder: the location words and a directions
 * link, never a guessed pin.
 */
export default async function LocationSection(): Promise<React.JSX.Element> {
  const [business, mapUrl] = await Promise.all([getLodge(), getMapEmbedUrl()]);

  const facilities = lodge.facilities;

  return (
    <section id={SECTION_IDS.location} className={styles.section} aria-labelledby="location-heading">
      <div className="shell">
        <div className={styles.grid}>
          <div className={styles.copy}>
            <p className="eyebrow">{locationSection.eyebrow}</p>
            <h2 id="location-heading" className={styles.headline}>
              {locationSection.headline}
            </h2>
            <p className={styles.body}>{locationSection.body}</p>

            <address className={styles.address}>
              {business.name}
              <br />
              {business.city}, {business.country}
            </address>

            {directionsAction ? (
              <a
                href={directionsAction.href}
                className={styles.directions}
                target="_blank"
                rel="noopener noreferrer"
              >
                {directionsAction.label}
              </a>
            ) : null}

            <ul className={styles.facilities} aria-label="What you will find here">
              {facilities.map((facility) => (
                <li key={facility}>{facility}</li>
              ))}
            </ul>
          </div>

          <div className={styles.mapCol}>
            {mapUrl ? (
              <iframe
                src={mapUrl}
                title={`Map showing the location of ${business.name}`}
                className={styles.map}
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            ) : (
              <div className={styles.mapFallback} role="img" aria-label="Map of the Lake Kivu region is available once our exact location is published. Meanwhile, Macheo is in Karongi district on the western shore of Lake Kivu, Rwanda.">
                <svg viewBox="0 0 400 300" className={styles.mapArt} aria-hidden="true">
                  <rect width="400" height="300" fill="var(--mk-lake-100)" />
                  <path
                    d="M0 190 C60 150 90 200 150 175 C210 150 240 205 300 185 C345 170 380 195 400 180 L400 300 L0 300 Z"
                    fill="var(--mk-lake-200)"
                  />
                  <path
                    d="M0 205 C70 175 110 215 170 195 C230 175 260 220 320 200 C360 188 385 205 400 198 L400 300 L0 300 Z"
                    fill="var(--mk-lake-600)"
                    opacity="0.35"
                  />
                  <path d="M40 130 L85 70 L130 130 Z" fill="var(--mk-forest-700)" opacity="0.8" />
                  <path d="M110 135 L170 55 L230 135 Z" fill="var(--mk-forest-600)" opacity="0.85" />
                  <path d="M215 130 L265 75 L315 130 Z" fill="var(--mk-forest-700)" opacity="0.7" />
                  <g transform="translate(200 160)">
                    <path
                      d="M0 -26 C-10 -26 -17 -19 -17 -10 C-17 2 0 18 0 18 C0 18 17 2 17 -10 C17 -19 10 -26 0 -26 Z"
                      fill="var(--mk-forest-900)"
                    />
                    <circle cx="0" cy="-10" r="6" fill="var(--mk-sand-300)" />
                  </g>
                </svg>
                <p className={styles.mapNote}>
                  Karongi (Kibuye) · Western Province · Rwanda
                  <br />
                  <span>Map and directions will appear once our exact location is published.</span>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
