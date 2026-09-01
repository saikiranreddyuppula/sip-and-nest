import { site } from "./config";
import { formatCents, parseSizes, type CoffeeType } from "./db";
import { HOURS, esc, img, layout } from "./html-chrome";

/**
 * Which control an error belongs to, so the field can be marked invalid and
 * pointed at the message instead of the message just sitting nearby.
 */
export function invalidAttrs(error: string | undefined, field: string, errorId: string): string {
  if (!error) return "";
  const owner =
    error.startsWith("Name is required") ? "name"
    : error.startsWith("A phone number or email") ? "contact"
    : error.startsWith("Choose a pickup time") || error.startsWith("We cannot make that one") ? "pickup"
    : error.startsWith("Write a short note") ? "body"
    : "";
  return owner === field ? ` aria-invalid="true" aria-describedby="${errorId}"` : "";
}

function priceLabel(drink: CoffeeType): string {
  const sizes = parseSizes(drink.sizes_json);
  if (!sizes.length) return formatCents(drink.price_cents);
  const min = Math.min(...sizes.map((s) => s.cents));
  return sizes.length === 1 ? formatCents(min) : `from ${formatCents(min)}`;
}

const CARD_SIZES = "(min-width: 1100px) 340px, (min-width: 700px) 45vw, 92vw";

export function drinkCard(drink: CoffeeType, interactive: boolean, eager = false): string {
  const sizes = parseSizes(drink.sizes_json);
  const soldOut = !drink.available;
  const media = drink.image
    ? `<div class="card__media">${img({
        src: drink.image,
        // the drink name is in the <h3> directly below, so the photo is decorative here
        alt: "",
        width: 1200,
        height: 800,
        sizes: CARD_SIZES,
        priority: eager,
      })}${soldOut ? `<p class="card__flag">Sold out today</p>` : ""}</div>`
    : "";

  let actions: string;
  if (soldOut) {
    actions = `<p class="small muted" style="margin:0">Back on the board soon.</p>`;
  } else if (interactive) {
    const sizeField =
      sizes.length > 1
        ? `<select data-size="${esc(drink.slug)}" aria-label="Size for ${esc(drink.name)}">${sizes
            .map((s) => `<option value="${esc(s.label)}">${esc(s.label)} · ${formatCents(s.cents)}</option>`)
            .join("")}</select>`
        : `<input type="hidden" data-size="${esc(drink.slug)}" value="${esc(sizes[0]?.label ?? "")}">`;
    actions = `${sizeField}
        <button type="button" class="btn" data-add="${esc(drink.slug)}">Add<span class="sr-only"> ${esc(drink.name)} to your slip</span></button>`;
  } else {
    actions = `<a class="btn btn--ghost" href="/menu#${esc(drink.slug)}">Order ahead<span class="sr-only"> — ${esc(drink.name)}</span></a>`;
  }

  return `<article class="card${soldOut ? " card--out" : ""}" id="${esc(drink.slug)}">
    ${media}
    <div class="card__body">
      <div class="card__head">
        <h3 class="card__name">${esc(drink.name)}</h3>
        <p class="card__price">${esc(priceLabel(drink))}</p>
      </div>
      ${interactive ? `<p class="card__desc">${esc(drink.description)}</p>` : ""}
      <div class="card__actions${interactive && !soldOut ? " js-only" : ""}">${actions}</div>
    </div>
  </article>`;
}

function hoursList(): string {
  const monday = HOURS[0];
  const open = HOURS[1];
  return `<ul class="hours">
    <li data-open-days><span>Tuesday–Sunday</span><span class="tabular">${esc(open[1])}</span></li>
    <li data-day="${esc(monday[0])}"><span>${esc(monday[0])}</span><span>${esc(monday[1])}</span></li>
  </ul>`;
}

export function statusChip(): string {
  return `<p class="status status--plain" data-status data-open="unknown">
    <span class="status__dot" aria-hidden="true"></span>
    <span data-status-text>Tue–Sun · 7:30am–4pm · closed Monday</span>
  </p>`;
}

/** What the visitor typed, echoed back when their note is rejected. */
export type MessageFormValues = { name?: string; contact?: string; body?: string };

