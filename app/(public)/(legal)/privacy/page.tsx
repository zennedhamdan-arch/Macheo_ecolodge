import LegalPage, { legalMetadata } from "../LegalPage";
import { lodge, telHref } from "@/data/macheo";

export const metadata = legalMetadata(
  "Privacy",
  `How ${lodge.name} handles information on this website.`,
);

/**
 * Describes what this website actually does with data — the reservation and
 * contact forms collect only what they need, and nothing is shared.
 */
export default function Privacy(): React.JSX.Element {
  return (
    <LegalPage title="Privacy" updated="September 2026">
      <p>
        This page explains what information {lodge.name} receives when you use
        this website, and what we do with it.
      </p>

      <h2>What we collect</h2>
      <p>
        Only what you choose to send us. The reservation form asks for your
        name, contact details, dates and preferences so we can answer your
        stay request. The contact form asks for your name, email and message
        so we can reply. We collect nothing else, and there are no accounts.
      </p>

      <h2>What we do with it</h2>
      <p>
        We use your details to respond to your request — to confirm a stay,
        answer a question, or call you back. We do not sell, rent or share
        your information with third parties for marketing, and we send no
        newsletters unless you explicitly ask for one.
      </p>

      <h2>Cookies and analytics</h2>
      <p>
        The site itself sets no tracking cookies and runs no advertising
        trackers. An essential session cookie exists only for staff signing
        into the site dashboard. Your browser may cache images and fonts to
        make return visits faster — that data stays on your device.
      </p>

      <h2>Anti-bot protection</h2>
      <p>
        Our forms may use Cloudflare Turnstile to stop spam. If it runs in
        your browser, it is governed by Cloudflare&apos;s own privacy policy.
      </p>

      <h2>Links to other services</h2>
      <p>
        Some buttons take you to services we don&apos;t control — WhatsApp,
        Google Maps and our social pages. Once you follow one of those links,
        that company&apos;s own privacy policy applies.
      </p>

      <h2>Hosting</h2>
      <p>
        Like almost all websites, our host records standard server logs (such
        as IP address, browser type and the page requested) to serve pages and
        keep the site secure.
      </p>

      <h2>Questions</h2>
      <p>
        Contact {lodge.legalName ?? lodge.name} in {lodge.city},{" "}
        {lodge.country}
        {lodge.phone && telHref ? (
          <>
            {" "}
            on <a href={telHref}>{lodge.phone.display}</a>
          </>
        ) : null}
        {lodge.email ? (
          <>
            {" "}
            or by email at <a href={`mailto:${lodge.email}`}>{lodge.email}</a>
          </>
        ) : null}
        .
      </p>
    </LegalPage>
  );
}
