import { TZDate } from "@date-fns/tz";
import { addDays, addMonths, startOfMonth, startOfYear, addYears, format } from "date-fns";

/**
 * Configuration for the business day cutoff.
 * Change cutoffHour and cutoffMinute only.
 * Supported values are Jakarta local clock values.
 * Do not change individual recap or expense files.
 */
export const BUSINESS_TIME_CONFIG = {
  timeZone: "Asia/Jakarta",
  cutoffHour: 0,
  cutoffMinute: 0,
} as const;

if (BUSINESS_TIME_CONFIG.cutoffHour < 0 || BUSINESS_TIME_CONFIG.cutoffHour > 23) {
  throw new Error("cutoffHour must be an integer from 0 to 23");
}
if (BUSINESS_TIME_CONFIG.cutoffMinute < 0 || BUSINESS_TIME_CONFIG.cutoffMinute > 59) {
  throw new Error("cutoffMinute must be an integer from 0 to 59");
}

export const BUSINESS_TIME_ZONE = BUSINESS_TIME_CONFIG.timeZone;
export const BUSINESS_DAY_CUTOFF_HOUR = BUSINESS_TIME_CONFIG.cutoffHour;
export const BUSINESS_DAY_CUTOFF_MINUTE = BUSINESS_TIME_CONFIG.cutoffMinute;

/**
 * Returns the current date/time exactly in Asia/Jakarta timezone.
 */
export function getJakartaNow(): TZDate {
  return TZDate.tz(BUSINESS_TIME_ZONE);
}

/**
 * Ensures any date/timestamp is correctly interpreted in Asia/Jakarta.
 */
export function fromUTC(date: Date | string | number): TZDate {
  if (typeof date === "string") return TZDate.tz(BUSINESS_TIME_ZONE, date);
  if (typeof date === "number") return TZDate.tz(BUSINESS_TIME_ZONE, date);
  return TZDate.tz(BUSINESS_TIME_ZONE, date);
}

/**
 * Returns the "Business Date" key (YYYY-MM-DD) for a given actual date.
 * If the time is before 00:00 WIB, it belongs to the previous calendar date.
 */
export function getBusinessDateKey(dateInput?: Date | string | number): string {
  const jakartaDate = dateInput ? fromUTC(dateInput) : getJakartaNow();
  const isBeforeCutoff =
    jakartaDate.getHours() < BUSINESS_DAY_CUTOFF_HOUR ||
    (jakartaDate.getHours() === BUSINESS_DAY_CUTOFF_HOUR &&
      jakartaDate.getMinutes() < BUSINESS_DAY_CUTOFF_MINUTE);
  const adjustedDate = isBeforeCutoff
    ? addDays(jakartaDate, -1)
    : jakartaDate;
  
  return format(adjustedDate, "yyyy-MM-dd");
}

/**
 * Parses a YYYY-MM-DD date string (or key) safely as an exact 00:00 WIB day boundary.
 * Useful for building ranges. DO NOT use this for displaying actual transaction times.
 */
export function parseBusinessDateKey(key: string): TZDate {
  return TZDate.tz(BUSINESS_TIME_ZONE, key);
}

/**
 * Retrieves the start and end Date objects for a single business day.
 * Given "2026-07-13" (or a Date that resolves to it):
 * start = 2026-07-13 00:00:00 WIB
 * end = 2026-07-14 00:00:00 WIB
 */
export function getBusinessDayRange(dateOrBusinessDateKey?: Date | string) {
  let baseDate: TZDate;
  if (typeof dateOrBusinessDateKey === "string" && dateOrBusinessDateKey.match(/^\d{4}-\d{2}-\d{2}$/)) {
    baseDate = parseBusinessDateKey(dateOrBusinessDateKey);
  } else {
    const key = getBusinessDateKey(dateOrBusinessDateKey as Date | undefined);
    baseDate = parseBusinessDateKey(key);
  }

  const start = new TZDate(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), BUSINESS_DAY_CUTOFF_HOUR, BUSINESS_DAY_CUTOFF_MINUTE, 0, 0, BUSINESS_TIME_ZONE);
  const end = addDays(start, 1);
  return { start, end };
}

