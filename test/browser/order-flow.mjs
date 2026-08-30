/**
 * The customer-facing half of the redesign: everything that lives in the two
 * inline scripts and therefore cannot be reached from the Workers test suite.
 */
import { chromium } from "playwright-core";

const BASE = process.env.BASE ?? "http://127.0.0.1:8787";
const EXECUTABLE = process.env.CHROMIUM_PATH ?? undefined;

let failures = 0;
function check(name, condition, detail) {
  if (condition) {
    console.log(`  ok   ${name}`);
  } else {
    failures++;
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

const browser = await chromium.launch({ executablePath: EXECUTABLE, args: ["--no-sandbox"] });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();
const consoleErrors = [];
page.on("pageerror", (e) => consoleErrors.push(String(e.message)));
page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text()));

console.log("slip");
await page.goto(`${BASE}/menu`, { waitUntil: "networkidle" });
await page.click('[data-step="1"][data-for="espresso-martini"]');
await page.click('[data-add="espresso-martini"]');
const afterAdd = await page.evaluate(() => ({
  items: document.getElementById("items").value,
  sum: document.getElementById("slip-sum").textContent,
  announced: document.getElementById("slip-live").textContent,
  dockHidden: document.getElementById("dock").hidden,
}));
check("adding writes the hidden items field", afterAdd.items.includes("espresso-martini"), afterAdd.items);
check("two of a drink totals $24.00", afterAdd.sum === "$24.00", afterAdd.sum);
check("the change is announced", /added/i.test(afterAdd.announced), afterAdd.announced);
check("the mobile dock appears", afterAdd.dockHidden === false);

await page.reload({ waitUntil: "networkidle" });
check(
  "the slip survives a reload",
  (await page.evaluate(() => document.getElementById("slip-sum").textContent)) === "$24.00",
);

console.log("quantity and focus");
await page.click('#slip-lines [data-line-step="-1"]');
check(
  "stepping down halves the total",
  (await page.evaluate(() => document.getElementById("slip-sum").textContent)) === "$12.00",
);
await page.click('[data-add="tiramisu"]');
await page.click('#slip-lines [data-remove="0"]');
const focused = await page.evaluate(() => document.activeElement.getAttribute("aria-label") ?? "");
check("focus lands on a Remove button, never a stepper", /^Remove /.test(focused), focused);

console.log("guards");
const p2 = await context.newPage();
await p2.goto(`${BASE}/menu`, { waitUntil: "networkidle" });
await p2.evaluate(() => localStorage.removeItem("sn-slip-v1"));
await p2.reload({ waitUntil: "networkidle" });
await p2.fill("#name", "Empty Slip");
await p2.fill("#contact", "empty@example.com");
await p2.click('button[type="submit"]');
await p2.waitForTimeout(400);
check("an empty slip cannot be submitted", p2.url().endsWith("/menu"), p2.url());

await p2.evaluate(() =>
  localStorage.setItem(
    "sn-slip-v1",
    JSON.stringify([
      { slug: "constructor", size: "x", qty: 1 },
      { slug: "espresso-martini", size: "5oz", qty: 99 },
      { slug: "no-longer-on-the-menu", size: "5oz", qty: 1 },
    ]),
  ),
);
await p2.reload({ waitUntil: "networkidle" });
const restored = await p2.evaluate(() => ({
  lines: document.querySelectorAll("#slip-lines li").length,
  sum: document.getElementById("slip-sum").textContent,
}));
check("a poisoned stored slip is sanitised", restored.lines === 1 && restored.sum === "$72.00", JSON.stringify(restored));

console.log("pickup slots");
const slots = await p2.evaluate(() => {
  const day = document.getElementById("pickup_day");
  const slot = document.getElementById("pickup_slot");
  return {
    days: [...day.options].map((o) => o.value),
    anyMonday: [...day.options].some((o) => o.value.startsWith("Mon")),
    disabled: [...slot.options].filter((o) => o.disabled).length,
    selectedEnabled: !slot.selectedOptions[0].disabled,
  };
});
check("no closed day is offered", slots.anyMonday === false, slots.days.join(", "));
check("the selected slot is always one we can make", slots.selectedEnabled);

console.log("chrome");
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
await page.keyboard.press("Tab");
check(
  "the skip link is the first tab stop",
  (await page.evaluate(() => document.activeElement.className)) === "skip",
);
const chip = await page.evaluate(() => {
  const el = document.querySelector("[data-status]");
  return { state: el.getAttribute("data-open"), text: el.textContent.trim() };
});
check("the open/closed chip resolves", chip.state !== "unknown", JSON.stringify(chip));
await page.click("#theme-toggle");
const themed = await page.evaluate(() => ({
  attr: document.documentElement.getAttribute("data-theme"),
  stored: localStorage.getItem("sn-theme"),
  pressed: document.getElementById("theme-toggle").getAttribute("aria-pressed"),
}));
check("the theme toggle persists and reports its state", themed.attr === themed.stored && themed.pressed === (themed.attr === "dark" ? "true" : "false"), JSON.stringify(themed));

console.log("responsive images");
const missing = await page.evaluate(async () => {
  const urls = new Set();
  for (const img of document.querySelectorAll("img[srcset]")) {
    for (const candidate of img.getAttribute("srcset").split(",")) {
      urls.add(candidate.trim().split(/\s+/)[0]);
    }
  }
  const bad = [];
  for (const url of urls) {
    const response = await fetch(url, { method: "HEAD" });
    if (!response.ok) bad.push(`${url} -> ${response.status}`);
  }
  return bad;
});
check("every srcset candidate exists", missing.length === 0, missing.join(", "));

check("no console errors anywhere", consoleErrors.length === 0, consoleErrors.join(" | "));

await browser.close();
console.log(failures ? `\n${failures} check(s) failed` : "\nall checks passed");
process.exit(failures ? 1 : 0);
