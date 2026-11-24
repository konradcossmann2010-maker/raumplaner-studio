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
  it("writes German decimal commas so Excel does not turn prices into dates", () => {
    const p = newProject();
    p.items = [
      {
        id: "a",
        name: "Regal",
        category: "Regal",
        price: 1250,
        quantity: 1,
        merchant: "Shop",
        url: "",
        image: "",
        observedAt: "",
      },
    ];
    expect(csv(p)).toContain('"12,50"');
    expect(csv(p)).not.toContain("12.50");
  });
});
it("rejects malformed product URLs from a backup", () => {
  const p = newProject();
  p.items = [
    {
      id: "a",
      name: "X",
      category: "X",
      price: 1,
      quantity: 1,
      merchant: "Shop",
      url: "not a URL",
      image: "",
      observedAt: "",
    },
  ];
  expect(projectSchema.safeParse(p).success).toBe(false);
});
it("rejects layers referencing missing furniture", () => {
  const p = newProject();
  p.scenes = [
    {
      id: "s",
      name: "Raum",
      image: "",
      width: 800,
      height: 500,
      layers: [
        {
          id: "l",
          itemId: "missing",
          x: 0,
          y: 0,
          width: 1,
          height: 1,
          rotation: 0,
          flip: false,
        },
      ],
    },
  ];
  expect(projectSchema.safeParse(p).success).toBe(false);
});
it("keeps owned furniture in the plan but excludes its price and shipping from purchases", () => {
  const p = newProject();
  const base = {
    id: "owned",
    name: "Bett",
    category: "Bett",
    price: null,
    quantity: 1,
    merchant: "Alt",
    url: "",
    image: "",
    observedAt: "",
  };
  p.items = [
    { ...base, owned: true },
    {
      ...base,
      id: "new",
      name: "Schrank",
      category: "Schrank",
      merchant: "Shop",
      price: 20000,
    },
  ];
  p.shipping = { Alt: 9000, Shop: 1000 };
  expect(budget(p)).toMatchObject({
    total: 21000,
    complete: true,
    merchants: ["Shop"],
  });
  expect(csv(p)).not.toContain('"Bett"');
  expect(projectSchema.parse(p).items[0].owned).toBe(true);
});
