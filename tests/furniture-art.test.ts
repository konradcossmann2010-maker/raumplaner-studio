import { it, expect } from "vitest";
import { furnitureArt, furnitureImage } from "../src/furniture-art";
it("draws distinct furniture categories locally without inventing product measurements", () => {
  const bed = furnitureArt("Bett"),
    shelf = furnitureArt("Regal");
  expect(bed.image).not.toBe(shelf.image);
  expect(bed.image).toMatch(/^data:image\/svg/);
  expect(decodeURIComponent(bed.image)).not.toContain("http://www.ikea");
  expect(furnitureArt("Bett", "Industrial").image).not.toBe(bed.image);
});
it("always gives real product images priority over schematic drawings", () =>
  expect(
    furnitureImage({ image: "data:image/png;base64,abc", category: "Bett" }),
  ).toBe("data:image/png;base64,abc"));
