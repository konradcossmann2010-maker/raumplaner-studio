import React, { useRef, useState } from "react";
import {
  Room3D,
  RoomObject,
  SizedItem,
  dimensionsOf,
  footprint,
  evaluateFit,
  objectLabel,
} from "./space";
export default function TopRoom({
  room,
  items,
  selected,
  onSelect,
  onMove,
}: {
  room: Room3D;
  items: (SizedItem & { category?: string })[];
  selected: string;
  onSelect: (id: string) => void;
  onMove: (id: string, point: Partial<RoomObject>) => void;
}) {
  const svg = useRef<SVGSVGElement>(null),
    drag = useRef<{
      id: string;
      pointer: number;
      dx: number;
      dz: number;
    } | null>(null),
    [preview, setPreview] = useState<RoomObject | null>(null);
  const pad = Math.max(room.width, room.length) * 0.09,
    objects = room.objects.map((o) => (preview?.id === o.id ? preview : o)),
    fits = evaluateFit(room, objects, items);
  function point(e: React.PointerEvent) {
    const matrix = svg.current?.getScreenCTM();
    if (!matrix) return null;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(
      matrix.inverse(),
    );
    return { x: p.x, z: p.y };
  }
  function finish(e: React.PointerEvent, cancel = false) {
    if (!drag.current || e.pointerId !== drag.current.pointer) return;
    const id = drag.current.id;
    drag.current = null;
    if (svg.current?.hasPointerCapture(e.pointerId))
      svg.current.releasePointerCapture(e.pointerId);
    if (!cancel && preview) onMove(id, { x: preview.x, z: preview.z });
    setPreview(null);
  }
  return (
    <div className="top-room">
      <p>
        Maßstäbliche Draufsicht: Möbel und Lautsprecher ziehen oder auswählen
        und mit den Pfeiltasten um 5 cm bewegen. Höhe und Drehung unten
        einstellen. Unbekannte Maße erscheinen als Platzhalter.
      </p>
      <svg
        ref={svg}
        role="group"
        aria-label="Maßstäblicher Möbelgrundriss"
        viewBox={`${-pad} ${-pad} ${room.width + 2 * pad} ${room.length + 2 * pad}`}
        onPointerMove={(e) => {
          const d = drag.current,
            p = point(e);
          if (d && p && e.pointerId === d.pointer) {
            const o = room.objects.find((o) => o.id === d.id);
            if (o) setPreview({ ...o, x: p.x + d.dx, z: p.z + d.dz });
          }
        }}
        onPointerUp={(e) => finish(e)}
        onPointerCancel={(e) => finish(e, true)}
      >
        <rect
          width={room.width}
          height={room.length}
          fill="#f1e9dc"
          stroke="#294e43"
          strokeWidth={pad * 0.04}
        />
        <text
          x={room.width / 2}
          y={-pad * 0.3}
          textAnchor="middle"
          fontSize={pad * 0.4}
        >
          {room.width} m
        </text>
        <text
          x={-pad * 0.2}
          y={room.length / 2}
          textAnchor="middle"
          fontSize={pad * 0.4}
          transform={`rotate(-90 ${-pad * 0.2} ${room.length / 2})`}
        >
          {room.length} m
        </text>
        {room.slopes.map((s) => {
          const vertical = s.wall === "left" || s.wall === "right",
            a =
              s.wall === "right"
                ? room.width - s.run
                : s.wall === "back"
                  ? room.length - s.run
                  : s.run;
          return (
            <line
              key={s.id}
              x1={vertical ? a : 0}
              x2={vertical ? a : room.width}
              y1={vertical ? 0 : a}
              y2={vertical ? room.length : a}
              stroke="#8e6e45"
              strokeWidth={pad * 0.035}
              strokeDasharray={`${pad * 0.2} ${pad * 0.15}`}
            >
              <title>Ende der Dachschräge</title>
            </line>
          );
        })}
        {objects.map((o) => {
          const dims = dimensionsOf(o, items),
            size = dims ?? { width: 0.6, height: 0.8, depth: 0.6 },
            f = fits.find((f) => f.id === o.id)!,
            label = objectLabel(o, items);
          return (
            <g
              key={o.id}
              role="button"
              tabIndex={0}
              aria-label={`${label} im Grundriss`}
              onKeyDown={(e) => {
                const delta: { [key: string]: [number, number] } = {
                  ArrowLeft: [-0.05, 0],
                  ArrowRight: [0.05, 0],
                  ArrowUp: [0, -0.05],
                  ArrowDown: [0, 0.05],
                };
                if (delta[e.key]) {
                  e.preventDefault();
                  onSelect(o.id);
                  onMove(o.id, {
                    x: o.x + delta[e.key][0],
                    z: o.z + delta[e.key][1],
                  });
                }
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(o.id);
                }
              }}
              onPointerDown={(e) => {
                if (e.button !== 0 || drag.current) return;
                const p = point(e);
                if (!p) return;
                onSelect(o.id);
                setPreview(o);
                drag.current = {
                  id: o.id,
                  pointer: e.pointerId,
                  dx: o.x - p.x,
                  dz: o.z - p.z,
                };
                svg.current?.setPointerCapture(e.pointerId);
                e.preventDefault();
              }}
            >
              <polygon
                points={footprint(o, size)
                  .map((p) => `${p.x},${p.z}`)
                  .join(" ")}
                fill={
                  !f.known ? "#b4b8ad" : f.issues.length ? "#d88e7a" : "#8baa91"
                }
                stroke={selected === o.id ? "#123d32" : "#667465"}
                strokeWidth={pad * (selected === o.id ? 0.1 : 0.035)}
              />
              <g
                pointerEvents="none"
                transform={`translate(${o.x} ${o.z}) rotate(${o.rotation}) scale(${size.width / 100} ${size.depth / 100}) translate(-50 -50)`}
                fill="none"
                stroke="#536357"
                strokeWidth="2"
              >
                {items.find((i) => i.id === o.itemId)?.category === "Bett" ? (
                  <>
                    <rect x="7" y="5" width="86" height="90" rx="3" />
                    <rect x="15" y="10" width="30" height="18" rx="4" />
                    <rect x="55" y="10" width="30" height="18" rx="4" />
                    <path d="M7 40H93" />
                  </>
                ) : items.find((i) => i.id === o.itemId)?.category ===
                  "Sofa" ? (
                  <>
                    <rect x="5" y="5" width="90" height="22" />
                    <rect x="5" y="27" width="14" height="68" />
                    <rect x="81" y="27" width="14" height="68" />
                    <path d="M50 27V95" />
                  </>
                ) : (
                  <>
                    <path d="M5 85H95M50 5V80" />
                    <circle cx="43" cy="75" r="2" />
                    <circle cx="57" cy="75" r="2" />
                  </>
                )}
              </g>
              <text
                x={o.x}
                y={o.z}
                textAnchor="middle"
                fontSize={pad * 0.3}
                pointerEvents="none"
              >
                {label.slice(0, 22)}
              </text>
              <title>
                {label}:{" "}
                {dims ? `${dims.width} × ${dims.depth} m` : "Maße fehlen"}
                {f.issues.length ? " · " + f.issues.join(", ") : ""}
              </title>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
