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

describe("no-javascript ordering", () => {
  it("offers real drink-and-size pairs, not a union of every size", async () => {
    const page = await html("/menu");
    expect(page).toContain('value="espresso-martini|5oz"');
    expect(page).toContain('value="tiramisu|slice"');
    // the martini only comes in 5oz, so no other size may be pairable with it
    expect(page).not.toContain('value="espresso-martini|12oz"');
  });

  it("accepts a single-item post from the fallback form", async () => {
    const body = new URLSearchParams({
      name: "No Script",
      contact: "noscript@example.com",
      pickup_day: pickupDays()[0].value,
      pickup_slot: "3:30pm",
      choice: "tiramisu|slice",
      qty: "2",
    });
    const response = await get("/api/order", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
      redirect: "manual",
    });
    expect(response.status).toBe(303);
  });
});

describe("rejected fields are addressable", () => {
  it("marks the offending order field invalid and points it at the message", async () => {
    const body = new URLSearchParams({
      name: "Jo",
      contact: "nope",
      pickup_day: pickupDays()[0].value,
      pickup_slot: "9:30am",
      items: JSON.stringify([{ slug: "affogato", size: "one", qty: 1 }]),
    });
    const response = await get("/api/order", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    });
    expect(response.status).toBe(400);
    const page = await response.text();
    expect(page).toContain('id="contact"');
    expect(page).toMatch(/id="contact"[^>]*aria-invalid="true"/);
    expect(page).toMatch(/id="contact"[^>]*aria-describedby="order-error"/);
    // and the field that is fine must not be flagged
    expect(page).not.toMatch(/id="name"[^>]*aria-invalid/);
  });

  it("marks the offending note field invalid", async () => {
    const body = new URLSearchParams({ name: "Jo", contact: "jo@example.com", body: "" });
    const response = await get("/api/message", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    });
    expect(response.status).toBe(400);
    const page = await response.text();
    expect(page).toMatch(/id="mbody"[^>]*aria-invalid="true"/);
  });
});

describe("printing", () => {
  it("forces a light palette so a receipt printed from dark mode is readable", async () => {
    const page = await html("/");
    const printBlocks = [...page.matchAll(/@media print \{([\s\S]*?)\n\}/g)].map((m) => m[1]);
    expect(printBlocks.length).toBeGreaterThan(0);
    const palette = printBlocks.join("\n");
    expect(palette).toContain("--paper: #fff");
    expect(palette).toContain("--ink: #000");
  });
});

describe("the site stays a small cafe page", () => {
  it("has Menu in the nav and no Home nav link", async () => {
    const path = "/"; {
      const page = await html(path);
      const nav = /aria-label="Primary"[^>]*>([\s\S]*?)<\/nav>/.exec(page);
      expect(nav, `no primary nav on ${path}`).not.toBeNull();
      expect(nav![1]).toContain("Menu");
      expect(nav![1]).not.toContain("Home");
      expect(nav![1]).not.toContain("Visit");
    }
  });

  it("does not ship cellar grain, plate numbers, Fraunces or Google Fonts", async () => {
    const path = "/"; {
      const page = await html(path);
      expect(page).not.toContain("--grain");
      expect(page).not.toContain("card__plate");
      expect(page).not.toContain("feTurbulence");
      expect(page).not.toContain("Fraunces");
      expect(page).not.toContain("fonts.googleapis.com");
      expect(page).not.toContain("ken-burns");
      expect(page).not.toContain("cursor: none");
      expect(page).not.toMatch(/@keyframes\s+bounce/);
      expect(page).not.toMatch(/scale\(1\.[2-9]/);
    }
    const home = await html("/");
    expect(home).toContain("hero-rise 11s");
    expect(home).toContain("object-position: 50% 42%");
  });

  it("is a dark photographic cafe, not a white landing page", async () => {
    const path = "/"; {
      const page = await html(path);
      expect(page).toContain("color-scheme: dark");
      expect(page).toContain("--paper: #0b0a08");
      expect(page).toContain("--accent: #c9a36a");
      expect(page).not.toContain("--paper: #fafafa");
      expect(page).toContain("/fonts/instrument-serif.woff2");
      expect(page).toContain('content="#0b0a08"');
    }
    const home = await html("/");
    expect(home).toContain("/img/hero.webp");
    expect(home).toContain("/img/machine.webp");
    expect(home).toContain("Sip, then nest.");
  });
});

describe("one canonical url per page", () => {
  it("sends www to the apex host", async () => {
    const response = await worker.fetch(
      new Request("https://www.sipandnest.com/menu?x=1", { redirect: "manual" }),
    );
    expect(response.status).toBe(301);
    expect(response.headers.get("location")).toBe("https://sipandnest.com/menu?x=1");
  });

  it("strips a trailing slash instead of 404ing", async () => {
    const response = await get("/menu/", { redirect: "manual" });
    expect(response.status).toBe(301);
    expect(response.headers.get("location")).toBe("/menu");
    // and the root keeps working
    expect((await get("/")).status).toBe(200);
  });

  it("keeps the json api and receipts out of the index", async () => {
    const api = await get("/api/menu");
    expect(api.headers.get("x-robots-tag")).toBe("noindex");
    const robots = await (await get("/robots.txt")).text();
    expect(robots).toContain("Disallow: /api/");
    expect(robots).toContain("Disallow: /order/thanks");
  });
});

describe("structured data", () => {
  it("still publishes the business even when the menu is empty", async () => {
    await env.DB.prepare("UPDATE coffee_types SET available = 0").run();
    try {
      const page = await html("/");
      const match = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(page);
      expect(match).not.toBeNull();
      const data = JSON.parse(match![1]) as Record<string, unknown>;
      expect(data["@type"]).toBe("CafeOrCoffeeShop");
      expect(data.telephone).toBeTruthy();
      expect(data.openingHoursSpecification).toBeTruthy();
      expect(data.hasMenu).toBeUndefined();
    } finally {
      await env.DB.prepare("UPDATE coffee_types SET available = 1").run();
    }
  });

  it("declares the social image dimensions", async () => {
    const page = await html("/");
    expect(page).toContain('property="og:image:width" content="1200"');
    expect(page).toContain('property="og:image:height" content="630"');
    expect(page).toContain('property="og:image:type" content="image/jpeg"');
  });
});

describe("copy stays inside what the data supports", () => {
  it("makes no claim about facilities, printers or service guarantees", async () => {
    const pages = [await html("/"), await html("/menu")];
    const invented = [
      /drive-?through/i,
      /ticket prints/i,
      /gone by the afternoon/i,
      /we can adjust anything/i,
      /free (lot|parking)/i,
      /\bwifi\b/i,
      /card or cash/i,
      /step(s)? up to the door/i,
    ];
    for (const page of pages) {
      for (const pattern of invented) {
        expect(pattern.test(page), `page asserts ${pattern}`).toBe(false);
      }
    }
  });

  it("renders the business facts from config, not from literals in the markup", async () => {
    const page = await html("/");
    expect(page).toContain(site.address);
    expect(page).toContain(site.phone);
    expect(page).toContain(site.email);
    expect(page).toContain(site.city);
    // and the tel: link is built from that same number
    expect(page).toContain(`tel:+1${site.phone.replace(/\D/g, "")}`);
  });
});
