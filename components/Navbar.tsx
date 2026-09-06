"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { navLinks } from "@/data/site";
import { planStayAction } from "@/lib/actions";
import BrandMark from "./BrandMark";
import styles from "./Navbar.module.css";

/** Scroll distance (px) after which the bar leaves its transparent state. */
const SOLID_AFTER = 48;

/**
 * The site-wide public navigation.
 *
 * One bar, one menu, one CTA — no duplicated navigation anywhere. Transparent
 * over each page's dark hero band, solid cream once the visitor scrolls. On
 * phones the links collapse into a full-height panel with a big
 * "Plan Your Stay" button at the bottom.
 */
export default function Navbar(): React.JSX.Element {
  const pathname = usePathname();
  const [isSolid, setIsSolid] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const panelId = useId();
  const toggleRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    let ticking = false;

    const onScroll = (): void => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        setIsSolid(window.scrollY > SOLID_AFTER);
        ticking = false;
      });
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const close = useCallback(() => setIsOpen(false), []);

  /* Close on navigation (including browser back/forward). */
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  /* Escape closes the mobile panel and returns focus to the toggle. */
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        close();
        toggleRef.current?.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [isOpen, close]);

  const isActive = (href: string): boolean =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header
      className={styles.header}
      data-solid={isSolid ? "true" : "false"}
      data-open={isOpen ? "true" : "false"}
    >
      <nav className={styles.bar} aria-label="Primary">
        <Link href="/" className={styles.brand} onClick={close} aria-label="Macheo Ecolodge & Camping — home">
          <BrandMark size="nav" />
        </Link>

        {/* --- desktop --- */}
        <ul className={styles.links}>
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className={styles.link}
                aria-current={isActive(link.href) ? "page" : undefined}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className={styles.actions}>
          <Link href={planStayAction.href} className={styles.cta}>
            {planStayAction.label}
          </Link>

          <button
            ref={toggleRef}
            type="button"
            className={styles.toggle}
            aria-expanded={isOpen}
            aria-controls={panelId}
            onClick={() => setIsOpen((open) => !open)}
          >
            <span className={styles.toggleBars} aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            <span className={styles.toggleLabel}>{isOpen ? "Close" : "Menu"}</span>
          </button>
        </div>
      </nav>

      {/* --- mobile panel --- */}
      <div id={panelId} className={styles.panel} hidden={!isOpen}>
        <ul className={styles.panelLinks}>
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className={styles.panelLink}
                onClick={close}
                aria-current={isActive(link.href) ? "page" : undefined}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
        <Link href={planStayAction.href} className={styles.panelCta} onClick={close}>
          {planStayAction.label}
        </Link>
      </div>
    </header>
  );
}
