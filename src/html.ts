import { pickupSlots, site } from "./config";
import { formatCents, parseSizes, type CoffeeType, type OrderRow } from "./db";

export function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const CSS = `
:root {
  --cream: #f6f1ea;
  --espresso: #1f1814;
  --copper: #8b3a2a;
  --mute: #6d6258;
  --rule: #e4d9cc;
  --foam: #fbf7f2;
}
* { box-sizing: border-box; }
html { background: var(--cream); }
html, body { margin: 0; min-height: 100%; }
body {
  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
  color: var(--espresso);
  background: var(--cream);
  font-size: 16px;
  line-height: 1.5;
  letter-spacing: 0.01em;
  max-width: 840px;
  margin: 0 auto;
  min-height: 100dvh;
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}
img { max-width: 100%; height: auto; display: block; }
a { color: var(--copper); text-underline-offset: 3px; }
a:hover { color: var(--espresso); }
.pad { padding-left: 1.15rem; padding-right: 1.15rem; }
header.site {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.1rem;
  position: sticky;
  top: 0;
  z-index: 40;
  background: color-mix(in srgb, var(--cream) 92%, white);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--rule);
  padding: max(0.85rem, env(safe-area-inset-top)) 1.15rem 0.35rem;
}
.brand {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  text-decoration: none;
  color: inherit;
}
.mark {
  width: 26px;
  height: 26px;
  object-fit: contain;
  flex: none;
}
.wordmark {
  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
  font-size: 0.78rem;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  font-weight: 560;
  line-height: 1;
}
nav.links {
  display: flex;
  justify-content: center;
  gap: 0;
}
nav.links a {
  color: var(--mute);
  text-decoration: none;
  min-height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 1.15rem;
  font-size: 0.68rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  font-weight: 500;
}
nav.links a[aria-current="page"], nav.links a:hover { color: var(--espresso); }
h1, h2, .serif {
  font-family: Palatino, "Palatino Linotype", "Iowan Old Style", Georgia, serif;
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 1.15;
}
h1 { font-size: 1.55rem; margin: 0 0 0.6rem; }
h2 { font-size: 1.25rem; margin: 0 0 0.7rem; }
.lede { color: var(--mute); margin: 0 0 1.4rem; max-width: 28rem; }
.hero {
  position: relative;
  margin: 0;
}
.hero img {
  width: 100%;
  height: clamp(220px, 56vw, 420px);
  object-fit: cover;
}
.hero-title {
  position: absolute;
  left: 1.15rem;
  bottom: 1rem;
  margin: 0;
  color: var(--cream);
  font-family: Palatino, "Palatino Linotype", "Iowan Old Style", Georgia, serif;
  font-size: 1.15rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-shadow: 0 1px 10px rgba(31,24,20,.5);
}
.word-sign {
  display: block;
  width: 70%;
  max-width: 280px;
  margin: 2.4rem auto 2.2rem;
}
.btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 44px;
  background: var(--copper);
  color: var(--cream);
  text-decoration: none;
  border: none;
  border-radius: 16px;
  padding: 0.75rem 1.1rem;
  font: inherit;
  font-size: 1rem;
  cursor: pointer;
  text-align: center;
}
.btn:hover { color: var(--cream); filter: brightness(1.05); }
.btn.ghost {
  background: transparent;
  color: var(--copper);
  box-shadow: inset 0 0 0 1px var(--copper);
}
.drinks { display: flex; flex-direction: column; gap: 2.1rem; }
.drink { margin: 0; }
.drink img {
  width: 100%;
  aspect-ratio: 16 / 10;
  object-fit: cover;
  border-radius: 16px;
}
.drink-meta {
  display: flex;
  justify-content: space-between;
  gap: 0.8rem;
  align-items: baseline;
  margin-top: 0.75rem;
}
.drink-name {
  font-family: Palatino, "Palatino Linotype", "Iowan Old Style", Georgia, serif;
  font-size: 1.2rem;
  margin: 0;
}
.prices { font-variant-numeric: tabular-nums; color: var(--copper); font-size: 0.92rem; }
.desc { margin: 0.25rem 0 0.8rem; color: var(--mute); font-size: 0.95rem; }
.cat-label {
  font-size: 0.72rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--mute);
  margin: 2.2rem 0 1rem;
}
.add-row { display: flex; flex-wrap: wrap; gap: 0.45rem; align-items: stretch; }
.add-row select {
  flex: 1 1 7rem;
  min-height: 44px;
}
.add-row .btn { flex: 1 1 100%; width: 100%; }
.machine {
  width: 100%;
  height: clamp(200px, 48vw, 360px);
  object-fit: cover;
  border-radius: 16px;
  margin: 0.4rem 0 1rem;
}
.bar { padding: 2.6rem 0 1rem; }
.where { color: var(--mute); margin: 0 0 0.3rem; }
select, input, textarea {
  font: inherit;
  font-size: 16px;
  color: var(--espresso);
  background: var(--foam);
  border: 1px solid var(--rule);
  border-radius: 16px;
  padding: 0.7rem 0.85rem;
  min-height: 44px;
  width: 100%;
}
textarea { min-height: 6.5rem; resize: vertical; }
label { display: block; font-size: 0.88rem; margin: 0.95rem 0 0.3rem; color: var(--mute); }
.guest { margin-top: 1.6rem; padding-bottom: 6.5rem; }
.ticket {
  background: var(--foam);
  border: 1px solid var(--rule);
  border-radius: 16px;
  padding: 1rem 1.1rem;
  margin: 1.6rem 0;
}
.ticket h2 { margin-top: 0; font-size: 1.15rem; }
.ticket ol { margin: 0.4rem 0 0.8rem; padding-left: 1.2rem; }
.flash {
  background: #e7efe4;
  color: #3d5340;
  border-radius: 16px;
  padding: 0.75rem 1rem;
  margin: 0 0 1.2rem;
}
.err {
  background: #f3e4dc;
  color: var(--copper);
  border-radius: 16px;
  padding: 0.75rem 1rem;
  margin: 0 0 1.2rem;
}
.number {
  font-family: Palatino, "Palatino Linotype", "Iowan Old Style", Georgia, serif;
  font-size: 2rem;
  letter-spacing: 0.04em;
}
footer.site {
  margin-top: 2.6rem;
  padding: 1.3rem 1.15rem calc(1.5rem + env(safe-area-inset-bottom));
  border-top: 1px solid var(--rule);
  color: var(--mute);
  font-size: 0.9rem;
}
footer.site p { margin: 0.25rem 0; }
.kicker {
  font-size: 0.72rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--mute);
  margin: 1.4rem 0 0.45rem;
}
.empty { color: var(--mute); }
.actions { display: flex; flex-direction: column; gap: 0.55rem; margin: 0.4rem 0 2rem; }
.slip-bar {
  position: sticky;
  bottom: 0;
  z-index: 30;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.6rem 1rem;
  background: var(--cream);
  border-top: 1px solid var(--rule);
  padding: 0.7rem 1.15rem calc(0.7rem + env(safe-area-inset-bottom));
}
.slip-bar p { margin: 0; flex: 1 1 auto; font-size: 0.95rem; }
.slip-bar .btn { width: auto; flex: 1 1 11rem; }
.remove {
  font: inherit;
  font-size: 0.9rem;
  color: var(--copper);
  background: none;
  border: none;
  min-height: 44px;
  padding: 0 0.4rem;
  cursor: pointer;
}

.about {
  margin: 2.4rem 0 0;
  padding-top: 1.6rem;
  border-top: 1px solid var(--rule);
}
.about h2 { margin-bottom: 0.45rem; }
.about .lede { margin-bottom: 1rem; }
`.trim();

