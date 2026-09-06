import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { requireSupabaseEnv } from "@/lib/supabase/env";
import type { Database } from "@/lib/supabase/types";
import {
  TurnstileConfigError,
  clientIp,
  turnstileMisconfigured,
  verifyTurnstileToken,
} from "@/lib/turnstile";

/**
 * Public contact-form submission.
 *
 * Same posture as /api/reservations: the browser posts here, the Turnstile
 * token is verified SERVER-side first, and only then is the row inserted —
 * under the ANON key, so RLS and column grants apply. contact_messages is
 * write-only for the public: a message can be created, never read back.
 */

export const runtime = "nodejs";

type Submission = {
  name?: unknown;
  email?: unknown;
  phone?: unknown;
  subject?: unknown;
  message?: unknown;
  turnstileToken?: unknown;
};

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export async function POST(request: Request): Promise<NextResponse> {
  let payload: Submission;
  try {
    payload = (await request.json()) as Submission;
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  if (turnstileMisconfigured()) {
    return NextResponse.json(
      {
        error:
          "Anti-bot protection is misconfigured on the server. Please reach us by phone or WhatsApp instead.",
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

  // ---- Field validation (the database re-checks all of it) ----
  const name = asString(payload.name);
  const email = asString(payload.email);
  const phone = asString(payload.phone);
  const subject = asString(payload.subject);
  const message = asString(payload.message);

  if (!name || name.length > 120) {
    return NextResponse.json({ error: "Please give a name." }, { status: 400 });
  }
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json(
      { error: "Please give a valid email address so we can reply." },
      { status: 400 },
    );
  }
  if (!message || message.length > 3000) {
    return NextResponse.json({ error: "Please write a message." }, { status: 400 });
  }
  if (phone && (phone.length < 3 || phone.length > 40)) {
    return NextResponse.json({ error: "That phone number doesn't look right." }, { status: 400 });
  }
  if (subject && subject.length > 160) {
    return NextResponse.json({ error: "Please keep the subject shorter." }, { status: 400 });
  }

  const { url, anonKey } = requireSupabaseEnv();
  const supabase = createClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error } = await supabase.from("contact_messages").insert({
    name,
    email,
    phone,
    subject,
    message,
  });

  if (error) {
    // Never surface database internals to a visitor.
    return NextResponse.json(
      { error: "The message could not be sent. Please try again, or reach us by phone." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
