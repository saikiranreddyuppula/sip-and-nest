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

describe("pages", () => {
  it("includes a branded intro overlay with the wordmark", async () => {
    const path = "/"; {
      const page = await html(path);
      expect(page).toContain('id="intro"');
      expect(page).toMatch(/id="intro"[^>]*aria-hidden="true"/);
      expect(page).toContain('class="intro__word"');
      expect(page).toContain(".no-js #intro");
      expect(page).toContain("translateY(-100%)");
      const introStart = page.indexOf('id="intro"');
      expect(introStart).toBeGreaterThan(-1);
      const introChunk = page.slice(introStart, page.indexOf("<header"));
      expect(introChunk).toContain("Sip &amp; Nest");
      expect(introChunk).not.toContain("Holly Springs");
      expect(introChunk).toContain('viewBox="0 0 64 64"');
      expect(introChunk).toContain("M10 21C10 34.5");
      expect(introChunk).not.toContain("aria-live");
      expect(introChunk).not.toContain('role="progressbar"');
      expect(introChunk.toLowerCase()).not.toContain("spinner");
    }
  });

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

  it("puts Place order on the ticket, not in a checkout below the menu", async () => {
    const page = await html("/menu");
    const start = page.indexOf('<aside class="slip"');
    expect(start).toBeGreaterThan(-1);
    const slip = page.slice(start, page.indexOf("</aside>", start));
    expect(slip).toContain("Your slip");
    expect(slip).toContain("Place order");
    expect(slip).toContain('id="name"');
    expect(slip).toContain('id="contact"');
    expect(slip).toContain('id="pickup_day"');
    expect(slip).toContain('id="pickup_slot"');
    expect(slip).toContain('id="notes"');
    expect(slip).toContain('id="place-order"');
    expect(page).not.toContain('id="details"');
    expect(page).not.toContain("Add your details");
    expect(page).not.toContain("Almost there");
  });

  it("404 page renders and reports 404", async () => {
    const response = await get("/no-such-page");
    expect(response.status).toBe(404);
    expect(await response.text()).toContain("That table is empty");
  });
});

describe("no external dependencies", () => {
  it("loads no third-party fonts, scripts or images", async () => {
    const path = "/"; {
      const page = await html(path);
      expect(page).not.toContain("fonts.googleapis.com");
      expect(page).not.toContain("fonts.gstatic.com");
      expect(page).not.toContain("unsplash");
      expect(page).not.toContain("cdn.");
      expect(page).not.toContain("Chicago");
      // every src/href that points outward must be a link to maps, mail or tel
      const externals = [...page.matchAll(/(?:src|srcset|href)="([^"]+)"/g)]
        .flatMap((m) => m[1].split(","))
        .map((candidate) => candidate.trim().split(/\s+/)[0])
        .filter((url) => /^https?:\/\//.test(url));
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
    const path = "/"; {
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
    // permanent: the redesign folded both pages in, they are not coming back
    const order = await get("/order", { redirect: "manual" });
    expect(order.status).toBe(301);
    expect(order.headers.get("location")).toBe("/menu");

    const about = await get("/about", { redirect: "manual" });
    expect(about.status).toBe(301);
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
