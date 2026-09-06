"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

import type { MenuCategoryData } from "@/data/menu";
import MenuCategory from "./MenuCategory";
import styles from "./Menu.module.css";

/**
 * The restaurant menu, rendered as an ARIA tablist — one category at a time.
 *
 * Arrow keys move between tabs, Home/End jump to the ends, and each panel is
 * labelled by its tab. On mobile the tablist becomes a horizontally
 * scrollable strip with big touch targets.
 *
 * Categories are passed in by the server so the menu can come from Supabase;
 * the page decides where the data comes from, this component only renders it.
 */
type MenuProps = Readonly<{
  categories: readonly MenuCategoryData[];
  /** aria-label for the tablist. */
  label?: string;
}>;

export default function Menu({
  categories,
  label = "Menu categories",
}: MenuProps): React.JSX.Element {
  const menu = categories;

  const [activeId, setActiveId] = useState<string>(menu[0]?.id ?? "");
  const tabsRef = useRef<HTMLDivElement | null>(null);
  const baseId = useId();

  const tabId = useCallback(
    (categoryId: string) => `${baseId}-tab-${categoryId}`,
    [baseId],
  );
  const panelId = useCallback(
    (categoryId: string) => `${baseId}-panel-${categoryId}`,
    [baseId],
  );

  /* Keep the active tab in view on narrow screens. */
  useEffect(() => {
    const list = tabsRef.current;
    if (!list) return;
    const active = list.querySelector<HTMLElement>('[aria-selected="true"]');
    active?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [activeId]);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>): void => {
      const index = menu.findIndex((c) => c.id === activeId);
      if (index === -1) return;

      let next = index;
      if (event.key === "ArrowRight") next = (index + 1) % menu.length;
      else if (event.key === "ArrowLeft") next = (index - 1 + menu.length) % menu.length;
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = menu.length - 1;
      else return;

      event.preventDefault();
      const target = menu[next];
      if (!target) return;
      setActiveId(target.id);
      document.getElementById(tabId(target.id))?.focus();
    },
    [activeId, menu, tabId],
  );

  if (menu.length === 0) {
    return (
      <p className={styles.emptyState}>
        The menu is being prepared for the website — ask us about today&apos;s
        dishes when you visit.
      </p>
    );
  }

  return (
    <div className={styles.root}>
      <div
        ref={tabsRef}
        role="tablist"
        aria-label={label}
        aria-orientation="horizontal"
        className={styles.tabs}
        onKeyDown={onKeyDown}
      >
        {menu.map((category) => {
          const selected = category.id === activeId;
          return (
            <button
              key={category.id}
              type="button"
              role="tab"
              id={tabId(category.id)}
              aria-selected={selected}
              aria-controls={panelId(category.id)}
              tabIndex={selected ? 0 : -1}
              className={styles.tab}
              onClick={() => setActiveId(category.id)}
            >
              {category.category}
            </button>
          );
        })}
      </div>

      {menu.map((category) => (
        <div
          key={category.id}
          role="tabpanel"
          id={panelId(category.id)}
          aria-labelledby={tabId(category.id)}
          hidden={category.id !== activeId}
          tabIndex={0}
          className={styles.panel}
        >
          <MenuCategory category={category} />
        </div>
      ))}
    </div>
  );
}
