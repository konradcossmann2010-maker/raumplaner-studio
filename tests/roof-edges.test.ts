import { it, expect } from "vitest";
import { findDiagonalCandidates } from "../src/roof-edges";
it("suggests diagonal image edges without claiming measured roof geometry", () => {
  const w = 120,
    h = 90,
    p = new Uint8ClampedArray(w * h * 4).fill(255);
  for (let x = 10; x < 110; x++) {
    const y = Math.round(75 - x * 0.5);
    for (let d = -1; d <= 1; d++)
      for (let c = 0; c < 3; c++) p[((y + d) * w + x) * 4 + c] = 0;
  }
  const r = findDiagonalCandidates(p, w, h);
  expect(r.length).toBeGreaterThan(0);
  expect(r[0].start.x).toBeGreaterThanOrEqual(0);
  expect(r[0].end.x).toBeLessThanOrEqual(1);
});
it("returns no roof candidates for a flat image", () =>
  expect(
    findDiagonalCandidates(
      new Uint8ClampedArray(100 * 80 * 4).fill(255),
      100,
      80,
    ),
  ).toEqual([]));
