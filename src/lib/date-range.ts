export const JAKARTA_TIME_ZONE = "Asia/Jakarta";

const JAKARTA_OFFSET_HOURS = 7;
const JAKARTA_OFFSET_MS = JAKARTA_OFFSET_HOURS * 60 * 60 * 1000;

function getJakartaShiftedDate(date: Date) {
  return new Date(date.getTime() + JAKARTA_OFFSET_MS);
}

function getJakartaDateParts(date: Date) {
  const shiftedDate = getJakartaShiftedDate(date);

  return {
    year: shiftedDate.getUTCFullYear(),
    month: shiftedDate.getUTCMonth() + 1,
    day: shiftedDate.getUTCDate(),
    hour: shiftedDate.getUTCHours(),
  };
}

function createJakartaDate(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
  millisecond = 0
) {
  return new Date(
    Date.UTC(
      year,
      month - 1,
      day,
      hour - JAKARTA_OFFSET_HOURS,
      minute,
      second,
      millisecond
    )
  );
}

export const formatDateForInput = (date: Date) => {
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const { year, month, day } = getJakartaDateParts(date);

  return `${year}-${`${month}`.padStart(2, "0")}-${`${day}`.padStart(2, "0")}`;
};

export function parseDateInput(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsedDate = createJakartaDate(year, month, day);
  const parsedParts = getJakartaDateParts(parsedDate);

  if (
    parsedParts.year !== year ||
    parsedParts.month !== month ||
    parsedParts.day !== day
  ) {
    return null;
  }

  return parsedDate;
}

export function normalizeCurrencyInput(value: string) {
  return value.replace(/[^\d]/g, "");
}

export function parseCurrencyInput(value: string) {
  const normalizedValue = normalizeCurrencyInput(value);

  return normalizedValue ? Number(normalizedValue) : 0;
}

export const formatCurrency = (value: number) =>
  `Rp ${value.toLocaleString("id-ID")}`;

export function formatCurrencyInput(value: string | number | null | undefined) {
  if (value === null || value === undefined) {
    return "";
  }

  const normalizedValue =
    typeof value === "number"
      ? Number.isFinite(value)
        ? `${Math.max(0, Math.trunc(value))}`
        : ""
      : normalizeCurrencyInput(value);

  return normalizedValue ? formatCurrency(Number(normalizedValue)) : "";
}

export function getBusinessDayRange(date: Date) {
  const shiftedDate = new Date(date.getTime() - 4 * 60 * 60 * 1000);
  const { year, month, day } = getJakartaDateParts(shiftedDate);
  const start = createJakartaDate(year, month, day, 4, 0, 0, 0);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  return { start, end };
}

export function getMonthRange(date: Date) {
  const { year, month } = getJakartaDateParts(date);
  const start = createJakartaDate(year, month, 1, 0, 0, 0, 0);
  const end =
    month === 12
      ? createJakartaDate(year + 1, 1, 1, 0, 0, 0, 0)
      : createJakartaDate(year, month + 1, 1, 0, 0, 0, 0);

  return { start, end };
}

export function getYearRange(date: Date) {
  const { year } = getJakartaDateParts(date);
  const start = createJakartaDate(year, 1, 1, 0, 0, 0, 0);
  const end = createJakartaDate(year + 1, 1, 1, 0, 0, 0, 0);

  return { start, end };
}

export function getCalendarRange(fromDate: Date, toDate: Date) {
  const startParts = getJakartaDateParts(fromDate);
  const endParts = getJakartaDateParts(toDate);
  const start = createJakartaDate(
    startParts.year,
    startParts.month,
    startParts.day,
    0,
    0,
    0,
    0
  );
  const end = createJakartaDate(
    endParts.year,
    endParts.month,
    endParts.day + 1,
    0,
    0,
    0,
    0
  );

  return { start, end };
}