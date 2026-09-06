import Footer from "@/components/Footer";
import FloatingWhatsApp from "@/components/FloatingWhatsApp";
import Navbar from "@/components/Navbar";

/**
 * The public site's chrome.
 *
 * The Navbar lives HERE, in a route group, and deliberately not in the root
 * layout: it is `position: fixed` (it floats over the dark page heroes), so
 * rendering it from the root layout made it overlap the admin dashboard.
 *
 * A route group ((public) adds nothing to the URL) is the structural fix:
 * every page inside it gets the navbar and the footer, and nothing under
 * /admin ever does.
 *
 * The floating WhatsApp button is a global conversion element, so it rides
 * along here too — and on the standalone utility pages (/reservation) via
 * their own layouts. Never on /admin.
 */
export default function PublicLayout({
  children,
}: Readonly<{ children: React.ReactNode }>): React.JSX.Element {
  return (
    <>
      <Navbar />
      {children}
      <Footer />
      <FloatingWhatsApp />
    </>
  );
}
