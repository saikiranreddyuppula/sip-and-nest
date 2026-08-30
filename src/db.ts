import { ORDER_NUMBER_OFFSET } from "./config";

export type Size = { label: string; cents: number };

export type CoffeeType = {
  id: number;
  slug: string;
  name: string;
  category: string;
  description: string;
  sizes_json: string;
  price_cents: number;
  available: number;
  sort_order: number;
  featured: number;
  image?: string | null;
};

export type OrderRow = {
  id: number;
  number: string;
  /** Null on orders placed before tokens existed. */
  token: string | null;
  name: string;
  contact: string;
  pickup_at: string;
  notes: string | null;
  status: string;
  created_at: string;
};

export type OrderItemInput = {
  slug: string;
  size: string;
  qty: number;
  note?: string;
};

export type OrderInput = {
  name: string;
  contact: string;
  pickup_at: string;
  notes?: string;
  items: OrderItemInput[];
};

export type OrderResult =
  | { ok: true; id: number; number: string; token: string }
  | { ok: false; error: string; status: 400 };


export function parseSizes(json: string): Size[] {
  try {
    const parsed: unknown = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (row): row is Size =>
        !!row &&
        typeof row === "object" &&
        typeof (row as Size).label === "string" &&
        typeof (row as Size).cents === "number",
    );
  } catch {
    return [];
  }
}

export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export async function listMenu(db: D1Database): Promise<CoffeeType[]> {
  const { results } = await db
    .prepare("SELECT * FROM coffee_types WHERE available = 1 ORDER BY sort_order, id")
    .all<CoffeeType>();
  return results ?? [];
}

export async function listAllDrinks(db: D1Database): Promise<CoffeeType[]> {
  const { results } = await db
    .prepare("SELECT * FROM coffee_types ORDER BY sort_order, id")
    .all<CoffeeType>();
  return results ?? [];
}

export async function listFeatured(db: D1Database): Promise<CoffeeType[]> {
  const { results } = await db
    .prepare(
      "SELECT * FROM coffee_types WHERE featured = 1 AND available = 1 ORDER BY sort_order, id LIMIT 3",
    )
    .all<CoffeeType>();
  return results ?? [];
}

export function isContact(value: string): boolean {
  const s = value.trim();
  if (s.length < 5 || s.length > 120) return false;
  if (s.includes("@")) return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
  const digits = s.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
}

function cleanName(value: string): string | null {
  const s = value.trim().replace(/\s+/g, " ");
  if (s.length < 1 || s.length > 80) return null;
  return s;
}

