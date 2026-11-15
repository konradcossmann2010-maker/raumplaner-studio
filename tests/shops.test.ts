import { it, expect } from "vitest";
import { shopSearches } from "../src/shops";
it("creates normal shop links without keys with encoded search and euro limits", () => {
  const links = shopSearches("Schrank Schwarz & Eiche", 10000, 40000);
  expect(links.length).toBeGreaterThan(2);
  const google = new URL(links.find((l) => l.name === "Google Shopping")!.url);
  expect(google.searchParams.get("q")).toBe("Schrank Schwarz & Eiche");
  expect(google.searchParams.get("tbs")).toContain("ppr_max:400");
  for (const link of links) expect(link.url).not.toMatch(/api_key|serpapi/);
});
it("rejects inverted budgets before opening a search", () =>
  expect(() => shopSearches("Schrank", 50000, 20000)).toThrow());
