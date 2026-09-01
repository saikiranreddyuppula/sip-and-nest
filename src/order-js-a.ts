export const ORDER_JS_A = `
(function () {
  var dataEl = document.getElementById("menu-data");
  var form = document.getElementById("order-form");
  if (!dataEl || !form) return;

  var menu = [];
  try { menu = JSON.parse(dataEl.textContent || "[]"); } catch (e) { return; }
  var bySlug = Object.create(null);
  menu.forEach(function (d) { bySlug[d.slug] = d; });

  var STORE = "sn-slip-v1";
  var MAX_LINES = 12;
  var MAX_QTY = 6;
  var cart = [];

  function money(cents) { return "$" + (cents / 100).toFixed(2); }

  function sizeFor(slug, label) {
    var drink = bySlug[slug];
    if (!drink) return null;
    for (var i = 0; i < drink.sizes.length; i++) {
      if (drink.sizes[i].label === label) return drink.sizes[i];
    }
    return null;
  }

  function load() {
    var raw;
    try { raw = localStorage.getItem(STORE); } catch (e) { return; }
    if (!raw) return;
    var saved;
    try { saved = JSON.parse(raw); } catch (e) { return; }
    if (!Array.isArray(saved)) return;
    saved.forEach(function (line) {
      if (!line || typeof line.slug !== "string") return;
      var size = sizeFor(line.slug, line.size);
      var qty = Math.min(MAX_QTY, Math.max(1, parseInt(line.qty, 10) || 0));
      if (size && cart.length < MAX_LINES) cart.push({ slug: line.slug, size: size.label, qty: qty });
    });
  }

  function save() {
    try { localStorage.setItem(STORE, JSON.stringify(cart)); } catch (e) {}
  }

  function announce(message) {
    var live = document.getElementById("slip-live");
    if (live) live.textContent = message;
  }

  function total() {
    return cart.reduce(function (sum, line) {
      var size = sizeFor(line.slug, line.size);
      return sum + (size ? size.cents * line.qty : 0);
    }, 0);
  }

  function render() {
    var empty = document.getElementById("slip-empty");
    var list = document.getElementById("slip-lines");
    var totalRow = document.getElementById("slip-total");
    var sumEl = document.getElementById("slip-sum");
    var field = document.getElementById("items");
    var dock = document.getElementById("dock");
    var dockCount = document.getElementById("dock-count");
    var dockSum = document.getElementById("dock-sum");
    var submit = document.getElementById("place-order");

    field.value = JSON.stringify(cart);
    if (submit) submit.disabled = cart.length === 0;

    if (!cart.length) {
      empty.hidden = false;
      list.hidden = true;
      list.textContent = "";
      totalRow.hidden = true;
      if (dock) dock.hidden = true;
      return;
    }

    empty.hidden = true;
    empty.classList.remove("notice", "notice--bad");
    list.hidden = false;
    totalRow.hidden = false;
    list.textContent = "";

    cart.forEach(function (line, index) {
      var drink = bySlug[line.slug];
      var size = sizeFor(line.slug, line.size);
      if (!drink || !size) return;
      var li = document.createElement("li");
      li.className = "slip__line";

      var name = document.createElement("span");
      name.className = "slip__name";
      name.textContent = drink.name;

      var cost = document.createElement("span");
      cost.className = "slip__cost";
      cost.textContent = money(size.cents * line.qty);

      var meta = document.createElement("span");
      meta.className = "slip__meta";

      var stepper = document.createElement("span");
      stepper.className = "stepper";
      stepper.setAttribute("role", "group");
      stepper.setAttribute("aria-label", "Quantity of " + drink.name);
      stepper.appendChild(stepBtn("-1", index, "One fewer " + drink.name));
      var out = document.createElement("output");
      out.textContent = String(line.qty);
      stepper.appendChild(out);
      stepper.appendChild(stepBtn("1", index, "One more " + drink.name));

      var label = document.createElement("span");
      label.textContent = size.label;

      var remove = document.createElement("button");
      remove.type = "button";
      remove.className = "slip__remove";
      remove.setAttribute("data-remove", String(index));
      remove.textContent = "Remove";
      remove.setAttribute("aria-label", "Remove " + drink.name + " from your slip");

      meta.appendChild(stepper);
      meta.appendChild(label);
      meta.appendChild(remove);

      li.appendChild(name);
      li.appendChild(cost);
      li.appendChild(meta);
      list.appendChild(li);
    });

    var sum = total();
    sumEl.textContent = money(sum);
    var count = cart.reduce(function (n, l) { return n + l.qty; }, 0);
    if (dock && dockCount && dockSum) {
      dock.hidden = false;
      dockCount.textContent = count === 1 ? "1 item on your slip" : count + " items on your slip";
      dockSum.textContent = money(sum) + " at pickup";
      var cta = document.getElementById("dock-cta");
      if (cta) cta.textContent = "Review order";
    }
  }

  function stepBtn(delta, index, label) {
    var b = document.createElement("button");
    b.type = "button";
    b.setAttribute("data-line-step", delta);
    b.setAttribute("data-line", String(index));
    b.setAttribute("aria-label", label);
    b.textContent = delta === "1" ? "+" : "\\u2212";
    return b;
  }

  function cardQty(slug) {
    var out = document.querySelector('[data-qty="' + CSS.escape(slug) + '"]');
    return out ? Math.min(MAX_QTY, Math.max(1, parseInt(out.textContent, 10) || 1)) : 1;
  }

  function setCardQty(slug, value) {
    var out = document.querySelector('[data-qty="' + CSS.escape(slug) + '"]');
    if (out) out.textContent = String(Math.min(MAX_QTY, Math.max(1, value)));
  }

  function add(slug) {
    var drink = bySlug[slug];
    if (!drink) return false;
    var picker = document.querySelector('[data-size="' + CSS.escape(slug) + '"]');
    var label = picker ? picker.value : (drink.sizes[0] && drink.sizes[0].label);
    var size = sizeFor(slug, label);
    if (!size) return false;
    var qty = cardQty(slug);

    var existing = null;
    cart.forEach(function (line) { if (line.slug === slug && line.size === size.label) existing = line; });
    if (existing) {
      if (existing.qty >= MAX_QTY) {
        announce("Six " + drink.name + " is the most we can put on one line. Give the bar a call for more.");
        return false;
      }
      existing.qty = Math.min(MAX_QTY, existing.qty + qty);
    } else {
      if (cart.length >= MAX_LINES) {
`;
