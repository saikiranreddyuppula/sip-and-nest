import { env, exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

const worker = exports.default;

async function html(path: string): Promise<string> {
  const response = await worker.fetch(new Request(`https://sipandnest.com${path}`));
  expect(response.status).toBe(200);
  return response.text();
}

describe("sip and nest", () => {
  it("homepage contains Sip and does not load google fonts", async () => {
    const page = await html("/");
    expect(page).toMatch(/Sip/);
    expect(page).toContain("Sip &amp; Nest");
    expect(page).toContain("Holly Springs");
    expect(page).toContain("Hartness");
    expect(page).toContain("Espresso Martini");
    expect(page).toMatch(/coffee-bar\.png|Coffee Bar/);
    expect(page).toContain("/img/espresso-martini");
    expect(page).toContain("Order ahead");
    expect(page).not.toContain("fonts.googleapis.com");
    expect(page).not.toContain('class="card"');
    expect(page).not.toContain("unsplash");
    expect(page).not.toContain("Chicago");
  });

  it("menu page lists a seeded drink", async () => {
    const page = await html("/menu");
    expect(page).toContain("Espresso Martini");
    expect(page).toContain("Brown Sugar Shaken Espresso");
    expect(page).toContain("Tiramisu");
    expect(page).not.toContain("fonts.googleapis.com");
  });

  it("GET /api/menu returns coffee types", async () => {
    const response = await worker.fetch(new Request("https://sipandnest.com/api/menu"));
    expect(response.status).toBe(200);
    const body = await response.json<{ ok: boolean; drinks: { slug: string; name: string }[] }>();
    expect(body.ok).toBe(true);
    expect(body.drinks.length).toBeGreaterThanOrEqual(8);
    expect(body.drinks.some((d) => d.slug === "espresso-martini")).toBe(true);
  });

  it("POST /api/order inserts and returns a number", async () => {
    const response = await worker.fetch(
      new Request("https://sipandnest.com/api/order", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "Sai Reddy",
          contact: "312-555-0148",
          pickup_at: "Tomorrow 9:00am",
          notes: "extra foam",
          items: [{ slug: "espresso-martini", size: "5oz", qty: 2 }],
        }),
      }),
    );
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

  it("rejects invalid quantities and missing contact", async () => {
    const badQty = await worker.fetch(
      new Request("https://sipandnest.com/api/order", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "Sai",
          contact: "saisk73@gmail.com",
          pickup_at: "Today 8:00am",
          items: [{ slug: "espresso-martini", size: "5oz", qty: 7 }],
        }),
      }),
    );
    expect(badQty.status).toBe(400);

    const badContact = await worker.fetch(
      new Request("https://sipandnest.com/api/order", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "Sai",
          contact: "",
          pickup_at: "Today 8:00am",
          items: [{ slug: "espresso-martini", size: "5oz", qty: 1 }],
        }),
      }),
    );
    expect(badContact.status).toBe(400);
  });

  it("accepts an HTML form post", async () => {
    const body = new URLSearchParams({
      name: "Maya",
      contact: "maya@example.com",
      pickup_at: "Today 10:30am",
      items: JSON.stringify([{ slug: "tiramisu", size: "slice", qty: 1 }]),
    });
    const response = await worker.fetch(
      new Request("https://sipandnest.com/api/order", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body,
        redirect: "manual",
      }),
    );
    expect(response.status).toBe(303);
    const location = response.headers.get("location") ?? "";
    expect(location).toMatch(/\/order\/thanks\?n=SN-\d+/);
  });
});
