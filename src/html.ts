import { pickupDays, pickupSlots, site } from "./config";
import {
  formatCents,
  parseSizes,
  type CoffeeType,
  type OrderLine,
  type OrderRow,
} from "./db";

export function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