function contactForm(notice?: string, error?: string, values: MessageFormValues = {}): string {
  const flash = error
    ? `<p class="notice notice--bad" role="alert" id="note-error" tabindex="-1">${esc(error)}</p>`
    : notice
      ? `<p class="notice notice--good" role="status">${esc(notice)}</p>`
      : "";
  return `<div class="note">
    <p class="kicker">The bar</p>
    <h3>Leave us a note</h3>
    <p class="small muted">Catering, a big order, a lost umbrella — we read every one.</p>
    ${flash}
    <form method="post" action="/api/message">
      <div class="field">
        <label for="mname">Your name</label>
        <input id="mname" name="name" required maxlength="80" autocomplete="name" value="${esc(values.name ?? "")}"${invalidAttrs(error, "name", "note-error")}>
      </div>
      <div class="field">
        <label for="mcontact">Phone or email</label>
        <input id="mcontact" name="contact" required maxlength="120" autocomplete="email" value="${esc(values.contact ?? "")}"${invalidAttrs(error, "contact", "note-error")}>
        <p class="field__hint" id="mcontact-hint">So we can write back.</p>
      </div>
      <div class="field">
        <label for="mbody">Message</label>
        <textarea id="mbody" name="body" required maxlength="1000"${invalidAttrs(error, "body", "note-error")}>${esc(values.body ?? "")}</textarea>
      </div>
      <div class="trap" aria-hidden="true">
        <label for="mfax">Leave this empty</label>
        <input id="mfax" name="fax" tabindex="-1" autocomplete="off">
      </div>
      <button class="btn btn--wide" type="submit">Send note</button>
    </form>
  </div>`;
}

export function homePage(
  drinks: CoffeeType[],
  opts: { notice?: string; error?: string; values?: MessageFormValues } = {},
): string {
  const available = drinks.filter((d) => d.available);
  const ordered = available
    .filter((d) => d.featured)
    .concat(available.filter((d) => !d.featured));

  const body = `
  <section class="hero">
    ${img({
      src: "/img/hero.webp",
      alt: "An espresso martini on the bar, three beans on the foam",
      width: 1536,
      height: 1024,
      sizes: "100vw",
      className: "hero__photo",
      priority: true,
    })}
    <div class="hero__shade" aria-hidden="true"></div>
    <div class="wrap hero__copy">
      <p class="kicker">${esc(site.city)}, North Carolina</p>
      <h1>Sip, then nest.</h1>
      <p class="btn-row"><a class="btn btn--lg" href="/menu">Order ahead</a></p>
    </div>
  </section>

  <section class="section" aria-labelledby="short-list">
    <div class="wrap section__head">
      <p class="kicker">On the bar</p>
      <h2 id="short-list">Drinks</h2>
    </div>
    <div class="wrap grid grid--photos">${ordered.map((d, i) => drinkCard(d, false, i === 0)).join("")}</div>
  </section>

  <figure class="stage">
    ${img({
      src: "/img/machine.webp",
      alt: "An espresso machine on the wood bar, two cups waiting",
      width: 1400,
      height: 933,
      sizes: "100vw",
      className: "stage__photo",
    })}
    <figcaption class="stage__copy">
      <div class="wrap">
        <p class="kicker">Pickup only</p>
        <p class="stage__line">Made to order. Pay at the counter.</p>
      </div>
    </figcaption>
  </figure>

  <section class="section" id="about" aria-labelledby="about-h">
    <div class="wrap split">
      <div>
        <p class="kicker">Hartness Drive</p>
        <h2 id="about-h">About</h2>
        <p>A small specialty coffee bar on Hartness Drive. Espresso in the morning, shaken over ice through the afternoon, and espresso martinis before we close.</p>
        <p class="muted">Everything is made to order. There is a notes box on every order — tell us how you take it. Closed Mondays.</p>
        <div id="visit">${hoursList()}</div>
      </div>
      <div id="contact">
        ${contactForm(opts.notice, opts.error, opts.values)}
        ${opts.error ? `<script>(function(){var f=document.querySelector("#contact [aria-invalid='true']")||document.getElementById("note-error");if(f){f.scrollIntoView({block:"center"});f.focus();}})();</script>` : ""}
      </div>
    </div>
  </section>`;

  return layout({
    title: "Home",
    path: "/",
    description:
      "Specialty coffee bar in Holly Springs, NC. Espresso martinis, shaken espresso, cortados and pastry. Order ahead, pay at pickup. Open Tue–Sun, 7:30am–4pm.",
    body,
    drinks: available,
  });
}