export async function createOrder(db: D1Database, input: OrderInput): Promise<OrderResult> {
  const name = cleanName(input.name ?? "");
  if (!name) return { ok: false, error: "Name is required.", status: 400 };
  const contact = (input.contact ?? "").trim();
  if (!isContact(contact)) {
    return { ok: false, error: "A phone number or email is required.", status: 400 };
  }
  const pickup_at = (input.pickup_at ?? "").trim();
  if (!pickup_at || pickup_at.length > 80) {
    return { ok: false, error: "Choose a pickup time.", status: 400 };
  }
  const notes = (input.notes ?? "").trim().slice(0, 400);
  const items = Array.isArray(input.items) ? input.items : [];
  if (items.length < 1) return { ok: false, error: "Add at least one drink or pastry.", status: 400 };
  if (items.length > 12) return { ok: false, error: "That's too many lines for one ticket.", status: 400 };

  const lines: {
    drink: CoffeeType;
    size: Size;
    qty: number;
    note: string;
  }[] = [];

  for (const item of items) {
    const slug = String(item.slug ?? "").trim();
    const sizeLabel = String(item.size ?? "").trim();
    const qty = Number(item.qty);
    if (!slug) return { ok: false, error: "Each item needs a drink.", status: 400 };
    if (!Number.isInteger(qty) || qty < 1 || qty > 6) {
      return { ok: false, error: "Quantity must be between 1 and 6.", status: 400 };
    }
    const drink = await db
      .prepare("SELECT * FROM coffee_types WHERE slug = ?")
      .bind(slug)
      .first<CoffeeType>();
    if (!drink) return { ok: false, error: "We don't have that on the menu.", status: 400 };
    if (!drink.available) {
      return { ok: false, error: `${drink.name} isn't available today.`, status: 400 };
    }
    const sizes = parseSizes(drink.sizes_json);
    const size = sizes.find((s) => s.label === sizeLabel);
    if (!size) return { ok: false, error: `Choose a size for ${drink.name}.`, status: 400 };
    lines.push({ drink, size, qty, note: String(item.note ?? "").trim().slice(0, 120) });
  }

  const placeholder = `TMP-${crypto.randomUUID()}`;
  const token = crypto.randomUUID().replace(/-/g, "");
  const inserted = await db
    .prepare(
      "INSERT INTO orders (number, name, contact, pickup_at, notes, status, token) VALUES (?, ?, ?, ?, ?, 'received', ?)",
    )
    .bind(placeholder, name, contact, pickup_at, notes || null, token)
    .run();
  const id = inserted.meta.last_row_id;
  const number = `SN-${id + ORDER_NUMBER_OFFSET}`;
  await db.prepare("UPDATE orders SET number = ? WHERE id = ?").bind(number, id).run();

  const statements = lines.map((line) =>
    db
      .prepare(
        "INSERT INTO order_items (order_id, coffee_type_id, size, qty, price_cents, note) VALUES (?, ?, ?, ?, ?, ?)",
      )
      .bind(id, line.drink.id, line.size.label, line.qty, line.size.cents, line.note || null),
  );
  if (statements.length) await db.batch(statements);

  return { ok: true, id, number, token };
}

/**
 * Look an order up for its receipt. Orders created since 0003 carry a token and
 * will only be returned when the caller presents it, so a sequential order
 * number is not enough to read someone else's ticket.
 */
export async function getOrderForReceipt(
  db: D1Database,
  number: string,
  token: string,
): Promise<OrderRow | null> {
  const order = await db
    .prepare("SELECT * FROM orders WHERE number = ?")
    .bind(number)
    .first<OrderRow>();
  if (!order) return null;
  if (order.token && order.token !== token) return null;
  return order;
}

export async function createMessage(
  db: D1Database,
  name: string,
  contact: string,
  body: string,
): Promise<{ ok: true } | { ok: false; error: string; status: 400 }> {
  const clean = cleanName(name);
  if (!clean) return { ok: false, error: "Name is required.", status: 400 };
  const c = contact.trim();
  if (!isContact(c)) return { ok: false, error: "A phone number or email is required.", status: 400 };
  const text = body.trim();
  if (text.length < 2 || text.length > 1000) {
    return { ok: false, error: "Write a short note.", status: 400 };
  }
  await db
    .prepare("INSERT INTO messages (name, contact, body) VALUES (?, ?, ?)")
    .bind(clean, c, text)
    .run();
  return { ok: true };
}

export type OrderLine = {
  name: string;
  size: string;
  qty: number;
  price_cents: number;
  note: string | null;
};

export async function listOrderLines(db: D1Database, orderId: number): Promise<OrderLine[]> {
  const { results } = await db
    .prepare(
      `SELECT c.name AS name, i.size AS size, i.qty AS qty, i.price_cents AS price_cents, i.note AS note
       FROM order_items i
       JOIN coffee_types c ON c.id = i.coffee_type_id
       WHERE i.order_id = ?
       ORDER BY i.id`,
    )
    .bind(orderId)
    .all<OrderLine>();
  return results ?? [];
}

export function orderTotalCents(lines: OrderLine[]): number {
  return lines.reduce((sum, line) => sum + line.price_cents * line.qty, 0);
}
