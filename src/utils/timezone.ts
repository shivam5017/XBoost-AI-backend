import { Request } from "express";

function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function readTimezone(input?: string | null): string {
  const value = String(input || "").trim();
  if (!value) return "UTC";
  return isValidTimeZone(value) ? value : "UTC";
}

export function readTimezoneFromRequest(req: Request): string {
  const header = req.headers["x-timezone"];
  const raw = Array.isArray(header) ? header[0] : header;
  return readTimezone(raw);
}

function formatDateParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = Number(parts.find((p) => p.type === "year")?.value || "1970");
  const month = Number(parts.find((p) => p.type === "month")?.value || "01");
  const day = Number(parts.find((p) => p.type === "day")?.value || "01");
  return { year, month, day };
}

export function startOfDayUtcForTimezone(date: Date, timeZone: string): Date {
  const tz = readTimezone(timeZone);
  const { year, month, day } = formatDateParts(date, tz);
  const approx = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));

  const hourInTz = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "2-digit",
      hourCycle: "h23",
    }).format(approx),
  );

  const minuteInTz = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      minute: "2-digit",
    }).format(approx),
  );

  const secondInTz = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      second: "2-digit",
    }).format(approx),
  );

  const offsetMs = ((hourInTz * 60 + minuteInTz) * 60 + secondInTz) * 1000;
  return new Date(approx.getTime() - offsetMs);
}

export function dayRangeUtcForTimezone(date: Date, timeZone: string) {
  const start = startOfDayUtcForTimezone(date, timeZone);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

