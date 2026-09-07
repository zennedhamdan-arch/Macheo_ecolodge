import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { requireSupabaseEnv } from "@/lib/supabase/env";
import type { Database } from "@/lib/supabase/types";
import { lodgeLocalToUtcIso, lodgeToday } from "@/lib/time";
import {
  TurnstileConfigError,
  clientIp,
  turnstileMisconfigured,
  turnstileRequired,
  verifyTurnstileToken,
} from "@/lib/turnstile";

/**
 * Public stay-request submission.
 *
 * The browser never writes to the database directly: it posts here, the
 * Cloudflare Turnstile token is verified SERVER-side first, and only then is
 * the row inserted. The insert still runs under the ANON key — deliberately —
 * so every existing database control applies unchanged: the anon INSERT
 * policy, the column grants (a guest cannot set status/admin_notes), and the
 * date-window policy. This route adds a gate; it moves nothing to trust.
 *
 * The response carries the guest reference code, generated HERE (never by
 * the client), so the confirmation screen can quote it.
 */

export const runtime = "nodejs";

type Submission = {
  name?: unknown;
  phone?: unknown;
  email?: unknown;
  check_in?: unknown;
  check_out?: unknown;
  adults?: unknown;
  children?: unknown;
  accommodation_pref?: unknown;
  camping_pref?: unknown;
  experience_interest?: unknown;
  notes?: unknown;
  turnstileToken?: unknown;
};

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function asBoundedInt(value: unknown, min: number, max: number): number | null {
  if (typeof value !== "number" || !Number.isInteger(value)) return null;
  return value >= min && value <= max ? value : null;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** MCH-XXXXXX — unambiguous over the phone, cheap to generate, unique-indexed. */
function generateReferenceCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I look-alikes
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `MCH-${code}`;
}

export async function POST(request: Request): Promise<NextResponse> {
  let payload: Submission;
  try {
    payload = (await request.json()) as Submission;
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  /* Turnstile is OPTIONAL here: it applies only when the public site key is
     configured, which is the only case where the widget renders and a guest
     can obtain a token. Skipping it when unconfigured weakens no
     authorization — every field below is still validated and the insert
     still runs under the anon key, so RLS, the column grants and the
     date-window policy remain the enforcement. */
  if (turnstileRequired()) {
    if (turnstileMisconfigured()) {
      return NextResponse.json(
        {
          error:
            "Anti-bot protection is misconfigured on the server. Please call or WhatsApp us — the number is on the site.",
        },
        { status: 503 },
      );
    }

    const turnstileToken = asString(payload.turnstileToken);
    if (!turnstileToken) {
      return NextResponse.json({ error: "Please complete the anti-bot check." }, { status: 400 });
    }

    try {
      const human = await verifyTurnstileToken(turnstileToken, clientIp(request));
      if (!human) {
        return NextResponse.json(
          { error: "The anti-bot check didn't pass. Please try again." },
          { status: 400 },
        );
      }
    } catch (error) {
      if (error instanceof TurnstileConfigError) {
        return NextResponse.json({ error: error.message }, { status: 503 });
      }
      return NextResponse.json(
        { error: "The anti-bot check could not be reached. Please try again." },
        { status: 502 },
      );
    }
  }

  // ---- Field validation (mirrors the form; the database re-checks all of it) ----
  const name = asString(payload.name);
  const phone = asString(payload.phone);
  const email = asString(payload.email);
  const notes = asString(payload.notes);
  const checkIn = asString(payload.check_in);
  const checkOut = asString(payload.check_out);
  const accommodationPref = asString(payload.accommodation_pref);
  const campingPref = asString(payload.camping_pref);
  const experienceInterest = asString(payload.experience_interest);
  const adults = asBoundedInt(payload.adults, 1, 30);
  const children = asBoundedInt(payload.children ?? 0, 0, 30);

  if (!name || name.length > 120) {
    return NextResponse.json({ error: "Please give a name." }, { status: 400 });
  }
  if (!phone || phone.length < 6 || phone.length > 40) {
    return NextResponse.json({ error: "Please give a phone number." }, { status: 400 });
  }
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "That email doesn't look right." }, { status: 400 });
  }
  if (!checkIn || !DATE_RE.test(checkIn)) {
    return NextResponse.json({ error: "Please choose a check-in date." }, { status: 400 });
  }
  if (!checkOut || !DATE_RE.test(checkOut)) {
    return NextResponse.json({ error: "Please choose a check-out date." }, { status: 400 });
  }
  if (checkIn < lodgeToday()) {
    return NextResponse.json(
      { error: "Check-in can't be in the past — please choose today or a later date." },
      { status: 400 },
    );
  }
  if (checkOut <= checkIn) {
    return NextResponse.json(
      { error: "Check-out must be after check-in." },
      { status: 400 },
    );
  }
  if (!adults || children === null) {
    return NextResponse.json({ error: "Please choose how many guests are coming." }, { status: 400 });
  }
  if (accommodationPref && accommodationPref.length > 160) {
    return NextResponse.json({ error: "Please choose a valid accommodation option." }, { status: 400 });
  }
  if (campingPref && campingPref.length > 160) {
    return NextResponse.json({ error: "Please choose a valid camping option." }, { status: 400 });
  }
  if (experienceInterest && experienceInterest.length > 160) {
    return NextResponse.json({ error: "Please choose a valid experience." }, { status: 400 });
  }
  if (notes && notes.length > 1000) {
    return NextResponse.json({ error: "Please keep the special request shorter." }, { status: 400 });
  }

  /* preferred_at is the legacy column the schema still carries; it mirrors
     check-in at midday Kigali time so old dashboards and indexes keep
     working. */
  let preferredAtIso: string;
  try {
    preferredAtIso = lodgeLocalToUtcIso(checkIn, "12:00");
  } catch {
    return NextResponse.json({ error: "Please check your dates." }, { status: 400 });
  }

  const partySize = adults + children;

  // ---- Insert under the anon key: RLS, column grants and the date-window
  // policy all still apply exactly as they did from the browser. ----
  const { url, anonKey } = requireSupabaseEnv();
  const supabase = createClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const reference = generateReferenceCode();

  const { error } = await supabase.from("reservation_requests").insert({
    name,
    phone,
    email,
    party_size: partySize,
    preferred_at: preferredAtIso,
    notes,
    check_in: checkIn,
    check_out: checkOut,
    adults,
    children,
    accommodation_pref: accommodationPref,
    camping_pref: campingPref,
    experience_interest: experienceInterest,
    reference_code: reference,
  });

  if (error) {
    // The RLS date policy surfaces as a row-level-security violation; say it
    // the way a guest needs to hear it, and never leak database internals.
    if (/violates row-level security|check_in|check_out/i.test(error.message)) {
      return NextResponse.json(
        { error: "Please check your dates — check-in must be today or later, and check-out after check-in." },
        { status: 400 },
      );
    }
    if (/duplicate key.*reference_code/i.test(error.message)) {
      return NextResponse.json(
        { error: "Something went sideways generating your reference — please send the request again." },
        { status: 500 },
      );
    }
    return NextResponse.json(
      { error: "The request could not be sent. Please try again, or contact us." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, reference });
}
