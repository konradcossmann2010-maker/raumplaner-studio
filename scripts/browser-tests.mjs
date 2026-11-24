// Startet alle Browsertests, die ohne laufenden Server auskommen
// (sie laden dist/raumplaner-offline.html). Vorher: npm run build.
// Chromium: Playwright-eigenes (npx playwright install chromium)
// oder ein anderes über die Umgebungsvariable CHROMIUM_PATH.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const tests = [
  "offline-smoke",
  "price-input-smoke",
  "compositing-smoke",
  "visual-smoke",
  "furnishing-smoke",
  "recommendations-smoke",
  "audio-smoke",
  "pdf-codecs-smoke",
  "space-smoke",
];
const only = process.argv.slice(2);
if (!existsSync("dist/raumplaner-offline.html")) {
  console.error(
    "dist/raumplaner-offline.html fehlt – bitte zuerst npm run build.",
  );
  process.exit(1);
}
const failed = [];
for (const name of tests.filter((t) => !only.length || only.includes(t))) {
  console.log(`\n▶ ${name}`);
  const r = spawnSync(process.execPath, [`scripts/${name}.mjs`], {
    stdio: "inherit",
    timeout: 5 * 60 * 1000,
  });
  if (r.status !== 0) failed.push(name);
}
if (failed.length) {
  console.error(`\n✖ Fehlgeschlagen: ${failed.join(", ")}`);
  process.exit(1);
}
console.log("\n✔ Alle Browsertests bestanden.");
