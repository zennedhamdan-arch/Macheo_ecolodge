import LegalPage, { legalMetadata } from "../LegalPage";
import { lodge, telHref } from "@/data/macheo";

export const metadata = legalMetadata(
  "Terms",
  `Terms of use for the ${lodge.name} website.`,
);

export default function Terms(): React.JSX.Element {
  return (
    <LegalPage title="Terms" updated="September 2026">
      <p>
        These terms cover your use of this website. They do not create a
        booking or any other contract with {lodge.legalName ?? lodge.name}.
      </p>

      <h2>Stays, camping and prices</h2>
      <p>
        Accommodation, camping options, experiences and prices shown here are
        for information and can change without notice. Please confirm current
        availability and rates with us when you book.
      </p>

      <h2>Reservations</h2>
      <p>
        This site does not take payments and does not confirm bookings
        automatically. The reservation form sends a request; a stay is only
        confirmed once we have confirmed it to you, usually by phone or
        WhatsApp
        {lodge.phone && telHref ? (
          <>
            {" "}
            or by phone on <a href={telHref}>{lodge.phone.display}</a>
          </>
        ) : null}
        .
      </p>

      <h2>Food and dietary needs</h2>
      <p>
        Menu information on this site is a guide and changes with the season
        and the day&apos;s catch. Our kitchen handles many ingredients, so if
        you have an allergy or intolerance, please tell us directly when you
        order so we can advise you properly.
      </p>

      <h2>Content</h2>
      <p>
        The text, photography and design on this site belong to{" "}
        {lodge.legalName ?? lodge.name} unless stated otherwise. Please ask
        before reusing them.
      </p>

      <h2>External links</h2>
      <p>
        We link to third-party services such as WhatsApp and Google Maps for
        your convenience. We are not responsible for their content or
        availability.
      </p>
    </LegalPage>
  );
}
