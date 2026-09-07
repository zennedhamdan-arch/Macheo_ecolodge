"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { lodgeToday } from "@/lib/time";
import Turnstile from "./Turnstile";
import styles from "./ReservationForm.module.css";

/**
 * The Macheo stay request form.
 *
 * A submission is a REQUEST, not a confirmed booking and never a payment —
 * the copy says so and the success screen says so. It posts to
 * /api/reservations, which verifies the anti-bot token server-side and then
 * inserts through the anon key, so Row Level Security applies: the guest may
 * create a row and may not choose its status, read other rows, or write
 * staff notes.
 *
 * Validation happens three times, on purpose:
 *   1. in the UI (min attributes, steppers) — good UX,
 *   2. here on submit — because attribute limits are advisory,
 *   3. in Postgres (RLS refuses past dates) — because none of the above is
 *      trustworthy. The messages below just say it more politely.
 */

type Status = "idle" | "submitting" | "done" | "error";

type Option = Readonly<{ value: string; label: string }>;

type Props = Readonly<{
  /** Published accommodation names (rooms), for the preference select. */
  accommodationOptions: readonly Option[];
  /** Published camping option names. */
  campingOptions: readonly Option[];
  /** Published experience titles. */
  experienceOptions: readonly Option[];
  /** Public Turnstile site key, supplied by the server page. Empty = not configured. */
  turnstileSiteKey: string;
}>;

/** Accessible [-] n [+] stepper that never goes below its minimum. */
function Stepper({
  id,
  label,
  value,
  min,
  max,
  onChange,
  disabled,
}: Readonly<{
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (next: number) => void;
  disabled: boolean;
}>): React.JSX.Element {
  return (
    <div className={styles.stepperField}>
      <span className={styles.label} id={`${id}-label`}>
        {label}
      </span>
      <div
        className={styles.stepper}
        role="group"
        aria-labelledby={`${id}-label`}
      >
        <button
          type="button"
          className={styles.stepperBtn}
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={disabled || value <= min}
          aria-label={`Decrease ${label.toLowerCase()}`}
        >
          −
        </button>
        <output className={styles.stepperValue} aria-live="polite">
          {value}
          <span className="visuallyHidden"> {label.toLowerCase()}</span>
        </output>
        <button
          type="button"
          className={styles.stepperBtn}
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={disabled || value >= max}
          aria-label={`Increase ${label.toLowerCase()}`}
        >
          +
        </button>
      </div>
    </div>
  );
}

