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

describe("sold out items", () => {
  it("shows a sold-out flag and no add control", async () => {
    await env.DB.prepare("UPDATE coffee_types SET available = 0 WHERE slug = ?").bind("affogato").run();
    try {
      const page = await html("/menu");
      expect(page).toContain("Sold out today");
      expect(page).not.toContain('data-add="affogato"');
      // and it must not be orderable through the API either
      const attempt = await get("/api/order", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "Test",
          contact: "test@example.com",
          pickup_at: bookablePickup(),
          items: [{ slug: "affogato", size: "one", qty: 1 }],
        }),
      });
      expect(attempt.status).toBe(400);
    } finally {
      await env.DB.prepare("UPDATE coffee_types SET available = 1 WHERE slug = ?").bind("affogato").run();
    }
  });
});

describe("brand mark", () => {
  it("serves the current mark from one source, not a stale asset", async () => {
    const response = await get("/mark.svg");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("image/svg+xml");
    const svg = await response.text();
    // the coupe glass, not the old nest illustration
    expect(svg).toContain("<svg");
    expect(svg).toContain("viewBox=\"0 0 64 64\"");
    // the coupe, not the old nest illustration
    expect(svg).toContain("ellipse");
    expect(svg).not.toContain("#8b3a2a");
    expect(await (await get("/favicon.svg")).text()).toBe(svg);
  });
});

describe("receipts are not walkable", () => {
  it("refuses another customer's order number without its token", async () => {
    const created = await get("/api/order", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Wendy Alcott",
        contact: "wendy@example.com",
        pickup_at: bookablePickup(),
        notes: "leave it with the barista",
        items: [{ slug: "espresso-tonic", size: "12oz", qty: 1 }],
      }),
    });
    const { number, token } = await created.json<{ number: string; token: string }>();
    expect(token).toMatch(/^[0-9a-f]{32}$/);

    // the number alone is guessable, so it must not be enough
    expect((await get(`/order/thanks?n=${encodeURIComponent(number)}`)).status).toBe(404);
    expect((await get(`/order/thanks?n=${encodeURIComponent(number)}&t=wrong`)).status).toBe(404);

    const ok = await get(`/order/thanks?n=${encodeURIComponent(number)}&t=${token}`);
    expect(ok.status).toBe(200);
    expect(await ok.text()).toContain("Wendy");
  });

  it("refuses a token-less row rather than grandfathering it in", async () => {
    await env.DB.prepare(
      "INSERT INTO orders (number, name, contact, pickup_at, notes, status) VALUES (?, ?, ?, ?, ?, 'received')",
    )
      .bind("SN-900", "Legacy Customer", "legacy@example.com", bookablePickup(), null)
      .run();
    expect((await get("/order/thanks?n=SN-900")).status).toBe(404);
    expect((await get("/order/thanks?n=SN-900&t=")).status).toBe(404);
  });

  it("backfills a token onto a row that predates the column", async () => {
    // The suite's database is created empty, so migration 0003's UPDATE touches
    // nothing. Run the same statement against a token-less row to prove it works.
    await env.DB.prepare(
      "INSERT INTO orders (number, name, contact, pickup_at, status) VALUES (?, ?, ?, ?, 'received')",
    )
      .bind("SN-901", "Pre Token", "pre@example.com", "whenever", )
      .run();
    await env.DB.prepare("UPDATE orders SET token = lower(hex(randomblob(16))) WHERE token IS NULL").run();
    const row = await env.DB.prepare("SELECT token FROM orders WHERE number = ?")
      .bind("SN-901")
      .first<{ token: string }>();
    expect(row?.token).toMatch(/^[0-9a-f]{32}$/);
  });
});

describe("bad requests do not 500", () => {
  it("answers malformed, empty and non-object JSON bodies with a 400", async () => {
    for (const body of ["", "{", "null", "[]", '"a string"', "12"]) {
      for (const path of ["/api/order", "/api/message"]) {
        const response = await get(path, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body,
        });
        expect(response.status, `${path} with body ${JSON.stringify(body)}`).toBe(400);
      }
    }
  });

  it("answers a JSON post with no body at all with a 400", async () => {
    const response = await worker.fetch(
      new Request(ORIGIN + "/api/order", { method: "POST", headers: { "content-type": "application/json" } }),
    );
    expect(response.status).toBe(400);
  });
});

