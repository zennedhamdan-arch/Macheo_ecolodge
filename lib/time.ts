/**
 * Lodge-timezone helpers.
 *
 * THE RULE: a guest picking "19:00" on the website is picking 19:00 AT THE
 * LODGE, in Musanze — regardless of where the guest's browser is. A
 * visitor in New York choosing 19:00 must be stored as 17:00Z (19:00 in
 * Africa/Kigali), not as 19:00 New York (= 23:00Z, which is 01:00 the next
 * day in Musanze and would send a chef hunting for a midnight table).
 *
 * The conversion uses the Intl API to ask for Africa/Kigali's UTC offset at
 * the relevant instant — proper timezone-aware conversion, not fixed-hour
 * arithmetic. Rwanda runs CAT (UTC+02:00) with no DST, but the two-pass
 * implementation below would remain correct even if that ever changed.
 *
 * No dependencies; safe on the server and in the browser.
 */

/** IANA zone the lodge operates in. Single source of truth. */
export const LODGE_TIME_ZONE = "Africa/Kigali";

/**
 * Converts a wall-clock date + time IN THE LODGE'S TIMEZONE to a UTC ISO
 * string (what timestamptz columns store).
 *
 * Two-pass, DST-safe: guess with the naive instant, read the zone's real
 * offset there, convert, then re-read the offset at the refined instant and
 * convert once more. For a no-DST zone like Kigali the second pass changes
 * nothing; it is what makes this correct in general.
 */
export function lodgeLocalToUtcIso(
  localDate: string,
  localTime: string,
): string {
  const [year, month, day] = localDate.split("-").map(Number);
  const [hours, minutes] = localTime.split(":").map(Number);
  if (
    !year || !month || !day ||
    hours === undefined || minutes === undefined ||
    Number.isNaN(hours) || Number.isNaN(minutes)
  ) {
    throw new Error("Invalid lodge-local date/time");
  }

  // Step 1: pretend the wall clock is UTC and find the zone's offset there.
  const naive = Date.UTC(year, month - 1, day, hours, minutes, 0, 0);
  let offsetMs = zoneOffsetMs(naive);

  // Step 2: apply that offset, then re-check the offset at the better
  // estimate (handles the boundary hour of a DST shift).
  const refined = naive - offsetMs;
  offsetMs = zoneOffsetMs(refined);

  return new Date(naive - offsetMs).toISOString();
}

/** The zone's UTC offset (ms) at the given epoch, via Intl — no fixed math. */
function zoneOffsetMs(epochMs: number): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: LODGE_TIME_ZONE,
    timeZoneName: "longOffset",
  });

  const part = formatter
    .formatToParts(new Date(epochMs))
    .find((p) => p.type === "timeZoneName");
  const label = part?.value ?? "GMT+00:00";

  // "GMT+02:00" / "GMT-05:30" / "GMT" (means +00:00).
  const match = /GMT([+-])(\d{2}):(\d{2})/.exec(label);
  if (!match) return 0;
  const sign = match[1] === "-" ? -1 : 1;
  const hours = Number(match[2]);
  const minutes = Number(match[3]);
  return sign * (hours * 60 + minutes) * 60 * 1000;
}

/** Today's calendar date (YYYY-MM-DD) AT THE LODGE — not the viewer's. */
export function lodgeToday(): string {
  // en-CA with numeric parts is specified as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: LODGE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Current epoch milliseconds shifted forward by the zone offset, for
 * "is this lodge-local datetime in the past?" checks. */
export function lodgeNowEpochMs(): number {
  return Date.now() + zoneOffsetMs(Date.now());
}

/**
 * Formats a stored UTC ISO string AS LODGE-LOCAL time, so staff always
 * read the same wall-clock the guest chose — no matter where the admin's
 * browser sits.
 */
export function formatLodgeDateTime(
  iso: string,
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeStyle: "short" },
): string {
  return formatInLodgeZone(iso, options);
}

function formatInLodgeZone(
  iso: string,
  options: Intl.DateTimeFormatOptions,
): string {
  // en-CA yields YYYY-MM-DD for date-only options; otherwise en-GB shapes.
  const locale = options.dateStyle && !options.timeStyle ? "en-CA" : "en-GB";
  return new Intl.DateTimeFormat(locale, {
    ...options,
    timeZone: LODGE_TIME_ZONE,
  }).format(new Date(iso));
}

/**
 * True when a lodge-local date + time is already in the past at the
 * lodge. Used to re-check at submit time: the picker constrains, this
 * decides.
 */
export function lodgeLocalIsPast(localDate: string, localTime: string): boolean {
  const [year, month, day] = localDate.split("-").map(Number);
  const [hours, minutes] = localTime.split(":").map(Number);
  if (!year || !month || !day || hours === undefined || minutes === undefined) {
    return true; // unparseable is not bookable
  }
  const asUtc = Date.UTC(year, month - 1, day, hours, minutes);
  return asUtc <= lodgeNowEpochMs();
}
