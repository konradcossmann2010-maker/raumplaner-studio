import { it, expect } from "vitest";
import {
  recommendSpeakers,
  planPoint,
  roomPoint,
  defaultAudio,
} from "../src/audio";
it("distributes four music speakers over both halves of the whole room", () => {
  const a = { ...defaultAudio(), mode: "coverage" as const, count: 4 as const };
  const s = recommendSpeakers(a);
  expect(s).toHaveLength(4);
  expect(s.filter((x) => x.x < 0.5)).toHaveLength(2);
  expect(new Set(s.map((x) => x.y)).size).toBe(2);
  for (const p of s) {
    expect(p.x).toBeGreaterThan(0);
    expect(p.y).toBeLessThan(1);
  }
});
it("uses physical room dimensions for the stereo angle", () => {
  const a = {
    ...defaultAudio(),
    mode: "cinema" as const,
    system: "2.0" as const,
    roomWidth: 8,
    roomLength: 3,
  };
  const s = recommendSpeakers(a);
  for (const p of s) {
    const dx = (p.x - a.listener.x) * a.roomWidth,
      dy = (p.y - a.listener.y) * a.roomLength;
    expect(Math.abs((Math.atan2(dx, -dy) * 180) / Math.PI)).toBeCloseTo(30);
  }
});
it("keeps every home theatre configuration inside the marked room", () => {
  for (const system of ["2.0", "2.1", "5.1", "7.1"] as const) {
    const a = { ...defaultAudio(), mode: "cinema" as const, system };
    const s = recommendSpeakers(a);
    expect(s).toHaveLength(
      Number(system.split(".")[0]) + Number(system.split(".")[1]),
    );
    for (const p of s) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(1);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(1);
    }
  }
});
it("round-trips marked room coordinates for every front wall", () => {
  for (const front of ["top", "left", "right", "bottom"] as const) {
    const a = {
      ...defaultAudio(),
      front,
      room: { x: 0.1, y: 0.2, width: 0.4, height: 0.5 },
    };
    const p = planPoint(a, { x: 0.25, y: 0.7 });
    const local = roomPoint(a, p);
    expect(local.x).toBeCloseTo(0.25);
    expect(local.y).toBeCloseTo(0.7);
  }
});
it("puts desk speakers on a circle at the chosen listening distance", () => {
  const a = {
    ...defaultAudio(),
    mode: "cinema" as const,
    system: "2.0" as const,
    roomWidth: 3.5,
    roomLength: 4.5,
    listener: { x: 0.5, y: 0.6 },
  };
  const meters = (p: { x: number; y: number }) =>
    Math.hypot(
      (p.x - a.listener.x) * a.roomWidth,
      (p.y - a.listener.y) * a.roomLength,
    );
  const wall = recommendSpeakers(a);
  const desk = recommendSpeakers({ ...a, distance: 1.2 });
  expect(desk).toHaveLength(2);
  for (const p of desk) {
    expect(meters(p)).toBeCloseTo(1.2);
    const dx = (p.x - a.listener.x) * a.roomWidth,
      dy = (p.y - a.listener.y) * a.roomLength;
    expect(Math.abs((Math.atan2(dx, -dy) * 180) / Math.PI)).toBeCloseTo(30);
  }
  // Ohne Abstand stehen sie weiter weg an der Wand; zu großer Abstand endet an der Wand
  for (const p of wall) expect(meters(p)).toBeGreaterThan(2);
  expect(recommendSpeakers({ ...a, distance: 20 })).toEqual(wall);
  // 5.1 mit festem Abstand: alle Lautsprecher außer dem Subwoofer auf demselben Kreis
  const circle = recommendSpeakers({ ...a, system: "5.1", distance: 1.2 });
  for (const p of circle.filter((s) => s.kind === "speaker"))
    expect(meters(p)).toBeCloseTo(1.2);
  // Passt der Kreis nicht mehr in den Raum, bleibt der Lautsprecher an der Wand
  const tight = recommendSpeakers({ ...a, system: "5.1", distance: 1.5 });
  const sl = tight.find((s) => s.id === "SL")!;
  expect(meters(sl)).toBeLessThan(1.5);
  expect(sl.x).toBeGreaterThanOrEqual(0);
});
