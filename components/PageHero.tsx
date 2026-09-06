import styles from "./PageHero.module.css";

type PageHeroProps = Readonly<{
  eyebrow: string;
  title: string;
  lede?: string;
  /** Optional background photograph (local path or admin URL). */
  image?: string;
  imageAlt?: string;
}>;

/**
 * The dark, quiet band at the top of every public sub-page. Keeps the whole
 * site visually coherent under the transparent navbar without competing with
 * the homepage hero.
 */
export default function PageHero({
  eyebrow,
  title,
  lede,
  image,
  imageAlt,
}: PageHeroProps): React.JSX.Element {
  return (
    <div className={styles.hero}>
      {image ? (
        <>
          {/* Dimensions of admin imagery are unknown at build time, so plain
              <img> for remote sources; local ones still benefit from CSS. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image}
            alt={imageAlt ?? ""}
            aria-hidden={imageAlt ? undefined : "true"}
            className={styles.image}
          />
          <div className={styles.scrim} aria-hidden="true" />
        </>
      ) : null}
      <div className={`shell ${styles.inner}`}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h1 className={styles.title}>{title}</h1>
        {lede ? <p className={styles.lede}>{lede}</p> : null}
      </div>
    </div>
  );
}
