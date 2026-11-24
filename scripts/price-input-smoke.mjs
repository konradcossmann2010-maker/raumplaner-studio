// Regressionstest: Preise Taste für Taste eintippen.
// Früher wurde aus „199.00“ beim Tippen „1990“, weil das Feld nach „199.0“
// sofort auf „199“ zurückgesetzt wurde. Außerdem: leerer Raumname darf das
// Speichern nicht blockieren und keine JSON-Fehlermeldung zeigen.
import { readFile } from "node:fs/promises";
import { chromium } from "playwright";
import assert from "node:assert/strict";

const html = await readFile("dist/raumplaner-offline.html", "utf8");
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  headless: true,
  args: ["--no-sandbox"],
});
const context = await browser.newContext({
  viewport: { width: 1200, height: 950 },
  offline: true,
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("dialog", (d) => d.accept());
const address = "http://127.0.0.1:9876/?offline=1";
await page.route(address, (r) =>
  r.fulfill({ contentType: "text/html", body: html }),
);
await page.goto(address);
await page.getByRole("button", { name: /Neuen Raum gestalten/ }).click();

await page
  .getByRole("button", { name: "Eigenen Produktlink hinzufügen" })
  .click();
await page.getByRole("textbox", { name: "Name", exact: true }).fill("Bett");
await page.getByRole("textbox", { name: "Händler", exact: true }).fill("Shop");
const price = page.getByRole("spinbutton", {
  name: "Einzelpreis",
  exact: true,
});
await price.click();
await price.pressSequentially("199.05");
assert.equal(await price.inputValue(), "199.05");
await page
  .getByRole("button", { name: "Möbel übernehmen", exact: true })
  .click();
await page.getByRole("button", { name: /Meine Auswahl/ }).click();
assert.match(await page.locator(".selected-card").innerText(), /199,05/);

// Gesamtbudget mit Nachkommastellen tippen
const total = page.getByRole("spinbutton", {
  name: "Gesamtbudget für diesen Raum",
  exact: true,
});
await total.fill("");
await total.pressSequentially("500.00");
assert.equal(await total.inputValue(), "500.00");
assert.match(await page.locator(".budget-numbers").innerText(), /500,00/);

// Leerer Raumname: trotzdem speichern, keine Fehlermeldung
await page.getByRole("textbox", { name: "Raumname" }).fill("");
await page.waitForTimeout(1600);
assert.match(await page.locator(".save-state").innerText(), /Gespeichert/);
assert.equal(await page.locator(".notification").count(), 0);

assert.deepEqual(errors, []);
await browser.close();
console.log("PASS: Preise Taste für Taste, Gesamtbudget, leerer Raumname.");
