import { z } from "zod";
const money = z.number().int().min(0).max(1000000000).nullable();
const id = z.string().min(1).max(100);
export const dimensionsSchema = z.object({
  width: z.number().min(0.01).max(80),
  height: z.number().min(0.01).max(20),
  depth: z.number().min(0.01).max(80),
});
export const roomObjectSchema = z.object({
  id,
  kind: z.enum(["furniture", "speaker", "sub"]),
  itemId: id.optional(),
  label: z.string().max(200).optional(),
  x: z.number().min(-1000).max(1000),
  y: z.number().min(-100).max(100),
  z: z.number().min(-1000).max(1000),
  rotation: z.number().min(-36000).max(36000),
  dimensions: dimensionsSchema.optional(),
});
export const room3DSchema = z
  .object({
    width: z.number().min(0.5).max(80),
    length: z.number().min(0.5).max(80),
    height: z.number().min(0.5).max(20),
    confirmed: z.boolean(),
    slopes: z
      .array(
        z.object({
          id,
          wall: z.enum(["left", "right", "front", "back"]),
          knee: z.number().min(0).max(20),
          run: z.number().min(0.01).max(80),
          source: z.enum(["manual", "photo-confirmed"]).optional(),
          photoId: id.optional(),
        }),
      )
      .max(8),
    objects: z.array(roomObjectSchema).max(100),
    audioSystem: z.enum(["coverage", "2.0", "2.1", "5.1", "7.1"]),
    audioCount: z.union([z.literal(2), z.literal(4), z.literal(6)]),
  })
  .superRefine((r, ctx) => {
    for (const s of r.slopes)
      if (
        s.knee > r.height ||
        s.run > (s.wall === "left" || s.wall === "right" ? r.width : r.length)
      )
        ctx.addIssue({
          code: "custom",
          message: "Dachschrägenmaße passen nicht zu den Raummaßen",
        });
    if (new Set(r.slopes.map((s) => s.wall)).size !== r.slopes.length)
      ctx.addIssue({
        code: "custom",
        message: "Pro Wand ist eine Dachschräge möglich",
      });
    for (const [a, b, extent] of [
      ["left", "right", r.width],
      ["front", "back", r.length],
    ] as const) {
      const sum =
        (r.slopes.find((s) => s.wall === a)?.run ?? 0) +
        (r.slopes.find((s) => s.wall === b)?.run ?? 0);
      if (sum > extent + 0.0001)
        ctx.addIssue({
          code: "custom",
          message:
            "Gegenüberliegende Dachschrägen erreichen mit diesen Tiefen die maximale Raumhöhe nicht",
        });
    }
    if (new Set(r.objects.map((o) => o.id)).size !== r.objects.length)
      ctx.addIssue({ code: "custom", message: "Doppelte 3D-Objekt-ID" });
  });
export const layerSchema = z.object({
  id,
  itemId: id,
  x: z.number().finite(),
  y: z.number().finite(),
  width: z.number().min(0.005).max(5),
  height: z.number().min(0.005).max(5),
  rotation: z.number().finite(),
  flip: z.boolean(),
  shadow: z.number().min(0).max(1).optional(),
  skew: z.number().min(-0.5).max(0.5).optional(),
  brightness: z.number().min(-0.5).max(0.5).optional(),
});
export const itemSchema = z.object({
  id,
  name: z.string().min(1).max(200),
  category: z.string().min(1).max(80),
  price: money,
  dimensions: dimensionsSchema.optional(),
  quantity: z.number().int().min(1).max(999),
  merchant: z.string().max(200),
  url: z
    .string()
    .max(4000)
    .refine((v) => !v || !!safeUrl(v), "Ungültiger Produktlink"),
  image: z.string().max(16 * 1024 * 1024),
  observedAt: z.string().max(100),
  imageWidth: z.number().positive().optional(),
  imageHeight: z.number().positive().optional(),
  originalImage: z
    .string()
    .max(16 * 1024 * 1024)
    .optional(),
});
const unit = z.number().min(0).max(1);
export const audioSchema = z.object({
  roomConfirmed: z.boolean().optional(),
  mode: z.enum(["coverage", "cinema"]),
  system: z.enum(["2.0", "2.1", "5.1", "7.1"]),
  count: z.union([z.literal(2), z.literal(4), z.literal(6)]),
  room: z
    .object({
      x: unit,
      y: unit,
      width: z.number().min(0.02).max(1),
      height: z.number().min(0.02).max(1),
    })
    .refine(
      (r) => r.x + r.width <= 1.000001 && r.y + r.height <= 1.000001,
      "Raum liegt außerhalb des Grundrisses",
    ),
  roomWidth: z.number().min(0.5).max(80),
  roomLength: z.number().min(0.5).max(80),
  front: z.enum(["top", "bottom", "left", "right"]),
  listener: z.object({ x: unit, y: unit }),
  spread: z.number().min(30).max(180),
  showSpread: z.boolean(),
  overrides: z.record(z.object({ x: unit, y: unit })).optional(),
});
export const projectSchema = z
  .object({
    id,
    name: z.string().min(1).max(120),
    totalBudget: money,
    room3D: room3DSchema.optional(),
    categories: z.array(z.string().min(1).max(80)).max(50),
    limits: z.record(
      z
        .object({ min: money, max: money, cap: money })
        .refine(
          (v) => v.min === null || v.max === null || v.min <= v.max,
          "Mindestpreis über Höchstpreis",
        ),
    ),
    shipping: z.record(money),
    items: z.array(itemSchema).max(200),
    scenes: z
      .array(
        z.object({
          id,
          name: z.string().max(120),
          image: z.string(),
          width: z.number().positive(),
          height: z.number().positive(),
          layers: z.array(layerSchema).max(200),
          kind: z.enum(["photo", "plan"]).optional(),
          audio: audioSchema.optional(),
        }),
      )
      .max(30),
  })
  .superRefine((p, ctx) => {
    const ids = new Set(p.items.map((i) => i.id));
    if (ids.size !== p.items.length)
      ctx.addIssue({ code: "custom", message: "Doppelte Möbel-ID" });
    for (const o of p.room3D?.objects ?? [])
      if (o.kind === "furniture" && (!o.itemId || !ids.has(o.itemId)))
        ctx.addIssue({ code: "custom", message: "3D-Möbelzuordnung fehlt" });
    for (const s of p.scenes)
      for (const l of s.layers)
        if (!ids.has(l.itemId))
          ctx.addIssue({ code: "custom", message: "Möbelzuordnung fehlt" });
  });
