"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readTimezone = readTimezone;
exports.readTimezoneFromRequest = readTimezoneFromRequest;
exports.startOfDayUtcForTimezone = startOfDayUtcForTimezone;
exports.dayRangeUtcForTimezone = dayRangeUtcForTimezone;
function isValidTimeZone(tz) {
    try {
        new Intl.DateTimeFormat("en-US", { timeZone: tz });
        return true;
    }
    catch {
        return false;
    }
}
function readTimezone(input) {
    const value = String(input || "").trim();
    if (!value)
        return "UTC";
    return isValidTimeZone(value) ? value : "UTC";
}
function readTimezoneFromRequest(req) {
    const header = req.headers["x-timezone"];
    const raw = Array.isArray(header) ? header[0] : header;
    return readTimezone(raw);
}
function formatDateParts(date, timeZone) {
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
function startOfDayUtcForTimezone(date, timeZone) {
    const tz = readTimezone(timeZone);
    const { year, month, day } = formatDateParts(date, tz);
    const approx = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
    const hourInTz = Number(new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        hour: "2-digit",
        hourCycle: "h23",
    }).format(approx));
    const minuteInTz = Number(new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        minute: "2-digit",
    }).format(approx));
    const secondInTz = Number(new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        second: "2-digit",
    }).format(approx));
    const offsetMs = ((hourInTz * 60 + minuteInTz) * 60 + secondInTz) * 1000;
    return new Date(approx.getTime() - offsetMs);
}
function dayRangeUtcForTimezone(date, timeZone) {
    const start = startOfDayUtcForTimezone(date, timeZone);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    return { start, end };
}
