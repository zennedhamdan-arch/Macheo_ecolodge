"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import SignOutButton from "./SignOutButton";

/**
 * Dashboard navigation: a grouped sidebar on desktop, a hamburger + slide-out
 * drawer on phones. The team manages this site from the lodge — the nav must
 * work one-handed on a small screen, which a row of tabs never does.
 *
 * Sections group related pages so the list stays scannable. Only pages that
 * exist are listed — a nav item that 404s is worse than no nav item.
 */

type NavItem = Readonly<{ href: string; label: string; icon: React.ReactNode }>;

type NavGroup = Readonly<{ title: string; items: readonly NavItem[] }>;

/* 20×20 stroke icons — inline SVG, no icon library, no extra dependency. */
const icon = (path: React.ReactNode): React.ReactNode => (
  <svg
    viewBox="0 0 24 24"
    width="18"
    height="18"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {path}
  </svg>
);

const ICONS = {
  overview: icon(
    <>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </>,
  ),
  reservations: icon(
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </>,
  ),
  accommodation: icon(
    <>
      <path d="M3 21V8l9-5 9 5v13" />
      <path d="M9 21v-6h6v6" />
    </>,
  ),
  camping: icon(
    <>
      <path d="M12 4 2 20h20L12 4z" />
      <path d="M12 12 8.5 20h7L12 12z" />
    </>,
  ),
  experiences: icon(
    <>
      <path d="M12 21c4.5-2 7-5.5 7-10V5l-7-2-7 2v6c0 4.5 2.5 8 7 8z" />
    </>,
  ),
  restaurant: icon(
    <>
      <path d="M7 3v8a2.5 2.5 0 0 0 5 0V3" />
      <path d="M9.5 11v10" />
      <path d="M16.5 3c1.8 1.2 2.5 3 2.5 5.5V21" />
    </>,
  ),
  gallery: icon(
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="m5 17 4.5-4.5L14 17l3-3 4 4" />
    </>,
  ),
  content: icon(
    <>
      <path d="M4 20h16" />
      <path d="M6 16 16.5 5.5a2.1 2.1 0 0 1 3 3L9 19l-4 1 1-4z" />
    </>,
  ),
  contact: icon(
    <>
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.4 19.4 0 0 1-6-6 19.8 19.8 0 0 1-3-8.6A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.8.7a2 2 0 0 1 1.7 2z" />
    </>,
  ),
  settings: icon(
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.9 2.9l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.9-2.9l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.9-2.9l.1.1a1.7 1.7 0 0 0 1.9.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 1 1.5h.1a1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.9 2.9l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1a1.7 1.7 0 0 0 1.5 1h.2a2 2 0 1 1 0 4h-.2a1.7 1.7 0 0 0-1.5 1z" />
    </>,
  ),
} as const;

const GROUPS: readonly NavGroup[] = [
  {
    title: "Dashboard",
    items: [{ href: "/admin/dashboard", label: "Overview", icon: ICONS.overview }],
  },
  {
    title: "Guests",
    items: [
      { href: "/admin/dashboard/reservations", label: "Reservations", icon: ICONS.reservations },
    ],
  },
  {
    title: "Website",
    items: [
      { href: "/admin/dashboard/accommodation", label: "Accommodation", icon: ICONS.accommodation },
      { href: "/admin/dashboard/camping", label: "Camping", icon: ICONS.camping },
      { href: "/admin/dashboard/experiences", label: "Experiences", icon: ICONS.experiences },
      { href: "/admin/dashboard/restaurant", label: "Restaurant & Bar", icon: ICONS.restaurant },
      { href: "/admin/dashboard/gallery", label: "Gallery", icon: ICONS.gallery },
    ],
  },
  {
    title: "Content & settings",
    items: [
      { href: "/admin/dashboard/content", label: "Site content", icon: ICONS.content },
      { href: "/admin/dashboard/contact-info", label: "Contact info", icon: ICONS.contact },
      { href: "/admin/dashboard/settings", label: "Settings", icon: ICONS.settings },
    ],
  },
];

export default function AdminNav({ email }: Readonly<{ email: string }>): React.JSX.Element {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  /* Close the drawer on navigation, on Escape, and lock body scroll. */
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const isActive = (href: string): boolean =>
    href === "/admin/dashboard" ? pathname === href : pathname.startsWith(href);

  return (
    <>
      {/* Top bar — always visible; the hamburger only shows on phones. */}
      <header className="admin-topbar">
        <button
          type="button"
          className="admin-menu-button"
          aria-expanded={isOpen ? "true" : "false"}
          aria-controls="admin-sidebar"
          aria-label={isOpen ? "Close menu" : "Open menu"}
          onClick={() => setIsOpen((open) => !open)}
        >
          <span aria-hidden="true" />
          <span aria-hidden="true" />
          <span aria-hidden="true" />
        </button>
        <Link className="admin-brand" href="/admin/dashboard">
          Macheo Admin
        </Link>
        <div className="admin-topbar-right">
          <span className="admin-who">{email}</span>
          <Link className="admin-link" href="/" target="_blank" rel="noreferrer">
            View site
          </Link>
        </div>
      </header>

      {isOpen ? (
        <button
          type="button"
          className="admin-nav-backdrop"
          aria-label="Close menu"
          onClick={() => setIsOpen(false)}
        />
      ) : null}

      <nav
        id="admin-sidebar"
        className="admin-sidebar"
        data-open={isOpen ? "true" : "false"}
        aria-label="Dashboard sections"
      >
        {GROUPS.map((group) => (
          <section key={group.title} className="admin-nav-group">
            <h2 className="admin-nav-group-title">{group.title}</h2>
            <ul className="admin-nav-list">
              {group.items.map((item) => (
                <li key={item.href}>
                  <Link
                    className="admin-nav-link-item"
                    href={item.href}
                    data-active={isActive(item.href) ? "true" : "false"}
                    aria-current={isActive(item.href) ? "page" : undefined}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <section className="admin-nav-group admin-nav-group-system">
          <h2 className="admin-nav-group-title">System</h2>
          <ul className="admin-nav-list">
            <li>
              <span className="admin-nav-signout">
                <SignOutButton />
              </span>
            </li>
          </ul>
        </section>
      </nav>
    </>
  );
}
