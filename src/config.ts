export const site = {
  name: "Sip & Nest",
  legalName: "Sip and Nest",
  city: "Holly Springs",
  neighborhood: "Holly Springs",
  address: "112 Hartness Dr, Holly Springs, NC",
  phone: "(919) 555-0148",
  email: "hello@sipandnest.com",
  hours: "Tuesday–Sunday, 7:30am–4pm",
  hoursNote: "Closed Monday",
  hoursShort: "Tue–Sun 7:30am–4pm",
  pickupCopy:
    "Pay at pickup — no online payment. We'll have it on the counter under your name. Closed Mondays.",
  owner: "Sai Reddy",
  domain: "sipandnest.com",
} as const;

export const ORDER_NUMBER_OFFSET = 1041;

export const pickupSlots = [
  "7:30am",
  "8:00am",
  "8:30am",
  "9:00am",
  "9:30am",
  "10:00am",
  "10:30am",
  "11:00am",
  "11:30am",
  "12:00pm",
  "12:30pm",
  "1:00pm",
  "1:30pm",
  "2:00pm",
  "2:30pm",
  "3:00pm",
  "3:30pm",
] as const;

/** Sunday = 0. The bar is shut on Mondays. */
export const CLOSED_WEEKDAY = 1;
export const OPEN_MINUTES = 7 * 60 + 30;
export const CLOSE_MINUTES = 16 * 60;
export const TIMEZONE = "America/New_York";

export type PickupDay = { value: string; label: string; isToday: boolean };

/** The cafe's own wall clock, whatever timezone the visitor or the edge is in. */
export function cafeNow(now: Date = new Date()): {
  weekday: number;
  minutes: number;
  parts: Record<string, string>;
} {
  const parts: Record<string, string> = {};
  for (const part of new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now)) {
    parts[part.type] = part.value;
  }
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(parts.weekday ?? "");
  const hour = Number(parts.hour) % 24;
  return { weekday, minutes: hour * 60 + Number(parts.minute), parts };
}

function dayLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(date);
}

/**
 * The next few days the bar is actually open, as absolute labels. Mondays never
 * appear, and today drops off once the last pickup slot has passed — so the
 * form cannot book a pickup on a closed day or a time that has already gone.
 */
export function pickupDays(now: Date = new Date(), count = 4): PickupDay[] {
  const { weekday, minutes } = cafeNow(now);
  const lastSlot = slotMinutes(pickupSlots[pickupSlots.length - 1]) ?? CLOSE_MINUTES;
  const days: PickupDay[] = [];
  for (let offset = 0; days.length < count && offset < 14; offset++) {
    const date = new Date(now.getTime() + offset * 86_400_000);
    const day = (weekday + offset) % 7;
    if (day === CLOSED_WEEKDAY) continue;
    if (offset === 0 && minutes >= lastSlot) continue;
    const value = dayLabel(date);
    days.push({ value, label: offset === 0 ? `Today — ${value}` : value, isToday: offset === 0 });
  }
  return days;
}

/** "9:30am" -> 570. Null if it is not one of our slot strings. */
export function slotMinutes(slot: string): number | null {
  const match = /^(\d{1,2}):(\d{2})(am|pm)$/.exec(slot.trim());
  if (!match) return null;
  let hour = Number(match[1]) % 12;
  if (match[3] === "pm") hour += 12;
  return hour * 60 + Number(match[2]);
}

/** Reject a pickup the bar cannot honour: closed day, unknown slot, time gone by. */
export function isPickupBookable(pickupAt: string, now: Date = new Date()): boolean {
  const [day, slot] = pickupAt.split(" · ");
  if (!day || !slot) return false;
  const match = pickupDays(now).find((d) => d.value === day.trim());
  if (!match) return false;
  const minutes = slotMinutes(slot);
  if (minutes === null || !pickupSlots.includes(slot.trim() as (typeof pickupSlots)[number])) return false;
  return !match.isToday || minutes >= cafeNow(now).minutes;
}
