import { env, exports } from "cloudflare:workers";
import { site } from "../src/config";
import { describe, expect, it } from "vitest";
import { CLOSE_MINUTES, OPEN_MINUTES, isPickupBookable, pickupDays, slotMinutes } from "../src/config";

/** A day and time the bar can actually honour right now. */
function bookablePickup(): string {
  const days = pickupDays();
  const day = days.find((d) => !d.isToday) ?? days[0];
  return `${day.value} \u00b7 3:30pm`;
}

const worker = exports.default;
const ORIGIN = "https://sipandnest.com";

async function get(path: string, init?: RequestInit): Promise<Response> {
  return worker.fetch(new Request(ORIGIN + path, init));
}

async function html(path: string): Promise<string> {
  const response = await get(path);
  expect(response.status).toBe(200);
  return response.text();
}

/** Pull the raw text out of a <script id="..."> block, exactly as a browser would see it. */
function scriptText(page: string, id: string): string {
  const match = new RegExp(`<script[^>]*id="${id}"[^>]*>([\\s\\S]*?)</script>`).exec(page);
  expect(match, `no script#${id} in page`).not.toBeNull();
  return match![1];
}

describe("pickup days survive the calendar", () => {
  it("never offers a Monday and never drops an open day", () => {
    const instants: number[] = [];
    // the year sampled every six hours, so every late evening is covered
    for (let t = Date.UTC(2026, 0, 1); t < Date.UTC(2027, 0, 1); t += 6 * 3_600_000) instants.push(t);
    // plus both daylight-saving weekends, hour by hour
    for (const start of [Date.UTC(2026, 2, 6), Date.UTC(2026, 9, 30)]) {
      for (let t = start; t < start + 4 * 86_400_000; t += 3_600_000) instants.push(t);
    }
    const offenders: string[] = [];
    for (const t of instants) {
      const days = pickupDays(new Date(t));
      if (days.some((d) => d.value.startsWith("Mon")) || days.length !== 4) {
        offenders.push(`${new Date(t).toISOString()} -> ${days.map((d) => d.value).join(", ")}`);
      }
    }
    expect(offenders.slice(0, 5)).toEqual([]);
  }, 30_000);

  it("offers today itself just after midnight on an open day", () => {
    // 12:30am ET on Sunday 1 Nov 2026, the hour the clocks go back
    const days = pickupDays(new Date("2026-11-01T04:30:00Z"));
    expect(days[0].isToday).toBe(true);
    expect(days[0].value).toBe("Sun, Nov 1");
    expect(days[1].value).toBe("Tue, Nov 3");
  });

  it("rolls to the next open day late on a Saturday evening", () => {
    const days = pickupDays(new Date("2026-03-08T04:30:00Z")); // 11:30pm ET Saturday
    expect(days[0].value).toBe("Sun, Mar 8");
    expect(days.some((d) => d.value.startsWith("Mon"))).toBe(false);
  });
});

describe("receipts are a record, not a re-derivation", () => {
  it("keeps its line items and total after the drink leaves the menu", async () => {
    const created = await get("/api/order", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Archive Test",
        contact: "archive@example.com",
        pickup_at: bookablePickup(),
        items: [{ slug: "dirty-chai", size: "12oz", qty: 2 }],
      }),
    });
    const { number, token } = await created.json<{ number: string; token: string }>();

    const before = await html(`/order/thanks?n=${number}&t=${token}`);
    expect(before).toContain("Dirty Chai");
    expect(before).toContain("$12.40");


    // a seasonal menu edit must not rewrite a receipt that already went out
    await env.DB.prepare("UPDATE coffee_types SET name = ? WHERE slug = ?")
      .bind("Winter Chai", "dirty-chai")
      .run();
    try {
      const after = await html(`/order/thanks?n=${number}&t=${token}`);
      expect(after).toContain("Dirty Chai");
      expect(after).not.toContain("Winter Chai");
      expect(after).toContain("$12.40");
    } finally {
      await env.DB.prepare("UPDATE coffee_types SET name = ? WHERE slug = ?")
        .bind("Dirty Chai", "dirty-chai")
        .run();
    }
  });
});
