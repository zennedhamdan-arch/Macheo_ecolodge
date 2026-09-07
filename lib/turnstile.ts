/**
 * Server-side Cloudflare Turnstile verification.
 *
 * The SITE key is public; the SECRET lives only in the server environment.
 * A browser-supplied token is never trusted until it has been re-verified
 * here.
 *
 * Turnstile is OPTIONAL in this project (see `turnstileRequired`): it applies
 * only when the public site key exists, because that is the only case where
 * the widget can render and a guest can obtain a token. When it IS in play it
 * still fails closed — a missing secret stops submissions rather than
 * silently skipping protection.
 */

const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export class TurnstileConfigError extends Error {}

export async function verifyTurnstileToken(
  token: string,
  remoteIp?: string,
): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new TurnstileConfigError(
        "Anti-bot protection is not configured on the server.",
      );
    }
    return true; // local development only, where no keys exist by design
  }

  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp) body.set("remoteip", remoteIp);

  const response = await fetch(TURNSTILE_VERIFY_URL, {
    method: "POST",
    body,
  });
  if (!response.ok) return false;
  const outcome = (await response.json()) as { success?: boolean };
  return outcome.success === true;
}

/**
 * Is the anti-bot check in play at all?
 *
 * False when no public site key is configured — the widget cannot render, so
 * no guest could ever produce a token and requiring one would make the form
 * unusable. The routes then skip the token check but still run every field
 * validation and insert under the anon key, so RLS, the column grants and the
 * date-window policy continue to do the enforcing.
 */
export function turnstileRequired(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
}

/** True when the secret exists but the public site key was absent at build
 *  time — the widget never rendered, so no guest could ever pass. */
export function turnstileMisconfigured(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY && !process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
}

export function clientIp(request: Request): string | undefined {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() ?? undefined;
}
