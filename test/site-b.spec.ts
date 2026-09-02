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

describe("ordering", () => {
  it("POST /api/order inserts and returns a number", async () => {
    const response = await get("/api/order", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Sai Reddy",
        contact: "312-555-0148",
        pickup_at: bookablePickup(),
        notes: "extra foam",
        items: [{ slug: "espresso-martini", size: "5oz", qty: 2 }],
      }),
    });
    expect(response.status).toBe(200);
    const body = await response.json<{ ok: boolean; number: string }>();
    expect(body.ok).toBe(true);
    expect(body.number).toMatch(/^SN-\d+$/);

    const row = await env.DB.prepare("SELECT * FROM orders WHERE number = ?")
      .bind(body.number)
      .first<{ id: number; name: string; contact: string }>();
    expect(row?.name).toBe("Sai Reddy");
    expect(row?.contact).toBe("312-555-0148");

    const items = await env.DB.prepare("SELECT * FROM order_items WHERE order_id = ?")
      .bind(row?.id)
      .all();
    expect(items.results?.length).toBe(1);
  });

  it("shows the customer what they ordered on the receipt", async () => {
    const created = await get("/api/order", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Maya Fisher",
        contact: "maya@example.com",
        pickup_at: bookablePickup(),
        items: [
          { slug: "espresso-martini", size: "5oz", qty: 2 },
          { slug: "tiramisu", size: "slice", qty: 1 },
        ],
      }),
    });
    const { number, token } = await created.json<{ number: string; token: string }>();

    const page = await html(`/order/thanks?n=${encodeURIComponent(number)}&t=${token}`);
    expect(page).toContain(number);
    expect(page).toContain("Thanks, Maya");
    expect(page).toContain("Espresso Martini");
    expect(page).toContain("Tiramisu");
    // 2 x $12.00 + 1 x $7.50
    expect(page).toContain("$31.50");
    expect(page).toContain(bookablePickup());
  });

  it("404s an unknown order number", async () => {
    expect((await get("/order/thanks?n=SN-999999")).status).toBe(404);
    expect((await get("/order/thanks")).status).toBe(404);
  });

  it("rejects invalid quantities and missing contact", async () => {
    const badQty = await get("/api/order", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Sai",
        contact: "saisk73@gmail.com",
        pickup_at: bookablePickup(),
        items: [{ slug: "espresso-martini", size: "5oz", qty: 7 }],
      }),
    });
    expect(badQty.status).toBe(400);

    const badContact = await get("/api/order", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Sai",
        contact: "",
        pickup_at: bookablePickup(),
        items: [{ slug: "espresso-martini", size: "5oz", qty: 1 }],
      }),
    });
    expect(badContact.status).toBe(400);
  });

  it("accepts an HTML form post and redirects to the receipt", async () => {
    const body = new URLSearchParams({
      name: "Maya",
      contact: "maya@example.com",
      pickup_at: bookablePickup(),
      items: JSON.stringify([{ slug: "tiramisu", size: "slice", qty: 1 }]),
    });
    const response = await get("/api/order", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
      redirect: "manual",
    });
    expect(response.status).toBe(303);
    expect(response.headers.get("location") ?? "").toMatch(/\/order\/thanks\?n=SN-\d+&t=[0-9a-f]{32}/);
  });

  it("re-renders the menu with an error when the order is bad", async () => {
    const body = new URLSearchParams({ name: "", contact: "", pickup_at: "", items: "[]" });
    const response = await get("/api/order", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    });
    expect(response.status).toBe(400);
    const page = await response.text();
    expect(page).toContain('class="notice notice--bad"');
    expect(page).toContain("Name is required.");
  });
});

describe("messages", () => {
  it("stores a note and redirects home", async () => {
    const body = new URLSearchParams({
      name: "Dana",
      contact: "dana@example.com",
      body: "Do you do catering for twenty?",
    });
    const response = await get("/api/message", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
      redirect: "manual",
    });
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/?sent=1#contact");

    const row = await env.DB.prepare("SELECT * FROM messages WHERE contact = ?")
      .bind("dana@example.com")
      .first<{ name: string }>();
    expect(row?.name).toBe("Dana");

    const home = await html("/?sent=1");
    expect(home).toContain("Thanks — your note is with us.");
  });

  it("rejects an empty note", async () => {
    const response = await get("/api/message", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "", contact: "", body: "" }),
    });
    expect(response.status).toBe(400);
  });
});

describe("receipt privacy", () => {
  it("keeps order receipts out of search indexes", async () => {
    const created = await get("/api/order", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Private Person",
        contact: "private@example.com",
        pickup_at: bookablePickup(),
        items: [{ slug: "affogato", size: "one", qty: 1 }],
      }),
    });
    const { number, token } = await created.json<{ number: string; token: string }>();
    const page = await html(`/order/thanks?n=${encodeURIComponent(number)}&t=${token}`);
    expect(page).toContain('<meta name="robots" content="noindex, nofollow">');
    expect(page).not.toContain("<link rel=\"canonical\"");

    const missing = await get("/no-such-page");
    expect(await missing.text()).toContain('name="robots" content="noindex, nofollow"');
  });
});

describe("copy is consistent with the hours", () => {
  it("names no time outside opening hours and no service on a closed day", async () => {
    const path = "/"; {
      const page = await html(path);
      const body = page.replace(/<style>[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/g, "");
      const times = [...body.matchAll(/\b(\d{1,2}:\d{2}(?:am|pm))\b/g)].map((m) => m[1]);
      expect(times.length).toBeGreaterThan(0);
      for (const time of times) {
        const minutes = slotMinutes(time);
        expect(minutes, `unparseable time ${time} on ${path}`).not.toBeNull();
        expect(minutes! >= OPEN_MINUTES && minutes! <= CLOSE_MINUTES, `${time} on ${path} is outside opening hours`).toBe(true);
      }
      // Monday may only ever appear next to the fact that it is closed
      const text = body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
      for (const match of text.matchAll(/Monday/g)) {
        const window = text.slice(Math.max(0, match.index - 30), match.index + 36);
        expect(/clos/i.test(window), `"${window.trim()}" on ${path} implies Monday service`).toBe(true);
      }
    }
  });
});

describe("failed orders keep the customer's work", () => {
  it("echoes back the typed details when the order is rejected", async () => {
    const body = new URLSearchParams({
      name: "Jordan O'Neill",
      contact: "not a contact",
      pickup_day: pickupDays()[0].value,
      pickup_slot: "9:30am",
      notes: "Oat milk & one fork",
      items: JSON.stringify([{ slug: "affogato", size: "one", qty: 1 }]),
    });
    const response = await get("/api/order", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    });
    expect(response.status).toBe(400);
    const page = await response.text();
    expect(page).toContain("A phone number or email is required.");
    expect(page).toContain('value="Jordan O&#39;Neill"');
    expect(page).toContain('value="not a contact"');
    expect(page).toContain("Oat milk &amp; one fork");
    expect(page).toContain(`value="${pickupDays()[0].value}"`);
    expect(page).toContain("<option selected>9:30am</option>");
  });
});
