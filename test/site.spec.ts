import { env, exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

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

describe("pages", () => {
  it("home page carries the brand, the address and the about section", async () => {
    const page = await html("/");
    expect(page).toContain("Sip &amp; Nest");
    expect(page).toContain("Holly Springs");
    expect(page).toContain("Hartness");
    expect(page).toContain('id="about"');
    expect(page).toContain('id="visit"');
    expect(page).toContain("Espresso Martini");
    expect(page).toContain("Order ahead");
  });

  it("home page keeps about and visit inline rather than as separate pages", async () => {
    const page = await html("/");
    expect(page).not.toMatch(/href="\/about"/);
    expect(page).toContain('href="/#about"');
  });

  it("menu page lists the seeded drinks and the ordering controls", async () => {
    const page = await html("/menu");
    expect(page).toContain("Espresso Martini");
    expect(page).toContain("Brown Sugar Shaken Espresso");
    expect(page).toContain("Tiramisu");
    expect(page).toContain("Place order");
    expect(page).toContain("Your slip");
    expect(page).toContain('data-add="espresso-martini"');
  });

  it("404 page renders and reports 404", async () => {
    const response = await get("/no-such-page");
    expect(response.status).toBe(404);
    expect(await response.text()).toContain("That table is empty");
  });
});

describe("no external dependencies", () => {
  it("loads no third-party fonts, scripts or images", async () => {
    for (const path of ["/", "/menu"]) {
      const page = await html(path);
      expect(page).not.toContain("fonts.googleapis.com");
      expect(page).not.toContain("fonts.gstatic.com");
      expect(page).not.toContain("unsplash");
      expect(page).not.toContain("cdn.");
      expect(page).not.toContain("Chicago");
      // every src/href that points outward must be a link to maps, mail or tel
      const externals = [...page.matchAll(/(?:src|href)="(https?:\/\/[^"]+)"/g)].map((m) => m[1]);
      for (const url of externals) {
        const allowed =
          url.startsWith("https://sipandnest.com") || url.startsWith("https://www.google.com/maps");
        expect(allowed, `unexpected external resource: ${url}`).toBe(true);
      }
    }
  });
});

describe("embedded json", () => {
  // Regression: the payload used to be HTML-escaped, and since <script> is raw text
  // the &quot; entities were never decoded, so JSON.parse threw and the whole
  // ordering script died — nobody could add anything to their order.
  it("menu payload inside the script block is valid JSON", async () => {
    const page = await html("/menu");
    const raw = scriptText(page, "menu-data");
    expect(raw).not.toContain("&quot;");
    const parsed = JSON.parse(raw) as { slug: string; sizes: { label: string; cents: number }[] }[];
    expect(parsed.length).toBeGreaterThanOrEqual(8);
    const martini = parsed.find((d) => d.slug === "espresso-martini");
    expect(martini?.sizes[0]).toEqual({ label: "5oz", cents: 1200 });
  });

  it("publishes valid CafeOrCoffeeShop structured data", async () => {
    const page = await html("/");
    const match = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(page);
    expect(match).not.toBeNull();
    const data = JSON.parse(match![1]) as Record<string, unknown>;
    expect(data["@type"]).toBe("CafeOrCoffeeShop");
    expect((data.address as Record<string, string>).addressLocality).toBe("Holly Springs");
    expect(Array.isArray(data.openingHoursSpecification)).toBe(true);
    expect(JSON.stringify(data.hasMenu)).toContain("Espresso Martini");
  });
});

describe("head and discovery", () => {
  it("sets canonical, social and icon metadata per page", async () => {
    const home = await html("/");
    expect(home).toContain('<link rel="canonical" href="https://sipandnest.com/">');
    expect(home).toContain('property="og:image" content="https://sipandnest.com/og.jpg"');
    expect(home).toContain('name="twitter:card" content="summary_large_image"');
    expect(home).toContain('rel="manifest"');

    const menu = await html("/menu");
    expect(menu).toContain('<link rel="canonical" href="https://sipandnest.com/menu">');
    expect(menu).toContain("<title>Menu &amp; order ahead in Holly Springs — Sip &amp; Nest</title>");
  });

  it("serves a web app manifest", async () => {
    const response = await get("/manifest.webmanifest");
    expect(response.status).toBe(200);
    const manifest = JSON.parse(await response.text()) as { start_url: string; icons: unknown[] };
    expect(manifest.start_url).toBe("/");
    expect(manifest.icons.length).toBeGreaterThan(0);
  });

  it("serves robots and a sitemap", async () => {
    expect(await (await get("/robots.txt")).text()).toContain("Sitemap: https://sipandnest.com/sitemap.xml");
    expect(await (await get("/sitemap.xml")).text()).toContain("<loc>https://sipandnest.com/menu</loc>");
  });
});

describe("accessibility scaffolding", () => {
  it("gives every page a skip link, one h1 and a live region on the order page", async () => {
    for (const path of ["/", "/menu"]) {
      const page = await html(path);
      expect(page).toContain('class="skip" href="#main"');
      expect(page).toContain('<main id="main">');
      expect((page.match(/<h1[ >]/g) ?? []).length).toBe(1);
      expect(page).toContain('lang="en"');
    }
    const menu = await html("/menu");
    expect(menu).toContain('aria-live="polite"');
    expect(menu).toContain("<noscript>");
  });
});

describe("routing", () => {
  it("order and about collapse into menu and home", async () => {
    const order = await get("/order", { redirect: "manual" });
    expect(order.status).toBe(302);
    expect(order.headers.get("location")).toBe("/menu");

    const about = await get("/about", { redirect: "manual" });
    expect(about.status).toBe(302);
    expect(about.headers.get("location")).toBe("/#about");
  });

  it("GET /api/menu returns coffee types", async () => {
    const response = await get("/api/menu");
    expect(response.status).toBe(200);
    const body = await response.json<{ ok: boolean; drinks: { slug: string; name: string }[] }>();
    expect(body.ok).toBe(true);
    expect(body.drinks.length).toBeGreaterThanOrEqual(8);
    expect(body.drinks.some((d) => d.slug === "espresso-martini")).toBe(true);
  });
});

describe("ordering", () => {
  it("POST /api/order inserts and returns a number", async () => {
    const response = await get("/api/order", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Sai Reddy",
        contact: "312-555-0148",
        pickup_at: "Tomorrow 9:00am",
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
        pickup_at: "Today 10:30am",
        items: [
          { slug: "espresso-martini", size: "5oz", qty: 2 },
          { slug: "tiramisu", size: "slice", qty: 1 },
        ],
      }),
    });
    const { number } = await created.json<{ number: string }>();

    const page = await html(`/order/thanks?n=${encodeURIComponent(number)}`);
    expect(page).toContain(number);
    expect(page).toContain("Thanks, Maya");
    expect(page).toContain("Espresso Martini");
    expect(page).toContain("Tiramisu");
    // 2 x $12.00 + 1 x $7.50
    expect(page).toContain("$31.50");
    expect(page).toContain("Today 10:30am");
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
        pickup_at: "Today 8:00am",
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
        pickup_at: "Today 8:00am",
        items: [{ slug: "espresso-martini", size: "5oz", qty: 1 }],
      }),
    });
    expect(badContact.status).toBe(400);
  });

  it("accepts an HTML form post and redirects to the receipt", async () => {
    const body = new URLSearchParams({
      name: "Maya",
      contact: "maya@example.com",
      pickup_at: "Today 10:30am",
      items: JSON.stringify([{ slug: "tiramisu", size: "slice", qty: 1 }]),
    });
    const response = await get("/api/order", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
      redirect: "manual",
    });
    expect(response.status).toBe(303);
    expect(response.headers.get("location") ?? "").toMatch(/\/order\/thanks\?n=SN-\d+/);
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
        pickup_at: "Today 11:00am",
        items: [{ slug: "affogato", size: "one", qty: 1 }],
      }),
    });
    const { number } = await created.json<{ number: string }>();
    const page = await html(`/order/thanks?n=${encodeURIComponent(number)}`);
    expect(page).toContain('<meta name="robots" content="noindex, nofollow">');
    expect(page).not.toContain("<link rel=\"canonical\"");

    const missing = await get("/no-such-page");
    expect(await missing.text()).toContain('name="robots" content="noindex, nofollow"');
  });
});

describe("copy is consistent with the hours", () => {
  it("never promises service after closing time", async () => {
    const page = await html("/");
    expect(page).not.toMatch(/after four/i);
    expect(page).toContain("7:30am");
  });
});

describe("failed orders keep the customer's work", () => {
  it("echoes back the typed details when the order is rejected", async () => {
    const body = new URLSearchParams({
      name: "Jordan O'Neill",
      contact: "not a contact",
      pickup_day: "Tomorrow",
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
    expect(page).toContain('<option value="Tomorrow" selected>Tomorrow</option>');
    expect(page).toContain("<option selected>9:30am</option>");
  });
});

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
          pickup_at: "Today 9:00am",
          items: [{ slug: "affogato", size: "one", qty: 1 }],
        }),
      });
      expect(attempt.status).toBe(400);
    } finally {
      await env.DB.prepare("UPDATE coffee_types SET available = 1 WHERE slug = ?").bind("affogato").run();
    }
  });
});