export type Project = z.infer<typeof projectSchema>;
export type Item = z.infer<typeof itemSchema>;
export type Layer = z.infer<typeof layerSchema>;
export type Scene = Project["scenes"][number];
export const uid = () => crypto.randomUUID();
export function newProject(): Project {
  return {
    id: uid(),
    name: "Mein Schlafzimmer",
    totalBudget: 40000,
    categories: [
      "Kleiderschrank",
      "Vitrine",
      "Kommode",
      "Bett",
      "Regal",
      "Sofa",
      "Tisch",
      "Stuhl",
      "Beleuchtung",
    ],
    limits: {},
    shipping: {},
    items: [],
    scenes: [],
  };
}
export function moneyInput(s: string): number | null {
  if (!s.trim()) return null;
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
}
export const euro = (n: number | null) =>
  n === null
    ? "Preis offen"
    : new Intl.NumberFormat("de-DE", {
        style: "currency",
        currency: "EUR",
      }).format(n / 100);
export const moneyValue = (n: number | null | undefined) =>
  n == null ? "" : String(n / 100);
export function safeUrl(s: string) {
  try {
    const u = new URL(s);
    return ["http:", "https:"].includes(u.protocol) &&
      !u.username &&
      !u.password
      ? u.href
      : "";
  } catch {
    return "";
  }
}
export function budget(p: Project) {
  const categories: Record<string, number> = {};
  let goods = 0;
  let complete = true;
  const merchants = new Set<string>();
  for (const i of p.items) {
    if (i.price === null) complete = false;
    goods += (i.price ?? 0) * i.quantity;
    categories[i.category] =
      (categories[i.category] ?? 0) + (i.price ?? 0) * i.quantity;
    merchants.add(i.merchant);
  }
  let shipping = 0;
  for (const m of merchants) {
    if (p.shipping[m] == null) complete = false;
    else shipping += p.shipping[m]!;
  }
  const total = goods + shipping;
  return {
    goods,
    shipping,
    total,
    complete,
    categories,
    over: p.totalBudget !== null && total > p.totalBudget,
    merchants: [...merchants],
  };
}
export function csv(p: Project) {
  const cell = (v: unknown) => {
    let s = String(v ?? "");
    if (/^[=+@\-\t\r]/.test(s)) s = "'" + s;
    return '"' + s.replaceAll('"', '""') + '"';
  };
  return (
    "\uFEFF" +
    [
      [
        "Möbel",
        "Kategorie",
        "Anzahl",
        "Einzelpreis EUR",
        "Shop",
        "Kauflink",
        "Preisstand",
      ],
      ...p.items.map((i) => [
        i.name,
        i.category,
        i.quantity,
        i.price === null ? "" : (i.price / 100).toFixed(2),
        i.merchant,
        i.url,
        i.observedAt,
      ]),
    ]
      .map((r) => r.map(cell).join(";"))
      .join("\r\n")
  );
}
