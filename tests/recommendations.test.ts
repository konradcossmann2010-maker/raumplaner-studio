import { it, expect } from "vitest";
import { newProject } from "../src/model";
import { recommendProducts, productIdeas } from "../src/recommendations";
it("matches real named models to selected style and requested category", () => {
  const p = newProject();
  p.furnishing = { style: "Industrial", wanted: ["Schreibtisch", "Kommode"] };
  const groups = recommendProducts(p);
  expect(groups[0].products.map((p) => p.id)).toContain("fjallbo-desk");
  expect(groups[1].products).toHaveLength(0);
});
it("respects per-product price, category remaining cap and known total spending", () => {
  const p = newProject();
  p.furnishing = { style: "", wanted: ["Regal"] };
  p.limits.Regal = { min: 8000, max: 15000, cap: 9500 };
  expect(recommendProducts(p)[0].products).toHaveLength(0);
  p.limits.Regal.cap = 15000;
  expect(recommendProducts(p)[0].products.map((x) => x.id)).toEqual(["ivar"]);
  p.totalBudget = 5000;
  expect(recommendProducts(p)[0].products).toHaveLength(0);
});
it("uses safe model search links and does not pretend unknown categories have matches", () => {
  for (const p of productIdeas) {
    expect(new URL(p.url).hostname).toBe("www.ikea.com");
    expect(new URL(p.url).searchParams.get("q")).toBe(p.name);
  }
  const p = newProject();
  p.furnishing = { style: "Boho", wanted: ["Sondermöbel"] };
  expect(recommendProducts(p)[0].products).toEqual([]);
});
