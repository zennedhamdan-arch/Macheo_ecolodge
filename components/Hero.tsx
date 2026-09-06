"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import type { HeroMediaContent } from "@/lib/content";
import { useMotionMode } from "@/lib/useMediaQuery";
import { hero as heroCopy, primaryCta, secondaryCta } from "@/data/site";
import styles from "./Hero.module.css";

export const HERO_FALLBACK_IMAGE = "/images/macheo/hero-lake.jpg";

type HeroProps = Readonly<{
  /** Active admin-managed media, or null for the built-in photograph. */
  media: HeroMediaContent | null;
  /** Admin-managed heading override. */
  title?: string | null;
  /** Admin-managed subtitle override. */
  subtitle?: string | null;
  /** Where the scroll cue points. */
  scrollTargetId: string;
}>;

/**
 * The homepage hero — cinematic but light.
 *
 * Media priority: admin video → admin image → the bundled Lake Kivu
 * photograph. A video only ever plays muted, inline, poster-first and
 * preload="metadata" — and never when the visitor prefers reduced motion or
 * is on a small screen, where the poster image stands in instead. The image
 * variant is a plain <img>-level element that never blocks the page.
 */
export default function Hero({
  media,
  title,
  subtitle,
  scrollTargetId,
}: HeroProps): React.JSX.Element {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [hasFailed, setHasFailed] = useState(false);
  const [isCompact, setIsCompact] = useState(false);

  const motionMode = useMotionMode();
  const isReduced = motionMode === "reduced";

  /* Mobile-first performance: below 760px the hero is always an image —
     autoplay video on small mobile data connections is a tax, not a treat. */
  useEffect(() => {
    const query = window.matchMedia("(max-width: 760px)");
    const update = (): void => setIsCompact(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  const heading = title ?? heroCopy.headline.join(" ");
  const supporting = subtitle ?? heroCopy.supporting;

  const playVideo =
    media?.kind === "video" && Boolean(media.videoUrl) && !isReduced && !isCompact && !hasFailed;

  /* Pause when scrolled out of view — no off-screen decoding. */
  useEffect(() => {
    if (!playVideo) return;
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        if (entry.isIntersecting) {
          void video.play().catch(() => {
            /* Autoplay refused; the poster stays. */
          });
        } else {
          video.pause();
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, [playVideo]);

  const poster = media?.imageUrl ?? HERO_FALLBACK_IMAGE;

  return (
    <div className={styles.stage}>
      {playVideo ? (
        <video
          ref={videoRef}
          className={styles.video}
          src={media?.videoUrl ?? undefined}
          poster={poster}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
          tabIndex={-1}
          onError={() => setHasFailed(true)}
        />
      ) : media?.imageUrl ? (
        /* Admin image: remote or uploaded, so a plain <img> — dimensions
           unknown at build time, next/image would refuse it. */
        // eslint-disable-next-line @next/next/no-img-element
        <img src={media.imageUrl} alt="" aria-hidden="true" className={styles.image} />
      ) : (
        <Image
          src={HERO_FALLBACK_IMAGE}
          alt="Lake Kivu at golden hour, seen from the hills around Macheo"
          fill
          priority
          sizes="100vw"
          className={styles.image}
        />
      )}

      <div className={styles.scrim} aria-hidden="true" />

      <div className={styles.content}>
        <p className={styles.eyebrow}>Karongi · Lake Kivu · Rwanda</p>
        <h1 className={styles.headline}>{heading}</h1>
        <p className={styles.supporting}>{supporting}</p>
        <div className={styles.actions}>
          <Link href={primaryCta.href} className={styles.primary}>
            {primaryCta.label}
          </Link>
          <Link href={secondaryCta.href} className={styles.secondary}>
            {secondaryCta.label}
          </Link>
        </div>
      </div>

      <a
        href={`#${scrollTargetId}`}
        className={styles.scrollCue}
        aria-label="Scroll to explore Macheo"
      >
        <span aria-hidden="true">↓</span>
      </a>
    </div>
  );
}
