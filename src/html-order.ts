import { pickupDays, pickupSlots, site } from "./config";
import { formatCents, parseSizes, type CoffeeType } from "./db";
import { drinkCard, invalidAttrs, statusChip } from "./html-cards";
import { esc, jsonScript, layout, mapsHref, telHref } from "./html-chrome";
import { ORDER_JS } from "./order-js";

const CATEGORY_LABEL: Record<string, string> = {
  specialty: "Specialty",
  coffee: "Coffee",
  pastry: "From the case",
  tea: "Tea",
};

/** What the customer typed, echoed back when the server rejects the order. */
export type OrderFormValues = {
  name?: string;
  contact?: string;
  pickup_day?: string;
  pickup_slot?: string;
  notes?: string;
};

export function orderPage(
  drinks: CoffeeType[],
  error?: string,
  notice?: string,
  values: OrderFormValues = {},
): string {
  const payload = drinks
    .filter((d) => d.available)
    .map((d) => ({ slug: d.slug, name: d.name, sizes: parseSizes(d.sizes_json) }));

  const cats: string[] = [];
  for (const d of drinks) if (!cats.includes(d.category)) cats.push(d.category);

  const catnav = cats.length
    ? `<nav class="catnav" aria-label="Menu sections"><div class="catnav__inner">${cats
        .map((c) => `<a href="#cat-${esc(c)}">${esc(CATEGORY_LABEL[c] ?? c)}</a>`)
        .join("")}</div></nav>`
    : "";

  const sections = cats
    .map((cat, i) => {
      const group = drinks.filter((d) => d.category === cat);
      return `<section class="menu-cat" id="cat-${esc(cat)}" aria-labelledby="cat-${esc(cat)}-h">
        <h2 id="cat-${esc(cat)}-h">${esc(CATEGORY_LABEL[cat] ?? cat)}</h2>
        <div class="grid">${group.map((d, j) => drinkCard(d, true, i === 0 && j === 0)).join("")}</div>
      </section>`;
    })
    .join("");

  const flash = error
    ? `<p class="notice notice--bad" role="alert" id="order-error" tabindex="-1">${esc(error)}</p>`
    : notice
      ? `<p class="notice notice--good" role="status">${esc(notice)}</p>`
      : "";

  const days = pickupDays();
  // Without JS there is no way to filter sizes per drink, so each option is a
  // real drink-and-size pair rather than a union that is wrong for most rows.
  const noscriptChoices = drinks
    .filter((d) => d.available)
    .flatMap((d) =>
      parseSizes(d.sizes_json).map((size) => ({
        value: `${d.slug}|${size.label}`,
        label: `${d.name} · ${size.label} · ${formatCents(size.cents)}`,
      })),
    );

  const body = `
  <form id="order-form" method="post" action="/api/order">
    <div class="wrap order-layout">
      <div>
        <div class="page-head">
          <p class="kicker">Order ahead</p>
          <h1>The menu</h1>
          <p class="recall" id="recall" hidden></p>
          ${flash}
          <p class="notice notice--bad nojs-note">JavaScript is off, so pick one drink on the ticket and send it through, or call the bar.</p>
        </div>
        ${catnav}
        ${
          drinks.length
            ? sections
            : `<div class="info-card"><h2 style="margin-top:0">The board is bare</h2><p class="muted" style="margin:0">Nothing is loaded on the menu right now. Give the bar a call on <a href="tel:${telHref()}">${esc(site.phone)}</a> and we will sort you out.</p></div>`
        }
      </div>

      <aside class="slip" id="slip" aria-labelledby="slip-h">
        <div class="slip__head">
          <h2 id="slip-h">Your slip</h2>
          <span class="slip__rule" aria-hidden="true"></span>
          ${statusChip()}
          <p class="slip__where"><a href="${mapsHref()}" target="_blank" rel="noopener">${esc(site.address)}</a><br><a href="tel:${telHref()}">${esc(site.phone)}</a></p>
        </div>
        <div class="slip__scroll">
          <p class="slip__empty" id="slip-empty">Nothing on the slip yet — add a drink.</p>
          <ul class="slip__lines" id="slip-lines" hidden></ul>
          <p class="slip__total" id="slip-total" hidden><span>Total at pickup</span><span id="slip-sum">$0.00</span></p>
          <div class="slip__guest">
            <div class="field">
              <label for="name">Name for the ticket</label>
              <input id="name" name="name" required maxlength="80" autocomplete="name" value="${esc(values.name ?? "")}"${invalidAttrs(error, "name", "order-error")}>
            </div>
            <div class="field">
              <label for="contact">Phone or email</label>
              <input id="contact" name="contact" required maxlength="120" autocomplete="tel" value="${esc(values.contact ?? "")}"${invalidAttrs(error, "contact", "order-error")}>
            </div>
            <div class="slip__when">
              <div class="field">
                <label for="pickup_day">Pickup day</label>
                <select id="pickup_day" name="pickup_day">
                  ${days
                    .map(
                      (d) =>
                        `<option value="${esc(d.value)}"${d.isToday ? ' data-today="1"' : ""}${
                          values.pickup_day === d.value ? " selected" : ""
                        }>${esc(d.label)}</option>`,
                    )
                    .join("")}
                </select>
              </div>
              <div class="field">
                <label for="pickup_slot">Pickup time</label>
                <select id="pickup_slot" name="pickup_slot"${invalidAttrs(error, "pickup", "order-error")}>
                  ${pickupSlots
                    .map((slot) => `<option${values.pickup_slot === slot ? " selected" : ""}>${slot}</option>`)
                    .join("")}
                </select>
              </div>
            </div>
            <p class="field__hint" id="slot-hint">Closed Mondays. Pickups 7:30am–3:30pm.</p>
            <div class="field">
              <label for="notes">Anything we should know?</label>
              <textarea id="notes" name="notes" maxlength="400" placeholder="Oat milk, extra hot, one fork…">${esc(values.notes ?? "")}</textarea>
            </div>
            <input type="hidden" name="pickup_at" id="pickup_at">
            <input type="hidden" name="items" id="items" value="[]">
            <noscript>
              <p class="notice notice--bad">JavaScript is off, so pick one item here and send it through.</p>
              <div class="field-row">
                <div class="field">
                  <label for="choice">Drink and size</label>
                  <select id="choice" name="choice">
                    ${noscriptChoices
                      .map((c) => `<option value="${esc(c.value)}">${esc(c.label)}</option>`)
                      .join("")}
                  </select>
                </div>
                <div class="field">
                  <label for="qty">Quantity</label>
                  <select id="qty" name="qty">${[1, 2, 3, 4, 5, 6].map((n) => `<option>${n}</option>`).join("")}</select>
                </div>
              </div>
            </noscript>
          </div>
        </div>
        <div class="slip__foot">
          <button class="btn btn--lg btn--wide" id="place-order" type="submit"${drinks.length ? "" : " disabled"}>Place order</button>
          <p class="slip__pay">Pay at pickup.</p>
        </div>
        <p class="sr-only" id="slip-live" role="status" aria-live="polite"></p>
      </aside>
    </div>

    <div class="dock" id="dock" hidden>
      <p class="dock__info"><span id="dock-count">Your slip is empty</span><strong id="dock-sum"></strong></p>
      <a class="btn" href="#slip" id="dock-cta">Review order</a>
    </div>
  </form>
  ${error ? `<script>(function(){var f=document.querySelector("#order-form [aria-invalid='true']")||document.getElementById("order-error");if(f){f.scrollIntoView({block:"center"});f.focus();}})();</script>` : ""}
  <script type="application/json" id="menu-data">${jsonScript(payload)}</script>
  <script>${ORDER_JS}</script>`;

  return layout({
    title: "Menu & order ahead in Holly Springs",
    path: "/menu",
    description:
      "Espresso martinis, brown sugar shaken espresso, pistachio cortado, Spanish latte and tiramisu. Order ahead in Holly Springs, NC and pay at pickup.",
    body,
    drinks: drinks.filter((d) => d.available),
  });
}

export function menuPage(drinks: CoffeeType[], error?: string, notice?: string): string {
  return orderPage(drinks, error, notice);
}
