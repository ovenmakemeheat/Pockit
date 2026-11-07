const MONEY_INPUT = /^(\d+)(?:\.(\d{1,2}))?$/;
const CALENDAR_DATE_INPUT = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Parse a positive THB decimal string into exact satang. */
export function parseMoneyToMinorUnits(value: string): bigint {
  const match = MONEY_INPUT.exec(value);
  if (!match) {
    throw new TypeError(
      "Amount must be a decimal string with at most 2 fractional digits",
    );
  }

  const wholeUnits = BigInt(match[1] ?? "0");
  const fractionalUnits = BigInt((match[2] ?? "").padEnd(2, "0") || "0");
  const minorUnits = wholeUnits * 100n + fractionalUnits;
  if (minorUnits <= 0n) {
    throw new RangeError("Amount must be greater than zero");
  }

  return minorUnits;
}

/** Format an exact non-negative satang value as a canonical THB string. */
export function formatMinorUnits(value: bigint): string {
  if (value < 0n) {
    throw new RangeError("Minor-unit amount cannot be negative");
  }

  const wholeUnits = value / 100n;
  const fractionalUnits = (value % 100n).toString().padStart(2, "0");
  return `${wholeUnits}.${fractionalUnits}`;
}

/** Parse a valid YYYY-MM-DD civil date as UTC midnight for PostgreSQL DATE. */
export function parseCalendarDate(value: string): Date {
  const match = CALENDAR_DATE_INPUT.exec(value);
  if (!match) {
    throw new TypeError("Date must use YYYY-MM-DD format");
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1 || month < 1 || month > 12) {
    throw new RangeError("Date is not a valid calendar date");
  }

  const isLeapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth =
    [31, isLeapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][
      month - 1
    ] ?? 0;
  if (day < 1 || day > daysInMonth) {
    throw new RangeError("Date is not a valid calendar date");
  }

  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, day);
  return date;
}

/** Return the date portion of a UTC-midnight date without timezone conversion. */
export function formatCalendarDate(value: Date): string {
  if (!Number.isFinite(value.getTime())) {
    throw new RangeError("Date is invalid");
  }
  return value.toISOString().slice(0, 10);
}
