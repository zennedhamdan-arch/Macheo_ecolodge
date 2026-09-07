"use client";

import { useState } from "react";

import Turnstile from "./Turnstile";
import styles from "./ContactForm.module.css";

/**
 * The public contact form.
 *
 * Posts to /api/contact, which verifies the anti-bot token server-side and
 * inserts the message into `contact_messages` through the anon key — RLS
 * makes that table write-only for the public, so a message can be sent but
 * never read back by anyone who shouldn't see it.
 */
type Status = "idle" | "submitting" | "done" | "error";

export default function ContactForm({
  turnstileSiteKey,
}: Readonly<{ turnstileSiteKey: string }>): React.JSX.Element {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (status === "submitting") return;

    setErrorMessage(null);

    if (name.trim().length < 2) {
      setErrorMessage("Please tell us your name.");
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      setErrorMessage("Please give a valid email address so we can reply.");
      return;
    }
    if (message.trim().length < 5) {
      setErrorMessage("Please write a short message.");
      return;
    }

    setStatus("submitting");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          subject: subject.trim() || undefined,
          message: message.trim(),
          turnstileToken: turnstileToken ?? undefined,
        }),
      });

      const outcome = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok || !outcome.ok) {
        throw new Error(outcome.error ?? "Something went wrong.");
      }

      setStatus("done");
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "The message could not be sent. Please try again, or reach us by phone.",
      );
    }
  }

  if (status === "done") {
    return (
      <div className={styles.success} role="status">
        <h2 className={styles.successTitle}>Thank you — message sent.</h2>
        <p className={styles.successBody}>
          We have received your message and will get back to you as soon as we
          can. If it is urgent, call or WhatsApp us — the number is on this
          page.
        </p>
      </div>
    );
  }

  const busy = status === "submitting";

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      <div className={styles.row}>
        <label className={styles.field}>
          <span className={styles.label}>Name *</span>
          <input
            type="text"
            name="name"
            autoComplete="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={busy}
            className={styles.input}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Email *</span>
          <input
            type="email"
            name="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={busy}
            className={styles.input}
          />
        </label>
      </div>

      <div className={styles.row}>
        <label className={styles.field}>
          <span className={styles.label}>Phone (optional)</span>
          <input
            type="tel"
            name="phone"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={busy}
            className={styles.input}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Subject (optional)</span>
          <input
            type="text"
            name="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            disabled={busy}
            maxLength={160}
            className={styles.input}
          />
        </label>
      </div>

      <label className={styles.field}>
        <span className={styles.label}>Message *</span>
        <textarea
          name="message"
          required
          rows={6}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={busy}
          maxLength={3000}
          className={styles.textarea}
        />
      </label>

      {/* As on the reservation form: optional, and invisible when unused. */}
      {turnstileSiteKey ? (
        <Turnstile siteKey={turnstileSiteKey} onToken={setTurnstileToken} />
      ) : null}

      {errorMessage ? (
        <p className={styles.error} role="alert">
          {errorMessage}
        </p>
      ) : null}

      <button type="submit" className={styles.submit} disabled={busy}>
        {busy ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