function nav(path: string): string {
  const items = [
    ["/", "Home"],
    ["/menu", "Menu"],
  ] as const;
  return `<nav class="links">${items
    .map(([href, label]) => {
      const current = href === path || (href !== "/" && path.startsWith(href));
      return `<a href="${href}"${current ? ' aria-current="page"' : ""}>${label}</a>`;
    })
    .join("")}</nav>`;
}

export function layout(title: string, path: string, body: string): string {
  const pageTitle = path === "/" ? `${site.name} — ${site.city}` : `${title} — ${site.name}`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>${esc(pageTitle)}</title>
  <meta name="description" content="Specialty cafe in Holly Springs. Espresso martini, shaken espresso, pastry. Order ahead — pay at pickup.">
  <meta name="theme-color" content="#f6f1ea">
  <link rel="icon" href="/mark.svg" type="image/svg+xml">
  <style>${CSS}</style>
</head>
<body>
  <header class="site">
    <a class="brand" href="/"><img class="mark" src="/img/espresso-martini-graphic.png" alt="" width="40" height="40"><span class="wordmark">Sip &amp; Nest</span></a>
    ${nav(path)}
  </header>
  ${body}
  <footer class="site">
    <p><strong>${esc(site.name)}</strong> · ${esc(site.address)}</p>
    <p>${esc(site.hours)}. ${esc(site.hoursNote)}.</p>
    <p>${esc(site.email)}</p>
  </footer>
</body>
</html>`;
}

function priceLine(drink: CoffeeType): string {
  return parseSizes(drink.sizes_json)
    .map((s) => `${esc(s.label)} ${formatCents(s.cents)}`)
    .join(" · ");
}

function drinkTiles(drinks: CoffeeType[], withAdd: boolean, eagerFirst = false): string {
  return `<div class="drinks">${drinks
    .map((d, i) => {
      const img = d.image
        ? `<img src="${esc(d.image)}" alt="${esc(d.name)}" width="800" height="500"${eagerFirst && i === 0 ? "" : ' loading="lazy" decoding="async"'}>`
        : "";
      const add = withAdd
        ? `<div class="add-row">
            <select data-size="${esc(d.slug)}" aria-label="Size for ${esc(d.name)}">${parseSizes(d.sizes_json)
              .map((s) => `<option value="${esc(s.label)}">${esc(s.label)} · ${formatCents(s.cents)}</option>`)
              .join("")}</select>
            <select data-qty="${esc(d.slug)}" aria-label="Quantity for ${esc(d.name)}">
              ${[1, 2, 3, 4, 5, 6].map((n) => `<option value="${n}">${n}</option>`).join("")}
            </select>
            <button type="button" class="btn" data-add="${esc(d.slug)}">Add</button>
          </div>`
        : `<a class="btn" href="/menu">Add</a>`;
      return `<article class="drink">
        ${img}
        <div class="drink-meta">
          <p class="drink-name">${esc(d.name)}</p>
          <p class="prices">${priceLine(d)}</p>
        </div>
        <p class="desc">${esc(d.description)}</p>
        ${add}
      </article>`;
    })
    .join("")}</div>`;
}

export function homePage(drinks: CoffeeType[], notice?: string): string {
  const flash = notice ? `<p class="flash">${esc(notice)}</p>` : "";
  const body = `
    <div class="hero">
      <img src="/img/hero.webp" alt="Espresso martini at the bar" width="1200" height="750" fetchpriority="high" decoding="async">
      <h1 class="hero-title">Sip &amp; Nest</h1>
    </div>
    <img class="word-sign" src="/img/coffee-bar.png" alt="Coffee Bar" width="560" height="280">
    <div class="pad">
      <p class="kicker">Holly Springs</p>
      ${drinkTiles(drinks, false, true)}
      <section class="bar">
        <h2>The bar</h2>
        <img class="machine" src="/img/machine.webp?v=2" alt="Espresso machine at Sip and Nest" width="1200" height="800" loading="lazy" decoding="async">
        <p class="where">${esc(site.address)}</p>
        <p class="where">${esc(site.hoursShort)} · ${esc(site.hoursNote)}</p>
      </section>
      <p class="actions"><a class="btn" href="/menu">Order ahead</a></p>
      <section id="about" class="about">
        <p class="kicker">About</p>
        <h2>A specialty cafe on Hartness</h2>
        <p class="lede">Espresso martinis, shaken drinks, a quiet counter. Pay when you pick up. Closed Mondays.</p>
        <p class="where">${esc(site.email)}</p>
        ${flash}
        <h2>Leave a note</h2>
        <form method="post" action="/api/message">
          <label for="mname">Name</label>
          <input id="mname" name="name" required maxlength="80">
          <label for="mcontact">Phone or email</label>
          <input id="mcontact" name="contact" required maxlength="120">
          <label for="mbody">Message</label>
          <textarea id="mbody" name="body" required maxlength="1000"></textarea>
          <p style="margin-top:1rem"><button class="btn" type="submit">Send</button></p>
        </form>
      </section>
    </div>`;
  return layout("Home", "/", body);
}

const CATEGORY_LABEL: Record<string, string> = {
  specialty: "Specialty",
  coffee: "Coffee",
  pastry: "From the case",
};

export function menuPage(drinks: CoffeeType[], error?: string, notice?: string): string {
  return orderPage(drinks, error, notice);
}

export function orderPage(drinks: CoffeeType[], error?: string, notice?: string): string {
  const payload = drinks.map((d) => ({
    slug: d.slug,
    name: d.name,
    sizes: parseSizes(d.sizes_json),
  }));
  const cats: string[] = [];
  for (const d of drinks) if (!cats.includes(d.category)) cats.push(d.category);
  const sections = cats
    .map((cat) => {
      const group = drinks.filter((d) => d.category === cat);
      return `<p class="cat-label">${esc(CATEGORY_LABEL[cat] ?? cat)}</p>${drinkTiles(group, true)}`;
    })
    .join("");
  const flash = error ? `<p class="err">${esc(error)}</p>` : notice ? `<p class="flash">${esc(notice)}</p>` : "";
  const body = `
    <div class="pad">
      <p class="kicker">Pickup</p>
      <h1>Order ahead</h1>
      <p class="lede">${esc(site.pickupCopy)}</p>
      ${flash}
    </div>
    <form id="order-form" method="post" action="/api/order">
      <div class="pad">
        ${sections}
        <div class="ticket">
          <h2>Your slip</h2>
          <p class="empty" id="cart-empty">Nothing yet — add a drink from the list.</p>
          <ol id="cart-lines" hidden></ol>
          <p id="cart-total" hidden></p>
        </div>
        <div class="guest">
          <label for="name">Name for the ticket</label>
          <input id="name" name="name" required maxlength="80" autocomplete="name">
          <label for="contact">Phone or email</label>
          <input id="contact" name="contact" required maxlength="120" autocomplete="tel">
          <label for="pickup_day">Pickup day</label>
          <select id="pickup_day" name="pickup_day">
            <option value="Today">Today</option>
            <option value="Tomorrow">Tomorrow</option>
          </select>
          <label for="pickup_slot">Pickup time</label>
          <select id="pickup_slot" name="pickup_slot">
            ${pickupSlots.map((s) => `<option>${s}</option>`).join("")}
          </select>
          <input type="hidden" name="pickup_at" id="pickup_at">
          <label for="notes">Notes for the bar</label>
          <textarea id="notes" name="notes" maxlength="400" placeholder="Oat, extra hot, a fork…"></textarea>
          <input type="hidden" name="items" id="items" value="[]">
        </div>
        <noscript>
          <p class="err">JavaScript is off, so add one item below.</p>
          <label for="slug">Drink</label>
          <select id="slug" name="slug">
            ${drinks.map((d) => `<option value="${esc(d.slug)}">${esc(d.name)}</option>`).join("")}
          </select>
          <label for="size">Size</label>
          <select id="size" name="size">
            ${[...new Set(drinks.flatMap((d) => parseSizes(d.sizes_json).map((s) => s.label)))]
              .map((label) => `<option>${esc(label)}</option>`)
              .join("")}
          </select>
          <label for="qty">Qty</label>
          <select id="qty" name="qty">${[1, 2, 3, 4, 5, 6].map((n) => `<option>${n}</option>`).join("")}</select>
        </noscript>
      </div>
      <div class="slip-bar">
        <p id="slip-label">Your slip</p>
        <button class="btn" type="submit">Place order</button>
      </div>
    </form>
    <script type="application/json" id="menu-data">${esc(JSON.stringify(payload))}</script>
    <script>
    (function () {
      var menu = JSON.parse(document.getElementById("menu-data").textContent);
      var bySlug = {};
      menu.forEach(function (d) { bySlug[d.slug] = d; });
      var cart = [];
      function money(c) { return "$" + (c / 100).toFixed(2); }
      function render() {
        var empty = document.getElementById("cart-empty");
        var lines = document.getElementById("cart-lines");
        var total = document.getElementById("cart-total");
        var field = document.getElementById("items");
        var slip = document.getElementById("slip-label");
        field.value = JSON.stringify(cart.map(function (l) {
          return { slug: l.slug, size: l.size, qty: l.qty };
        }));
        if (!cart.length) {
          empty.hidden = false;
          lines.hidden = true;
          total.hidden = true;
          lines.innerHTML = "";
          slip.textContent = "Your slip";
          return;
        }
        empty.hidden = true;
        lines.hidden = false;
        total.hidden = false;
        var sum = 0;
        lines.innerHTML = cart.map(function (l, i) {
          var drink = bySlug[l.slug];
          var size = drink.sizes.find(function (s) { return s.label === l.size; });
          var line = size.cents * l.qty;
          sum += line;
          return "<li>" + drink.name + " · " + l.size + " × " + l.qty + " — " + money(line) +
            ' <button type="button" class="remove" data-remove="' + i + '">Remove</button></li>';
        }).join("");
        total.textContent = "Total " + money(sum) + " at pickup";
        slip.textContent = "Your slip · " + money(sum);
      }
      document.addEventListener("click", function (e) {
        var t = e.target;
        if (!(t instanceof HTMLElement)) return;
        var add = t.getAttribute("data-add");
        if (add) {
          var root = t.closest(".drink");
          var sizeEl = root.querySelector('[data-size="' + add + '"]');
          var qtyEl = root.querySelector('[data-qty="' + add + '"]');
          cart.push({ slug: add, size: sizeEl.value, qty: Number(qtyEl.value) });
          render();
        }
        var rm = t.getAttribute("data-remove");
        if (rm != null) {
          cart.splice(Number(rm), 1);
          render();
        }
      });
      document.getElementById("order-form").addEventListener("submit", function () {
        var day = document.getElementById("pickup_day").value;
        var slot = document.getElementById("pickup_slot").value;
        document.getElementById("pickup_at").value = day + " " + slot;
      });
      render();
    })();
    </script>`;
  return layout("Menu", "/menu", body);
}

export function thanksPage(order: OrderRow): string {
  const body = `
    <div class="pad">
      <p class="kicker">Received</p>
      <h1>We have it.</h1>
      <p class="lede">Your order is on a ticket behind the bar. Come by at <strong>${esc(order.pickup_at)}</strong> and ask for <strong>${esc(order.name)}</strong>.</p>
      <div class="ticket">
        <p>Order number</p>
        <p class="number">${esc(order.number)}</p>
        <p>Status: ${esc(order.status)} · Pay at pickup, not here.</p>
      </div>
      <p class="actions"><a class="btn" href="/menu">Back to the menu</a></p>
    </div>`;
  return layout("Order received", "/menu", body);
}

export function aboutPage(notice?: string): string {
  return homePage([]);
}

export function notFoundPage(): string {
  return layout(
    "Not found",
    "/",
    `<div class="pad"><h1>That table is empty.</h1><p class="lede">Nothing here. Try the <a href="/menu">menu</a> or <a href="/">home</a>.</p></div>`,
  );
}

export const MARK_SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <rect width="64" height="64" rx="16" fill="#f6f1ea"/>
  <g fill="none" stroke="#8b3a2a" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 50c4-6 10-9 20-9s16 3 20 9" stroke-width="1.6"/>
    <path d="M16 48c3-4 8-6 16-6s13 2 16 6" stroke-width="1.2" opacity=".7"/>
    <path d="M18 52c5 3 11 4 14 4s9-1 14-4" stroke-width="1.4"/>
    <path d="M22 44c1-8 3-16 10-18 7 2 9 10 10 18" stroke-width="1.8"/>
    <path d="M24 30h16c1 4 1 10-1 14H25c-2-4-2-10-1-14z" stroke-width="1.7"/>
    <path d="M40 33c5 0 7 3 7 6s-2 6-7 6" stroke-width="1.5"/>
    <path d="M29 16c0 4 1 6 3 8" stroke-width="1.2"/>
    <path d="M35 15c-1 4 0 7 2 9" stroke-width="1.2"/>
  </g>
</svg>`;