/**
 * Retrieves the start and end Date objects for an entire business month.
 * Start = 1st of month at 00:00 WIB.
 * End = 1st of next month at 00:00 WIB.
 */
export function getBusinessMonthRange(dateOrBusinessDateKey?: Date | string) {
  let baseDate: TZDate;
  if (typeof dateOrBusinessDateKey === "string" && dateOrBusinessDateKey.match(/^\d{4}-\d{2}-\d{2}$/)) {
    baseDate = parseBusinessDateKey(dateOrBusinessDateKey);
  } else {
    const key = getBusinessDateKey(dateOrBusinessDateKey as Date | undefined);
    baseDate = parseBusinessDateKey(key);
  }

  const firstDayOfMonth = startOfMonth(baseDate);
  const start = new TZDate(firstDayOfMonth.getFullYear(), firstDayOfMonth.getMonth(), firstDayOfMonth.getDate(), BUSINESS_DAY_CUTOFF_HOUR, BUSINESS_DAY_CUTOFF_MINUTE, 0, 0, BUSINESS_TIME_ZONE);
  const end = addMonths(start, 1);
  
  return { start, end };
}

/**
 * Retrieves the start and end Date objects for an entire business year.
 */
export function getBusinessYearRange(dateOrBusinessDateKey?: Date | string) {
  let baseDate: TZDate;
  if (typeof dateOrBusinessDateKey === "string" && dateOrBusinessDateKey.match(/^\d{4}-\d{2}-\d{2}$/)) {
    baseDate = parseBusinessDateKey(dateOrBusinessDateKey);
  } else {
    const key = getBusinessDateKey(dateOrBusinessDateKey as Date | undefined);
    baseDate = parseBusinessDateKey(key);
  }

  const firstDayOfYear = startOfYear(baseDate);
  const start = new TZDate(firstDayOfYear.getFullYear(), firstDayOfYear.getMonth(), firstDayOfYear.getDate(), BUSINESS_DAY_CUTOFF_HOUR, BUSINESS_DAY_CUTOFF_MINUTE, 0, 0, BUSINESS_TIME_ZONE);
  const end = addYears(start, 1);
  
  return { start, end };
}

/**
 * Retrieves the start and end for an arbitrary date range.
 * End boundary includes the entire end business day (exclusive).
 */
export function getBusinessDateRange(startBusinessDateKey: string, endBusinessDateKey: string) {
  const { start } = getBusinessDayRange(startBusinessDateKey);
  const { end } = getBusinessDayRange(endBusinessDateKey); // 'end' is exactly the next day 00:00

  // Handle reversed ranges safely
  if (start.getTime() > end.getTime()) {
    const { start: realStart } = getBusinessDayRange(endBusinessDateKey);
    const { end: realEnd } = getBusinessDayRange(startBusinessDateKey);
    return { start: realStart, end: realEnd };
  }

  return { start, end };
}

/**
 * Helper to display dates formatted specifically in Jakarta Timezone.
 * Example: "13 Jul 2026"
 */
export function formatJakartaDate(timestamp: Date | string | number | null): string {
  if (!timestamp) return "Tanpa tanggal";
  const date = fromUTC(timestamp);
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: BUSINESS_TIME_ZONE,
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

/**
 * Helper to display date and times formatted specifically in Jakarta Timezone.
 * Example: "13 Jul 2026, 03.30 WIB"
 */
export function formatJakartaDateTime(timestamp: Date | string | number | null): string {
  if (!timestamp) return "Tanpa tanggal";
  const date = fromUTC(timestamp);
  const formatted = new Intl.DateTimeFormat("id-ID", {
    timeZone: BUSINESS_TIME_ZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
  
  return `${formatted} WIB`;
}

/**
 * Calculates milliseconds until the next 00:00 WIB boundary.
 */
export function getMsUntilNextBusinessDay(): number {
  const now = getJakartaNow();
  let nextRollover = new TZDate(now.getFullYear(), now.getMonth(), now.getDate(), BUSINESS_DAY_CUTOFF_HOUR, BUSINESS_DAY_CUTOFF_MINUTE, 0, 0, BUSINESS_TIME_ZONE);
  
  if (now.getTime() >= nextRollover.getTime()) {
    nextRollover = addDays(nextRollover, 1);
  }
  
  return nextRollover.getTime() - now.getTime();
}
