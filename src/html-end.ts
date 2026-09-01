import { site } from "./config";
import { formatCents, type OrderLine, type OrderRow } from "./db";
import { esc, layout } from "./html-chrome";

export function thanksPage(order: OrderRow, lines: OrderLine[], totalCents: number): string {
  const body = `
  <div class="wrap section" style="max-width:40rem">
    <p class="kicker">Order received</p>
    <h1>Thanks, ${esc(order.name.split(" ")[0] ?? order.name)} — it's on the board.</h1>
    <p class="lede">Come by at <strong>${esc(order.pickup_at)}</strong> and give your name at the counter. Nothing has been charged; you pay when you collect.</p>

    <div class="receipt">
      <p class="small muted" style="margin:0">Order number</p>
      <p class="receipt__number">${esc(order.number)}</p>
      <ul class="receipt__lines">
        ${lines
          .map(
            (line) => `<li>
              <span>${esc(line.name)} · ${esc(line.size)}${line.qty > 1 ? ` × ${line.qty}` : ""}${
                line.note ? `<br><span class="small muted">${esc(line.note)}</span>` : ""
              }</span>
              <span class="tabular">${formatCents(line.price_cents * line.qty)}</span>
            </li>`,
          )
          .join("")}
      </ul>
      <p class="receipt__total"><span>Due at pickup</span><span class="tabular">${formatCents(totalCents)}</span></p>
      ${order.notes ? `<p class="small muted" style="margin:1rem 0 0">Note for the bar: ${esc(order.notes)}</p>` : ""}
      <p class="receipt__where">
        ${esc(site.address)}<br>
        <a href="${mapsHref()}" target="_blank" rel="noopener">Directions</a>
        · <a href="tel:${telHref()}">${esc(site.phone)}</a>
      </p>
      <p class="small muted" style="margin:.85rem 0 1.1rem">Need to change it? Call and quote ${esc(order.number)}.</p>
      <p class="btn-row"><a class="btn" href="/menu">Order something else</a></p>
    </div>
  </div>
  <script>
  try {
    localStorage.removeItem("sn-slip-v1");
    localStorage.setItem("sn-last-order", JSON.stringify({ n: ${jsonScript(order.number)}, at: ${jsonScript(order.pickup_at)}, t: ${jsonScript(order.token ?? "")} }));
  } catch (e) {}
  </script>`;

  return layout({
    title: `Order ${order.number}`,
    path: "/order/thanks",
    description: "Your Sip & Nest order is received. Pay when you pick up.",
    body,
    noindex: true,
  });
}

export function errorPage(): string {
  const body = `
  <div class="wrap section center" style="max-width:34rem">
    <p class="kicker">Something went wrong</p>
    <h1>The machine stalled.</h1>
    <p class="lede center">That is on us, not on you. Try again in a moment — or ring the bar on <a href="tel:${telHref()}">${esc(site.phone)}</a> and we will take the order down by hand.</p>
    <p class="btn-row" style="justify-content:center">
      <a class="btn" href="/menu">Back to the menu</a>
    </p>
  </div>`;
  return layout({
    title: "Something went wrong",
    path: "/error",
    description: "Something went wrong at Sip & Nest.",
    body,
    noindex: true,
  });
}

export function notFoundPage(): string {
  const body = `
  <div class="wrap section center" style="max-width:34rem">
    <p class="kicker">404</p>
    <h1>That table is empty.</h1>
    <p class="lede center">We could not find that page. The menu is probably what you were after.</p>
    <p class="btn-row" style="justify-content:center">
      <a class="btn" href="/menu">See the menu</a>
    </p>
  </div>`;
  return layout({
    title: "Page not found",
    path: "/404",
    description: "Page not found at Sip & Nest.",
    body,
    noindex: true,
  });
}

export const MANIFEST = JSON.stringify({
  name: `${site.name} — ${site.city}`,
  short_name: site.name,
  description: "Specialty coffee bar in Holly Springs, NC. Order ahead, pay at pickup.",
  start_url: "/",
  scope: "/",
  display: "standalone",
  background_color: "#0b0a08",
  theme_color: "#0b0a08",
  icons: [
    { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
    { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    { src: "/mark.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
  ],
});

export const MARK_SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="8" fill="#0b0a08"/>
  <path d="M10 21C10 34.5 19.5 43 32 43S54 34.5 54 21Z" fill="none" stroke="#c9a36a" stroke-width="2.2"/>
  <ellipse cx="32" cy="21" rx="22" ry="4" fill="#c9a36a" fill-opacity=".18"/>
  <ellipse cx="32" cy="21" rx="22" ry="4" fill="none" stroke="#c9a36a" stroke-width="2"/>
  <g fill="#c9a36a">
    <ellipse cx="26.5" cy="20.4" rx="2.5" ry="1.6" transform="rotate(-18 26.5 20.4)"/>
    <ellipse cx="32" cy="22.4" rx="2.5" ry="1.6" transform="rotate(12 32 22.4)"/>
    <ellipse cx="37.4" cy="20.2" rx="2.5" ry="1.6" transform="rotate(-8 37.4 20.2)"/>
    <rect x="30.4" y="42" width="3.2" height="13" rx="1.5"/>
    <ellipse cx="32" cy="56.4" rx="12" ry="2.8"/>
  </g>
</svg>`;
