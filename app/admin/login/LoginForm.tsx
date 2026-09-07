"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { sanitizeAdminPath } from "@/lib/safeRedirect";

/**
 * Admin sign-in: email + password. Nothing else — no social login, no
 * authenticator app, no second factor. One form, one step.
 *
 * Two deliberate properties:
 *
 * 1. Errors stay vague. "Those details didn't work" never reveals whether the
 *    email or the password was the wrong half. Nothing here distinguishes a
 *    real admin's account from anyone else's.
 *
 * 2. Signing in is not the same as being allowed in. Supabase Auth will
 *    happily authenticate any account; whether that account may change the
 *    site is decided by the `admin_users` allow-list and enforced by RLS. A
 *    successful sign-in that is not on the list is signed straight back out.
 *
 * The `next` parameter is sanitized to an internal /admin path: no scheme, no
 * protocol-relative `//`, no `\`, no control characters — anything else falls
 * back to /admin/dashboard.
 */

const GENERIC_PASSWORD_ERROR = "Those details didn't work. Please try again.";
const NOT_AN_ADMIN_ERROR = "This account doesn't have access to the dashboard.";

export default function LoginForm(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = sanitizeAdminPath(searchParams.get("next"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);

    if (email.trim().length === 0 || password.length === 0) {
      setError("Enter both your email and your password.");
      return;
    }

    setIsBusy(true);
    try {
      const supabase = createSupabaseBrowserClient();

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError || !data.user) {
        // Deliberately vague: distinguishing "no such account" from "wrong
        // password" tells an attacker which emails are real.
        setError(GENERIC_PASSWORD_ERROR);
        return;
      }

      /* Authorization is a separate question from authentication. An account
         that authenticates but is not on the allow-list is signed back out so
         it holds no session at all, and told no more than that. */
      const { data: admin } = await supabase
        .from("admin_users")
        .select("id")
        .eq("id", data.user.id)
        .maybeSingle();

      if (!admin) {
        await supabase.auth.signOut();
        setError(NOT_AN_ADMIN_ERROR);
        return;
      }

      // Full reload semantics: the server must re-read the new session cookie
      // before rendering the dashboard, which router.refresh() arranges.
      router.push(nextPath);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <form className="admin-form" onSubmit={onSubmit} noValidate>
      <label className="admin-field">
        <span className="admin-label">Email</span>
        <input
          className="admin-input"
          type="email"
          name="email"
          autoComplete="username"
          required
          value={email}
          disabled={isBusy}
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>

      <label className="admin-field">
        <span className="admin-label">Password</span>
        <input
          className="admin-input"
          type="password"
          name="password"
          autoComplete="current-password"
          required
          value={password}
          disabled={isBusy}
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>

      {error ? (
        <p className="admin-error" role="alert">
          {error}
        </p>
      ) : null}

      <button className="admin-button" type="submit" disabled={isBusy}>
        {isBusy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
