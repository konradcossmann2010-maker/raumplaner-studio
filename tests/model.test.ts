import { describe, it, expect } from "vitest";
import {
  budget,
  moneyInput,
  projectSchema,
  newProject,
  csv,
  safeUrl,
} from "../src/model";
describe("budget", () => {
  it("counts quantity once regardless of repeated photo placements", () => {
    const p = newProject();
    p.items = [
      {
        id: "a",
        name: "Schrank",
        category: "Schrank",
        price: 19999,
        quantity: 2,
        merchant: "Shop",
        url: "https://example.com",
        image: "",
        observedAt: "",
      },
    ];
    p.shipping = { Shop: 3900 };
    expect(budget(p).total).toBe(43898);
    expect(budget(p).over).toBe(true);
  });
  it("does not call an incomplete total within budget", () => {
    const p = newProject();
    p.items = [
      {
        id: "a",
        name: "X",
        category: "X",
        price: null,
        quantity: 1,
        merchant: "Shop",
        url: "",
        image: "",
        observedAt: "",
      },
    ];
    expect(budget(p).complete).toBe(false);
  });
  it("handles German cents", () => expect(moneyInput("199,99")).toBe(19999));
  it("rejects invalid ranges and negative budgets", () => {
    const p = newProject();
    p.totalBudget = -1;
    expect(projectSchema.safeParse(p).success).toBe(false);
  });
  it("rejects script URLs", () =>
    expect(safeUrl("javascript:alert(1)")).toBe(""));
  it("escapes spreadsheet formulas in export", () => {
    const p = newProject();
    p.items = [
      {
        id: "a",
        name: "=CMD()",
        category: "X",
        price: 1,
        quantity: 1,
        merchant: "Shop",
        url: "",
        image: "",
        observedAt: "",
      },
    ];
    expect(csv(p)).toContain("'=CMD()");
  });
});