export default function ReservationForm({
  accommodationOptions,
  campingOptions,
  experienceOptions,
  turnstileSiteKey: siteKey,
}: Props): React.JSX.Element {
  const searchParams = useSearchParams();

  const prefillStay = searchParams.get("stay") ?? "";
  const prefillExperience = searchParams.get("experience") ?? "";
  const prefillInterest = searchParams.get("interest") ?? "";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [accommodation, setAccommodation] = useState(
    accommodationOptions.some((o) => o.value === prefillStay) ? prefillStay : "",
  );
  const [camping, setCamping] = useState(
    prefillInterest === "camping" && campingOptions.length > 0
      ? campingOptions[0]?.value ?? ""
      : "",
  );
  const [experience, setExperience] = useState(
    experienceOptions.some((o) => o.value === prefillExperience) ? prefillExperience : "",
  );
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [referenceCode, setReferenceCode] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  /* All dates on this form are LODGE-local (Africa/Kigali): "today" is today
     AT MACHEO, no matter where the guest's browser is. */
  const today = lodgeToday();

  /* Check-out can never be before the night after check-in. */
  const minCheckOut = useMemo(() => {
    if (!checkIn) return today;
    const parsed = new Date(`${checkIn}T12:00:00`);
    parsed.setDate(parsed.getDate() + 1);
    return parsed.toISOString().slice(0, 10);
  }, [checkIn, today]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (status === "submitting") return;

    setErrorMessage(null);

    if (name.trim().length < 2) {
      setErrorMessage("Please tell us your name.");
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      setErrorMessage("Please give a valid email address so we can confirm your request.");
      return;
    }
    if (phone.trim().length < 6 || phone.trim().length > 40) {
      setErrorMessage("Please give a phone number we can reach you on.");
      return;
    }
    if (!checkIn) {
      setErrorMessage("Please choose a check-in date.");
      return;
    }
    if (checkIn < today) {
      setErrorMessage("Check-in can't be in the past — please choose today or a later date.");
      return;
    }
    if (!checkOut) {
      setErrorMessage("Please choose a check-out date.");
      return;
    }
    if (checkOut <= checkIn) {
      setErrorMessage("Check-out must be after check-in.");
      return;
    }

    setStatus("submitting");

    try {
      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          check_in: checkIn,
          check_out: checkOut,
          adults,
          children,
          accommodation_pref: accommodation || undefined,
          camping_pref: camping || undefined,
          experience_interest: experience || undefined,
          notes: notes.trim() || undefined,
          turnstileToken: turnstileToken ?? undefined,
        }),
      });

      const outcome = (await response.json()) as {
        ok?: boolean;
        reference?: string;
        error?: string;
      };

      if (!response.ok || !outcome.ok) {
        throw new Error(outcome.error ?? "Something went wrong.");
      }

      setReferenceCode(outcome.reference ?? null);
      setStatus("done");
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "The request could not be sent. Please try again, or contact us.",
      );
    }
  }

  if (status === "done") {
    return (
      <div className={styles.success} role="status">
        <h2 className={styles.successTitle}>Request received — thank you.</h2>
        <p className={styles.successBody}>
          This is a reservation <strong>request</strong>, not a confirmed
          booking yet — and no payment has been taken. Our team will review it
          and confirm with you, usually by phone or WhatsApp.
        </p>
        {referenceCode ? (
          <p className={styles.reference}>
            Your reference: <strong>{referenceCode}</strong>
          </p>
        ) : null}
        <h3 className={styles.nextTitle}>What happens next</h3>
        <ol className={styles.nextSteps}>
          <li>We check availability for your dates.</li>
          <li>We contact you to confirm the details.</li>
          <li>Only then is your stay confirmed — nothing is charged online.</li>
        </ol>
      </div>
    );
  }

  const busy = status === "submitting";

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      {/* ------------------------------------------------ guest details */}
      <fieldset className={styles.group} disabled={busy}>
        <legend className={styles.groupTitle}>Your details</legend>

        <div className={styles.row}>
          <label className={styles.field}>
            <span className={styles.label}>Full name *</span>
            <input
              type="text"
              name="name"
              autoComplete="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
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
              className={styles.input}
            />
          </label>
        </div>

        <label className={styles.field}>
          <span className={styles.label}>Phone *</span>
          <input
            type="tel"
            name="phone"
            autoComplete="tel"
            required
            placeholder="+250 …"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={styles.input}
          />
        </label>
      </fieldset>

      {/* ------------------------------------------------------- dates */}
      <fieldset className={styles.group} disabled={busy}>
        <legend className={styles.groupTitle}>Your stay</legend>

        <div className={styles.row}>
          <label className={styles.field}>
            <span className={styles.label}>Check-in *</span>
            <input
              type="date"
              name="check-in"
              required
              min={today}
              value={checkIn}
              onChange={(e) => {
                setCheckIn(e.target.value);
                if (checkOut && e.target.value && checkOut <= e.target.value) {
                  setCheckOut("");
                }
              }}
              className={styles.input}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Check-out *</span>
            <input
              type="date"
              name="check-out"
              required
              min={minCheckOut}
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              className={styles.input}
            />
          </label>
        </div>

        <div className={styles.row}>
          <Stepper
            id="adults"
            label="Adults"
            value={adults}
            min={1}
            max={30}
            onChange={setAdults}
            disabled={busy}
          />
          <Stepper
            id="children"
            label="Children"
            value={children}
            min={0}
            max={30}
            onChange={setChildren}
            disabled={busy}
          />
        </div>
      </fieldset>

      {/* ------------------------------------------------ preferences */}
      <fieldset className={styles.group} disabled={busy}>
        <legend className={styles.groupTitle}>Preferences (optional)</legend>

        <label className={styles.field}>
          <span className={styles.label}>Accommodation preference</span>
          <select
            name="accommodation"
            value={accommodation}
            onChange={(e) => setAccommodation(e.target.value)}
            className={styles.input}
          >
            <option value="">No preference — recommend something</option>
            {accommodationOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {campingOptions.length > 0 ? (
          <label className={styles.field}>
            <span className={styles.label}>Camping preference</span>
            <select
              name="camping"
              value={camping}
              onChange={(e) => setCamping(e.target.value)}
              className={styles.input}
            >
              <option value="">Not camping / no preference</option>
              {campingOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {experienceOptions.length > 0 ? (
          <label className={styles.field}>
            <span className={styles.label}>Experience interest</span>
            <select
              name="experience"
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              className={styles.input}
            >
              <option value="">No experience planned yet</option>
              {experienceOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label className={styles.field}>
          <span className={styles.label}>Special request</span>
          <textarea
            name="notes"
            rows={4}
            maxLength={1000}
            placeholder="Dietary needs, arrival time, celebrations, questions…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={styles.textarea}
          />
        </label>
      </fieldset>

      {/* The anti-bot widget renders only when a site key is configured;
          without one the form submits normally (the API skips the token
          check) and nothing here needs to warn the guest. */}
      {siteKey ? <Turnstile siteKey={siteKey} onToken={setTurnstileToken} /> : null}

      {errorMessage ? (
        <p className={styles.error} role="alert">
          {errorMessage}
        </p>
      ) : null}

      <div className={styles.submitRow}>
        <button type="submit" className={styles.submit} disabled={busy}>
          {busy ? "Sending request…" : "Send reservation request"}
        </button>
        <p className={styles.finePrint}>
          This sends a request — nothing is paid online. We confirm every stay
          personally.
        </p>
      </div>
    </form>
  );
}
