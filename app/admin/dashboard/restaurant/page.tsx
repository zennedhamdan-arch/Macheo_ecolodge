import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { MenuCategoryRow, MenuItemRow, MenuSectionRow } from "@/lib/supabase/types";
import MenuEditor from "./MenuEditor";

export default async function AdminRestaurantPage(): Promise<React.JSX.Element> {
  const supabase = await createSupabaseServerClient();

  /* Newest first everywhere: `sort_order` is the menu's display order and a
     newly added category / section / dish is inserted at the TOP of it, so
     what was just created is the first thing on screen and can be edited
     straight away. `created_at` descending breaks ties between rows that
     share a sort_order. */
  const [categories, sections, items] = await Promise.all([
    supabase
      .from("menu_categories")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })
      .returns<MenuCategoryRow[]>(),
    supabase
      .from("menu_sections")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })
      .returns<MenuSectionRow[]>(),
    supabase
      .from("menu_items")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })
      .returns<MenuItemRow[]>(),
  ]);

  return (
    <>
      <h1 className="admin-title">Restaurant &amp; Bar</h1>
      <p className="admin-muted admin-lede">
        The menu guests see on the Restaurant &amp; Bar page — categories,
        dishes, drinks and prices. Prices are in Rwandan francs, whole numbers,
        and optional: an item without a price simply shows no price. Turning
        an item off hides it from the website immediately without deleting it.
      </p>
      <MenuEditor
        categories={categories.data ?? []}
        sections={sections.data ?? []}
        items={items.data ?? []}
      />
    </>
  );
}
