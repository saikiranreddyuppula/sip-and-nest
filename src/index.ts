import { Hono, type Context } from "hono";
import { site } from "./config";
import {
  createMessage,
  createOrder,
  getOrderByNumber,
  listAllDrinks,
  listMenu,
  type OrderInput,
  type OrderItemInput,
} from "./db";
import { MARK_SVG, homePage, menuPage, notFoundPage, orderPage, thanksPage } from "./html";

export type AppEnv = { Bindings: Env & { ASSETS: Fetcher } };

const app = new Hono<AppEnv>();

function wantsJson(c: { req: { header: (name: string) => string | undefined } }): boolean {
  const contentType = c.req.header("content-type") ?? "";
  if (contentType.includes("application/json")) return true;
  if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
    return false;
  }
  const accept = c.req.header("accept") ?? "";
  return accept.includes("application/json") && !accept.includes("text/html");
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function parseItems(raw: unknown): OrderItemInput[] {
  if (Array.isArray(raw)) {
    return raw.map((row) => ({
      slug: asString((row as OrderItemInput).slug),
      size: asString((row as OrderItemInput).size),
      qty: Number((row as OrderItemInput).qty),
      note: asString((row as OrderItemInput).note) || undefined,
    }));
  }
  if (typeof raw === "string" && raw.trim()) {
    try {
      return parseItems(JSON.parse(raw) as unknown);
    } catch {
      return [];
    }
  }
  return [];
}

async function readOrderInput(c: Context<AppEnv>): Promise<OrderInput> {
  const contentType = c.req.header("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = await c.req.json<Record<string, unknown>>();
    return {
      name: asString(body.name),
      contact: asString(body.contact),
      pickup_at: asString(body.pickup_at),
      notes: asString(body.notes),
      items: parseItems(body.items),
    };
  }
  const form = await c.req.parseBody();
  const pickupAt =
    asString(form.pickup_at) ||
    `${asString(form.pickup_day)} ${asString(form.pickup_slot)}`.trim();
  let items = parseItems(form.items);
  if (!items.length && asString(form.slug)) {
    items = [
      {
        slug: asString(form.slug),
        size: asString(form.size),
        qty: Number(form.qty || 1),
      },
    ];
  }
  return {
    name: asString(form.name),
    contact: asString(form.contact),
    pickup_at: pickupAt,
    notes: asString(form.notes),
    items,
  };
}

app.get("/img/*", (c) => c.env.ASSETS.fetch(c.req.raw));

app.get("/mark.svg", (c) =>
  c.body(MARK_SVG, 200, { "content-type": "image/svg+xml; charset=utf-8", "cache-control": "public, max-age=86400" }),
);

app.get("/favicon.svg", (c) =>
  c.body(MARK_SVG, 200, { "content-type": "image/svg+xml; charset=utf-8" }),
);

app.get("/favicon.ico", (c) => c.redirect("/mark.svg", 302));

app.get("/", async (c) => {
  const drinks = await listMenu(c.env.DB);
  return c.html(homePage(drinks));
});

app.get("/menu", async (c) => {
  const drinks = await listAllDrinks(c.env.DB);
  return c.html(menuPage(drinks));
});

app.get("/order", (c) => c.redirect("/menu", 302));

app.get("/order/thanks", async (c) => {
  const number = (c.req.query("n") ?? "").trim();
  if (!number) return c.html(notFoundPage(), 404);
  const order = await getOrderByNumber(c.env.DB, number);
  if (!order) return c.html(notFoundPage(), 404);
  return c.html(thanksPage(order));
});

app.get("/about", (c) => c.redirect("/#about", 302));

app.get("/api/menu", async (c) => {
  const drinks = await listMenu(c.env.DB);
  return c.json({
    ok: true,
    cafe: site.name,
    city: site.city,
    drinks: drinks.map((d) => ({
      slug: d.slug,
      name: d.name,
      category: d.category,
      description: d.description,
      sizes: JSON.parse(d.sizes_json) as unknown,
      price_cents: d.price_cents,
      featured: !!d.featured,
      image: d.image ?? null,
    })),
  });
});

app.post("/api/order", async (c) => {
  const input = await readOrderInput(c);
  const result = await createOrder(c.env.DB, input);
  if (!result.ok) {
    if (wantsJson(c)) return c.json({ ok: false, error: result.error }, result.status);
    const drinks = await listAllDrinks(c.env.DB);
    return c.html(orderPage(drinks, result.error), result.status);
  }
  if (wantsJson(c)) {
    return c.json({ ok: true, number: result.number, status: "received" });
  }
  return c.redirect(`/order/thanks?n=${encodeURIComponent(result.number)}`, 303);
});

app.post("/order", async (c) => {
  const input = await readOrderInput(c);
  const result = await createOrder(c.env.DB, input);
  if (!result.ok) {
    const drinks = await listAllDrinks(c.env.DB);
    return c.html(orderPage(drinks, result.error), result.status);
  }
  return c.redirect(`/order/thanks?n=${encodeURIComponent(result.number)}`, 303);
});

app.post("/api/message", async (c) => {
  const contentType = c.req.header("content-type") ?? "";
  let name = "";
  let contact = "";
  let body = "";
  if (contentType.includes("application/json")) {
    const json = await c.req.json<Record<string, unknown>>();
    name = asString(json.name);
    contact = asString(json.contact);
    body = asString(json.body);
  } else {
    const form = await c.req.parseBody();
    name = asString(form.name);
    contact = asString(form.contact);
    body = asString(form.body);
  }
  const result = await createMessage(c.env.DB, name, contact, body);
  if (!result.ok) {
    if (wantsJson(c)) return c.json({ ok: false, error: result.error }, result.status);
    const drinks = await listMenu(c.env.DB);
    return c.html(homePage(drinks), result.status);
  }
  if (wantsJson(c)) return c.json({ ok: true });
  const drinks = await listMenu(c.env.DB);
  return c.html(homePage(drinks, "Thanks — we got your note."));
});

app.get("/robots.txt", (c) =>
  c.text(`User-agent: *\nAllow: /\nSitemap: https://${site.domain}/sitemap.xml\n`),
);

app.get("/sitemap.xml", (c) => {
  const urls = ["/", "/menu"];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>https://${site.domain}${u}</loc></url>`).join("\n")}
</urlset>`;
  return c.body(xml, 200, { "content-type": "application/xml; charset=utf-8" });
});

app.notFound(async (c) => {
  try {
    const asset = await c.env.ASSETS.fetch(c.req.raw);
    if (asset.status !== 404) return asset;
  } catch {
    /* no static asset */
  }
  return c.html(notFoundPage(), 404);
});

export default app;