describe("menu api", () => {
  it("survives a malformed sizes_json row instead of 500ing", async () => {
    await env.DB.prepare("UPDATE coffee_types SET sizes_json = ? WHERE slug = ?")
      .bind("{not json", "affogato")
      .run();
    try {
      const response = await get("/api/menu");
      expect(response.status).toBe(200);
      const body = await response.json<{ drinks: { slug: string; sizes: unknown[] }[] }>();
      expect(body.drinks.find((d) => d.slug === "affogato")?.sizes).toEqual([]);
    } finally {
      await env.DB.prepare("UPDATE coffee_types SET sizes_json = ? WHERE slug = ?")
        .bind('[{"label":"one","cents":700}]', "affogato")
        .run();
    }
  });
});

describe("contact form", () => {
  it("keeps what the visitor typed when the note is rejected", async () => {
    const body = new URLSearchParams({ name: "Ada Lovelace", contact: "nope", body: "Do you cater?" });
    const response = await get("/api/message", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    });
    expect(response.status).toBe(400);
    const page = await response.text();
    expect(page).toContain('value="Ada Lovelace"');
    expect(page).toContain('value="nope"');
    expect(page).toContain("Do you cater?");
  });

  it("swallows a post that fills the honeypot without storing it", async () => {
    const body = new URLSearchParams({
      name: "Spam Bot",
      contact: "spam@example.com",
      body: "buy things",
      fax: "http://spam.example",
    });
    const response = await get("/api/message", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
      redirect: "manual",
    });
    expect(response.status).toBe(303);
    const row = await env.DB.prepare("SELECT COUNT(*) AS n FROM messages WHERE contact = ?")
      .bind("spam@example.com")
      .first<{ n: number }>();
    expect(row?.n).toBe(0);
  });
});

describe("pickup days", () => {
  it("never offers a Monday, because the bar is shut", () => {
    // walk a whole week of "now" values, not just today
    for (let offset = 0; offset < 7; offset++) {
      const now = new Date(Date.UTC(2026, 8, 1 + offset, 15, 0, 0));
      for (const day of pickupDays(now)) {
        expect(day.value.startsWith("Mon"), `${day.value} offered on ${now.toISOString()}`).toBe(false);
      }
    }
  });

  it("drops today once the last slot has passed", () => {
    const morning = pickupDays(new Date(Date.UTC(2026, 8, 2, 12, 0, 0))); // 8am ET, Wednesday
    expect(morning[0].isToday).toBe(true);
    const evening = pickupDays(new Date(Date.UTC(2026, 8, 3, 1, 0, 0))); // 9pm ET Wednesday
    expect(evening.every((d) => !d.isToday)).toBe(true);
  });

  it("rejects a pickup on a closed day or a time that has gone", () => {
    expect(isPickupBookable("Mon 7 Sep \u00b7 9:00am")).toBe(false);
    expect(isPickupBookable("not a day \u00b7 9:00am")).toBe(false);
    expect(isPickupBookable("Tomorrow 9:00am")).toBe(false);
    expect(isPickupBookable(`${pickupDays()[0].value} \u00b7 25:00pm`)).toBe(false);
    expect(isPickupBookable(bookablePickup())).toBe(true);
  });

  it("refuses an order booked for a day the bar is closed", async () => {
    const response = await get("/api/order", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Monday Person",
        contact: "monday@example.com",
        pickup_at: "Mon 7 Sep \u00b7 9:00am",
        items: [{ slug: "affogato", size: "one", qty: 1 }],
      }),
    });
    expect(response.status).toBe(400);
    const body = await response.json<{ error: string }>();
    expect(body.error).toContain("pick a day and time from the list");
  });

  it("offers the menu page only open days, labelled absolutely", async () => {
    const page = await html("/menu");
    expect(page).not.toContain('<option value="Tomorrow"');
    for (const day of pickupDays()) expect(page).toContain(`value="${day.value}"`);
    expect(page).toContain("Closed Mondays");
  });
});
