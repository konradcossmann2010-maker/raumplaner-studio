export interface Dimensions {
  width: number;
  height: number;
  depth: number;
}
export interface Slope {
  id: string;
  wall: "left" | "right" | "front" | "back";
  knee: number;
  run: number;
  source?: "manual" | "photo-confirmed";
  photoId?: string;
}
export interface RoomObject {
  id: string;
  kind: "furniture" | "speaker" | "sub";
  itemId?: string;
  label?: string;
  x: number;
  y: number;
  z: number;
  rotation: number;
  dimensions?: Dimensions;
}
export interface Room3D {
  width: number;
  length: number;
  height: number;
  confirmed: boolean;
  slopes: Slope[];
  objects: RoomObject[];
  audioSystem: "coverage" | "2.0" | "2.1" | "5.1" | "7.1";
  audioCount: 2 | 4 | 6;
}
export interface SizedItem {
  id: string;
  name: string;
  dimensions?: Dimensions;
}
export function defaultRoom(): Room3D {
  return {
    width: 4,
    length: 6,
    height: 2.5,
    confirmed: false,
    slopes: [],
    objects: [],
    audioSystem: "coverage",
    audioCount: 4,
  };
}
export function ceilingAt(r: Room3D, x: number, z: number) {
  let h = r.height;
  for (const s of r.slopes) {
    const distance =
      s.wall === "left"
        ? x
        : s.wall === "right"
          ? r.width - x
          : s.wall === "front"
            ? z
            : r.length - z;
    h = Math.min(
      h,
      s.knee + ((r.height - s.knee) * Math.max(0, distance)) / s.run,
    );
  }
  return h;
}
export function dimensionsOf(o: RoomObject, items: SizedItem[]) {
  return o.kind === "furniture"
    ? items.find((i) => i.id === o.itemId)?.dimensions
    : o.dimensions;
}
export function footprint(o: RoomObject, size: Dimensions) {
  const a = (o.rotation * Math.PI) / 180,
    c = Math.cos(a),
    s = Math.sin(a);
  return [
    [-0.5, -0.5],
    [0.5, -0.5],
    [0.5, 0.5],
    [-0.5, 0.5],
  ].map(([u, v]) => ({
    x: o.x + u * size.width * c - v * size.depth * s,
    z: o.z + u * size.width * s + v * size.depth * c,
  }));
}
function overlap(a: { x: number; z: number }[], b: { x: number; z: number }[]) {
  for (const polygon of [a, b])
    for (let i = 0; i < 4; i++) {
      const p = polygon[i],
        q = polygon[(i + 1) % 4],
        dx = q.x - p.x,
        dz = q.z - p.z,
        n = Math.hypot(dx, dz),
        axis = { x: -dz / n, z: dx / n };
      const aa = a.map((p) => p.x * axis.x + p.z * axis.z),
        bb = b.map((p) => p.x * axis.x + p.z * axis.z);
      if (
        Math.min(...aa) >= Math.max(...bb) - 0.0001 ||
        Math.min(...bb) >= Math.max(...aa) - 0.0001
      )
        return false;
    }
  return true;
}
export function objectLabel(o: RoomObject, items: SizedItem[]) {
  return o.label ?? items.find((i) => i.id === o.itemId)?.name ?? "Objekt";
}
export function evaluateFit(
  r: Room3D,
  objects: RoomObject[],
  items: SizedItem[],
) {
  const results = objects.map((o) => {
    const size = dimensionsOf(o, items);
    const issues: string[] = [];
    if (!r.confirmed) issues.push("Raummaße noch nicht bestätigt");
    if (!size) issues.push("Objektmaße fehlen");
    if (size) {
      const corners = footprint(o, size);
      if (
        corners.some(
          (p) =>
            p.x < -0.0001 ||
            p.x > r.width + 0.0001 ||
            p.z < -0.0001 ||
            p.z > r.length + 0.0001,
        )
      )
        issues.push("Ragt durch eine Wand");
      if (o.y < -0.0001) issues.push("Ragt unter den Boden");
      if (
        corners.some((p) => o.y + size.height > ceilingAt(r, p.x, p.z) + 0.0001)
      )
        issues.push("Zu hoch unter Dachschräge / Decke");
    }
    return { id: o.id, known: r.confirmed && !!size, issues };
  });
  for (let i = 0; i < objects.length; i++)
    for (let j = i + 1; j < objects.length; j++) {
      const a = objects[i],
        b = objects[j],
        da = dimensionsOf(a, items),
        db = dimensionsOf(b, items);
      if (
        !da ||
        !db ||
        a.y + da.height <= b.y + 0.0001 ||
        b.y + db.height <= a.y + 0.0001
      )
        continue;
      if (overlap(footprint(a, da), footprint(b, db))) {
        results[i].issues.push("Überlappt mit " + objectLabel(b, items));
        results[j].issues.push("Überlappt mit " + objectLabel(a, items));
      }
    }
  return results;
}
/** Stored yaw uses the X/Z footprint convention; Three.js renders its negative around Y. */
export function speakerYaw(dx: number, dz: number) {
  return (-Math.atan2(dx, dz) * 180) / Math.PI;
}
/** Exact lower envelope of roof planes, clipped into convex surface regions. */
export function roomSurfaces(r: Room3D) {
  type Point = { x: number; z: number };
  const planes = [{ a: 0, b: 0, c: r.height }];
  for (const s of r.slopes) {
    const slope = (r.height - s.knee) / s.run;
    const p =
      s.wall === "left"
        ? { a: slope, b: 0, c: s.knee }
        : s.wall === "right"
          ? { a: -slope, b: 0, c: s.knee + slope * r.width }
          : s.wall === "front"
            ? { a: 0, b: slope, c: s.knee }
            : { a: 0, b: -slope, c: s.knee + slope * r.length };
    if (
      !planes.some(
        (q) =>
          Math.abs(p.a - q.a) + Math.abs(p.b - q.b) + Math.abs(p.c - q.c) <
          1e-9,
      )
    )
      planes.push(p);
  }
  const faces: Point[][] = [];
  const roof: number[] = [],
    walls: number[] = [];
  for (const plane of planes) {
    let polygon: Point[] = [
      { x: 0, z: 0 },
      { x: r.width, z: 0 },
      { x: r.width, z: r.length },
      { x: 0, z: r.length },
    ];
    for (const other of planes) {
      if (other === plane) continue;
      const a = plane.a - other.a,
        b = plane.b - other.b,
        c = plane.c - other.c;
      const next: Point[] = [];
      for (let i = 0; i < polygon.length; i++) {
        const p = polygon[i],
          q = polygon[(i + 1) % polygon.length],
          fp = a * p.x + b * p.z + c,
          fq = a * q.x + b * q.z + c,
          inside = fp <= 1e-9,
          otherInside = fq <= 1e-9;
        if (inside) next.push(p);
        if (inside !== otherInside) {
          const t = fp / (fp - fq);
          next.push({ x: p.x + t * (q.x - p.x), z: p.z + t * (q.z - p.z) });
        }
      }
      polygon = next;
    }
    if (polygon.length < 3) continue;
    faces.push(polygon);
    for (let i = 1; i < polygon.length - 1; i++)
      for (const p of [polygon[0], polygon[i], polygon[i + 1]])
        roof.push(p.x, plane.a * p.x + plane.b * p.z + plane.c, p.z);
  }
  for (let side = 0; side < 4; side++) {
    const ts = [0, 1];
    for (const p of faces.flat()) {
      if (side === 0 && Math.abs(p.z) < 1e-8) ts.push(p.x / r.width);
      if (side === 1 && Math.abs(p.x - r.width) < 1e-8) ts.push(p.z / r.length);
      if (side === 2 && Math.abs(p.z - r.length) < 1e-8)
        ts.push(1 - p.x / r.width);
      if (side === 3 && Math.abs(p.x) < 1e-8) ts.push(1 - p.z / r.length);
    }
    ts.sort((a, b) => a - b);
    const sorted = ts.filter(
      (t, i) => i === 0 || Math.abs(t - ts[i - 1]) > 1e-8,
    );
    const pos = (t: number) =>
      side === 0
        ? { x: t * r.width, z: 0 }
        : side === 1
          ? { x: r.width, z: t * r.length }
          : side === 2
            ? { x: (1 - t) * r.width, z: r.length }
            : { x: 0, z: (1 - t) * r.length };
    for (let i = 0; i < sorted.length - 1; i++) {
      const p = pos(sorted[i]),
        q = pos(sorted[i + 1]),
        hp = ceilingAt(r, p.x, p.z),
        hq = ceilingAt(r, q.x, q.z);
      walls.push(
        p.x,
        0,
        p.z,
        q.x,
        0,
        q.z,
        p.x,
        hp,
        p.z,
        q.x,
        0,
        q.z,
        q.x,
        hq,
        q.z,
        p.x,
        hp,
        p.z,
      );
    }
  }
  return { roof, walls };
}
