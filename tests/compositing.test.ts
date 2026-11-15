import { it, expect } from "vitest";
import { removeBackground, placement } from "../src/compositing";
it("removes edge-connected plain background while preserving white furniture details", () => {
  const w = 9,
    h = 9,
    p = new Uint8ClampedArray(w * h * 4).fill(255);
  for (let y = 2; y < 7; y++)
    for (let x = 2; x < 7; x++) {
      const k = (y * w + x) * 4;
      p[k] = 60;
      p[k + 1] = 40;
      p[k + 2] = 20;
    }
  const center = (4 * w + 4) * 4;
  p[center] = p[center + 1] = p[center + 2] = 255;
  const r = removeBackground(p, w, h);
  expect(r.changed).toBe(true);
  expect(r.pixels[3]).toBe(0);
  expect(r.pixels[center + 3]).toBe(255);
  expect(r.bounds).toEqual({ x: 2, y: 2, width: 5, height: 5 });
});
it("never removes a solid product completely", () => {
  const r = removeBackground(new Uint8ClampedArray(5 * 5 * 4).fill(255), 5, 5);
  expect(r.changed).toBe(false);
  expect(r.pixels[3]).toBe(255);
});
it("places furniture upright on the floor without stretching its photo", () => {
  const r = placement({ width: 1200, height: 800 }, 200, 400, 0);
  expect(r.y + r.height).toBeCloseTo(0.86);
  expect((r.width * 1200) / (r.height * 800)).toBeCloseTo(0.5);
  expect(r.shadow).toBeGreaterThan(0);
});
it("keeps a very narrow product compatible with saved layer constraints", () => {
  const r = placement({ width: 2048, height: 512 }, 50, 2048);
  expect(r.width).toBeGreaterThanOrEqual(0.005);
  expect(r.height).toBeGreaterThanOrEqual(0.005);
  expect((r.width * 2048) / (r.height * 512)).toBeCloseTo(50 / 2048);
});
