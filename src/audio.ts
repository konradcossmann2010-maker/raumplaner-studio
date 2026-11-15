export interface AudioSettings {
  roomConfirmed?: boolean;
  mode: "coverage" | "cinema";
  system: "2.0" | "2.1" | "5.1" | "7.1";
  count: 2 | 4 | 6;
  room: { x: number; y: number; width: number; height: number };
  roomWidth: number;
  roomLength: number;
  front: "top" | "bottom" | "left" | "right";
  listener: { x: number; y: number };
  spread: number;
  showSpread: boolean;
  overrides?: Record<string, { x: number; y: number }>;
}
export interface Speaker {
  x: number;
  y: number;
  label: string;
  id: string;
  target: { x: number; y: number };
  kind: "speaker" | "sub";
}
export function defaultAudio(): AudioSettings {
  return {
    mode: "coverage",
    system: "2.0",
    count: 4,
    room: { x: 0.1, y: 0.1, width: 0.8, height: 0.8 },
    roomWidth: 4,
    roomLength: 6,
    front: "top",
    listener: { x: 0.5, y: 0.65 },
    spread: 90,
    showSpread: true,
  };
}
export function planPoint(a: AudioSettings, p: { x: number; y: number }) {
  let u = p.x,
    v = p.y;
  if (a.front === "bottom") {
    u = 1 - p.x;
    v = 1 - p.y;
  } else if (a.front === "left") {
    u = p.y;
    v = 1 - p.x;
  } else if (a.front === "right") {
    u = 1 - p.y;
    v = p.x;
  }
  return { x: a.room.x + u * a.room.width, y: a.room.y + v * a.room.height };
}
export function roomPoint(a: AudioSettings, p: { x: number; y: number }) {
  const u = (p.x - a.room.x) / a.room.width,
    v = (p.y - a.room.y) / a.room.height;
  if (a.front === "bottom") return { x: 1 - u, y: 1 - v };
  if (a.front === "left") return { x: 1 - v, y: u };
  if (a.front === "right") return { x: v, y: 1 - u };
  return { x: u, y: v };
}
export function listeningPoint(a: AudioSettings) {
  const margin = Math.min(0.35, a.roomWidth / 6, a.roomLength / 6),
    mx = margin / a.roomWidth,
    my = margin / a.roomLength;
  return {
    x: Math.max(mx + 0.001, Math.min(1 - mx - 0.001, a.listener.x)),
    y: Math.max(my + 0.001, Math.min(1 - my - 0.001, a.listener.y)),
  };
}
export function recommendSpeakers(a: AudioSettings): Speaker[] {
  const s: Speaker[] = [];
  const margin = Math.min(0.35, a.roomWidth / 6, a.roomLength / 6),
    mx = margin / a.roomWidth,
    my = margin / a.roomLength;
  const listener = listeningPoint(a);
  function add(
    id: string,
    label: string,
    x: number,
    y: number,
    target: { x: number; y: number },
    kind: "speaker" | "sub" = "speaker",
  ) {
    const custom = a.overrides?.[id];
    s.push({
      id,
      label,
      x: Math.max(0, Math.min(1, custom?.x ?? x)),
      y: Math.max(0, Math.min(1, custom?.y ?? y)),
      target,
      kind,
    });
  }
  if (a.mode === "coverage") {
    for (let row = 0; row < a.count / 2; row++) {
      const y = (row + 0.5) / (a.count / 2);
      add("L" + row, "L" + (row + 1), mx, y, { x: 0.55, y });
      add("R" + row, "R" + (row + 1), 1 - mx, y, { x: 0.45, y });
    }
    return s;
  }
  function ray(id: string, label: string, degrees: number) {
    const angle = (degrees * Math.PI) / 180,
      dx = Math.sin(angle),
      dy = -Math.cos(angle),
      x = listener.x * a.roomWidth,
      y = listener.y * a.roomLength;
    const ts: number[] = [];
    if (dx > 0.0001) ts.push((a.roomWidth - margin - x) / dx);
    if (dx < -0.0001) ts.push((margin - x) / dx);
    if (dy > 0.0001) ts.push((a.roomLength - margin - y) / dy);
    if (dy < -0.0001) ts.push((margin - y) / dy);
    const t = Math.min(...ts.filter((t) => t >= 0));
    add(
      id,
      label,
      (x + dx * t) / a.roomWidth,
      (y + dy * t) / a.roomLength,
      listener,
    );
  }
  ray("FL", "Front L", -30);
  ray("FR", "Front R", 30);
  if (a.system === "5.1" || a.system === "7.1") {
    ray("C", "Center", 0);
    ray("SL", "Surround L", a.system === "5.1" ? -110 : -100);
    ray("SR", "Surround R", a.system === "5.1" ? 110 : 100);
  }
  if (a.system === "7.1") {
    ray("RL", "Hinten L", -145);
    ray("RR", "Hinten R", 145);
  }
  if (a.system !== "2.0") add("SUB", "Subwoofer", 0.25, my, listener, "sub");
  return s;
}
