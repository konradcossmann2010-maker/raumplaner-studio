import { it, expect } from "vitest";
import { ceilingAt, footprint, evaluateFit, defaultRoom } from "../src/space";
const size = { width: 1, height: 2, depth: 0.6 };
const object = (id: string, x = 1, z = 1) => ({
  id,
  kind: "furniture" as const,
  itemId: id,
  x,
  y: 0,
  z,
  rotation: 0,
});
const item = (id: string, dimensions: any = size) => ({
  id,
  name: id,
  dimensions,
});
it("calculates the usable height under a measured roof slope", () => {
  const r = {
    ...defaultRoom(),
    slopes: [{ id: "s", wall: "left" as const, knee: 1, run: 2 }],
  };
  expect(ceilingAt(r, 0, 2)).toBe(1);
  expect(ceilingAt(r, 2, 2)).toBe(2.5);
  expect(ceilingAt(r, 1, 2)).toBe(1.75);
});
it("flags furniture that protrudes through a roof slope", () => {
  const r = {
    ...defaultRoom(),
    confirmed: true,
    slopes: [{ id: "s", wall: "left" as const, knee: 1, run: 2 }],
  };
  const result = evaluateFit(r, [object("a", 0.6, 2)], [item("a")]);
  expect(result[0].issues.join(" ")).toMatch(/Dach|Decke/);
});
it("does not call an unmeasured item a fit", () => {
  const result = evaluateFit(
    { ...defaultRoom(), confirmed: true },
    [object("a")],
    [item("a", null)],
  );
  expect(result[0].known).toBe(false);
});
it("checks rotated footprints and allows touching without overlap", () => {
  const r = { ...defaultRoom(), confirmed: true };
  const os = [object("a", 1, 1), object("b", 2, 1)];
  expect(
    evaluateFit(r, os, [item("a"), item("b")]).every((r) => !r.issues.length),
  ).toBe(true);
  os[1].x = 1.8;
  expect(
    evaluateFit(r, os, [item("a"), item("b")])[0].issues.join(" "),
  ).toMatch(/Überlappt/);
  expect(footprint({ ...os[0], rotation: 90 }, size)[0].x).toBeCloseTo(1.3);
});
it("flags the floor and walls without silently clamping positions", () => {
  const r = { ...defaultRoom(), confirmed: true };
  const o = { ...object("a", -0.1), y: -0.2 };
  expect(evaluateFit(r, [o], [item("a")])[0].issues.join(" ")).toMatch(/Wand/);
  expect(evaluateFit(r, [o], [item("a")])[0].issues.join(" ")).toMatch(/Boden/);
});
it("orients the rendered +Z speaker face toward its target in a rectangular room", async () => {
  const { speakerYaw } = await import("../src/space");
  for (const [dx, dz] of [
    [3, 0],
    [-3, 0],
    [2, 5],
  ]) {
    const yaw = (speakerYaw(dx, dz) * Math.PI) / 180;
    expect(Math.sin(-yaw)).toBeCloseTo(dx / Math.hypot(dx, dz));
    expect(Math.cos(-yaw)).toBeCloseTo(dz / Math.hypot(dx, dz));
  }
});
it("draws roof and wall breakpoints at the exact analytical clearance height", async () => {
  const { roomSurfaces } = await import("../src/space");
  const r = {
    ...defaultRoom(),
    slopes: [{ id: "s", wall: "left" as const, knee: 1, run: 0.3 }],
  };
  const mesh = roomSurfaces(r);
  expect(
    mesh.roof.some((v, i) => i % 3 === 0 && Math.abs(v - 0.3) < 1e-8),
  ).toBe(true);
  for (let i = 0; i < mesh.roof.length; i += 9) {
    const x = (mesh.roof[i] + mesh.roof[i + 3] + mesh.roof[i + 6]) / 3,
      y = (mesh.roof[i + 1] + mesh.roof[i + 4] + mesh.roof[i + 7]) / 3,
      z = (mesh.roof[i + 2] + mesh.roof[i + 5] + mesh.roof[i + 8]) / 3;
    expect(y).toBeCloseTo(ceilingAt(r, x, z), 8);
  }
  expect(
    mesh.walls.some((v, i) => i % 3 === 0 && Math.abs(v - 0.3) < 1e-8),
  ).toBe(true);
});
it("separates parallel rotated furniture rather than using overlapping axis-aligned bounds", () => {
  const r = { ...defaultRoom(), confirmed: true };
  const sizes = { width: 2, height: 1, depth: 0.2 };
  const a = { ...object("a", 1.2, 1.2), rotation: 45 },
    b = { ...object("b", 1.2, 1.7), rotation: 45 };
  expect(
    evaluateFit(r, [a, b], [item("a", sizes), item("b", sizes)])[0].issues.some(
      (s) => s.includes("Überlappt"),
    ),
  ).toBe(false);
  b.z = 1.35;
  expect(
    evaluateFit(r, [a, b], [item("a", sizes), item("b", sizes)])[0].issues.some(
      (s) => s.includes("Überlappt"),
    ),
  ).toBe(true);
});
it("keeps intersecting roof plane meshes on the analytical surface", async () => {
  const { roomSurfaces } = await import("../src/space");
  const r = {
    ...defaultRoom(),
    slopes: [
      { id: "l", wall: "left" as const, knee: 0.8, run: 1.1 },
      { id: "r", wall: "right" as const, knee: 1.2, run: 0.7 },
      { id: "f", wall: "front" as const, knee: 1, run: 1.4 },
    ],
  };
  const mesh = roomSurfaces(r);
  for (let i = 0; i < mesh.roof.length; i += 9) {
    const x = (mesh.roof[i] + mesh.roof[i + 3] + mesh.roof[i + 6]) / 3,
      y = (mesh.roof[i + 1] + mesh.roof[i + 4] + mesh.roof[i + 7]) / 3,
      z = (mesh.roof[i + 2] + mesh.roof[i + 5] + mesh.roof[i + 8]) / 3;
    expect(y).toBeCloseTo(ceilingAt(r, x, z), 8);
  }
});
