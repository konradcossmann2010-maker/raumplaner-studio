import React, { useRef, useState } from "react";
import { Download, Move, MapPin, RotateCcw } from "lucide-react";
import { type Scene } from "./model";
import {
  defaultAudio,
  recommendSpeakers,
  listeningPoint,
  planPoint,
  roomPoint,
  type AudioSettings,
  type Speaker,
} from "./audio";
import { download } from "./api";
const clamp = (n: number) => Math.max(0, Math.min(1, n));
function wedge(a: AudioSettings, s: Speaker) {
  const direction = Math.atan2(
      (s.target.y - s.y) * a.roomLength,
      (s.target.x - s.x) * a.roomWidth,
    ),
    length = Math.min(a.roomWidth, a.roomLength) * 0.85,
    delta = ((a.spread / 2) * Math.PI) / 180;
  return [
    s,
    ...[-delta, delta].map((d) => ({
      x: s.x + (Math.cos(direction + d) * length) / a.roomWidth,
      y: s.y + (Math.sin(direction + d) * length) / a.roomLength,
    })),
  ].map((p) => planPoint(a, p));
}
export default function PlanEditor({
  scene,
  onChange,
}: {
  scene: Scene;
  onChange: (s: Scene) => void;
}) {
  const a: AudioSettings = scene.audio ?? defaultAudio();
  const [mode, setMode] = useState<"mark" | "listen" | "move">(scene.audio?.roomConfirmed?"move":"mark"),
    [draft, setDraft] = useState<{
      x: number;
      y: number;
      width: number;
      height: number;
    }>(),
    [error, setError] = useState("");
  const svg = useRef<SVGSVGElement>(null),
    drag = useRef<
      | {
          type: "mark" | "speaker" | "listener";
          id?: string;
          start: { x: number; y: number };
        }
      | undefined
    >(undefined);
  const listener = listeningPoint(a);
  const speakers = a.roomConfirmed ? recommendSpeakers(a) : [];
  const dot = scene.width * 0.014;
  const point = (p: { x: number; y: number }) => ({
    x: p.x * scene.width,
    y: p.y * scene.height,
  });
  function edit(change: Partial<AudioSettings>) {
    onChange({ ...scene, audio: { ...a, ...change } });
  }
  function reset(change: Partial<AudioSettings>) {
    edit({ ...change, overrides: {} });
  }
  function pointer(e: React.PointerEvent) {
    const p = svg.current!.createSVGPoint();
    p.x = e.clientX;
    p.y = e.clientY;
    const transformed = p.matrixTransform(
      svg.current!.getScreenCTM()!.inverse(),
    );
    return {
      x: clamp(transformed.x / scene.width),
      y: clamp(transformed.y / scene.height),
    };
  }
  function rectangle(p: { x: number; y: number }, q: { x: number; y: number }) {
    return {
      x: Math.min(p.x, q.x),
      y: Math.min(p.y, q.y),
      width: Math.abs(p.x - q.x),
      height: Math.abs(p.y - q.y),
    };
  }
  function start(
    e: React.PointerEvent,
    type: "speaker" | "listener",
    id?: string,
  ) {
    if (!a.roomConfirmed) return;
    e.stopPropagation();
    svg.current!.setPointerCapture(e.pointerId);
    drag.current = { type, id, start: pointer(e) };
  }
  async function exportImage() {
    try {
      const c = document.createElement("canvas");
      c.width = scene.width;
      c.height = scene.height + 85;
      const ctx = c.getContext("2d")!;
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Planbild nicht verfügbar."));
        img.src = scene.image;
      });
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, scene.width, scene.height);
      ctx.strokeStyle = "#294e43";
      ctx.lineWidth = 3;
      ctx.strokeRect(
        a.room.x * scene.width,
        a.room.y * scene.height,
        a.room.width * scene.width,
        a.room.height * scene.height,
      );
      if (a.showSpread) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(
          a.room.x * scene.width,
          a.room.y * scene.height,
          a.room.width * scene.width,
          a.room.height * scene.height,
        );
        ctx.clip();
        for (const s of speakers.filter((s) => s.kind !== "sub")) {
          const p = wedge(a, s).map(point);
          ctx.beginPath();
          ctx.moveTo(p[0].x, p[0].y);
          ctx.lineTo(p[1].x, p[1].y);
          ctx.lineTo(p[2].x, p[2].y);
          ctx.closePath();
          ctx.fillStyle = "#7caa7625";
          ctx.fill();
        }
        ctx.restore();
      }
      for (const s of speakers) {
        const p = point(planPoint(a, s));
        ctx.beginPath();
        ctx.arc(p.x, p.y, dot, 0, Math.PI * 2);
        ctx.fillStyle = s.kind === "sub" ? "#b48c59" : "#294e43";
        ctx.fill();
        ctx.font = `bold ${Math.max(12, dot * 0.9)}px sans-serif`;
        ctx.textAlign = "center";
        ctx.fillStyle = "#294e43";
        ctx.fillText(s.label, p.x, p.y - dot - 8);
      }
      if (a.mode === "cinema") {
        const p = point(planPoint(a, listener));
        ctx.fillStyle = "#b16b49";
        ctx.beginPath();
        ctx.arc(p.x, p.y, dot * 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.textAlign = "left";
      ctx.font = "16px sans-serif";
      ctx.fillStyle = "#294e43";
      ctx.fillText(
        `${a.mode === "coverage" ? "Raumbeschallung" : a.system + " Heimkino"} · ${a.roomWidth} × ${a.roomLength} m`,
        16,
        scene.height + 30,
      );
      ctx.font = "12px sans-serif";
      ctx.fillText(
        "Schematischer Vorschlag. Keine Pegel-, Bass- oder Raumsimulation; vor Ort einmessen und nach Gehör anpassen.",
        16,
        scene.height + 58,
      );
      download(c.toDataURL("image/png"), "Hausplan-Audioplatzierung.png");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const selection = draft ?? a.room;
  const frontMid = planPoint(a, { x: 0.5, y: 0 });
  return (
    <div className="plan-editor">
      <div className="audio-intro">
        <strong>Musik im ganzen Raum</strong>
        <p>
          Markiere den gewünschten Raum auf deinem Hausplan. Die Vorschläge
          verteilen Lautsprecher über seine Fläche. Türen, Möbel und offene
          Durchgänge bitte beim Verschieben berücksichtigen.
        </p>
      </div>
      <div className="plan-tools">
        <button
          className={mode === "mark" ? "active" : ""}
          onClick={() => setMode("mark")}
        >
          <Move size={16} />
          Raum markieren
        </button>
        {a.mode === "cinema" && (
          <button
            disabled={!a.roomConfirmed}
            className={mode === "listen" ? "active" : ""}
            onClick={() => setMode("listen")}
          >
            <MapPin size={16} />
            Hörplatz setzen
          </button>
        )}
        <button disabled={!a.roomConfirmed} onClick={() => reset({})}>
          <RotateCcw size={16} />
          Vorschlag zurücksetzen
        </button>
        <button disabled={!a.roomConfirmed} onClick={exportImage}>
          <Download size={16} />
          Audioplan speichern
        </button>
      </div>
      <p className="plan-instruction">
        {mode === "mark"
          ? "Ziehe ein Rechteck innerhalb der Raumwände. Bei gedrehten oder L-förmigen Räumen den zu beschallenden rechteckigen Bereich markieren."
          : mode === "listen"
            ? "Klicke auf deinen Hauptsitzplatz im markierten Raum."
            : "Du kannst Lautsprecher und den Hörplatz direkt verschieben."}
      </p>
      <svg
        ref={svg}
        className="plan-canvas"
        viewBox={`0 0 ${scene.width} ${scene.height}`}
        role="img"
        aria-label="Hausplan mit Audioplatzierungen"
        onPointerDown={(e) => {
          if (mode === "mark") {
            svg.current!.setPointerCapture(e.pointerId);
            drag.current = { type: "mark", start: pointer(e) };
            setDraft(undefined);
          } else if (mode === "listen") {
            const p = roomPoint(a, pointer(e));
            edit({
              listener: {
                x: Math.max(0.1, Math.min(0.9, p.x)),
                y: Math.max(0.1, Math.min(0.9, p.y)),
              },
              overrides: {},
            });
            setMode("move");
          }
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d) return;
          const p = pointer(e);
          if (d.type === "mark") {
            setDraft(rectangle(d.start, p));
            return;
          }
          const q = roomPoint(a, p);
          if (d.type === "listener")
            reset({
              listener: {
                x: Math.max(0.1, Math.min(0.9, q.x)),
                y: Math.max(0.1, Math.min(0.9, q.y)),
              },
            });
          else
            edit({
              overrides: {
                ...a.overrides,
                [d.id!]: { x: clamp(q.x), y: clamp(q.y) },
              },
            });
        }}
        onPointerUp={(e) => {
          const d = drag.current;
          if (d?.type === "mark") {
            const r = rectangle(d.start, pointer(e));
            if (r.width >= 0.02 && r.height >= 0.02) {
              reset({ room: r, roomConfirmed: true });
              setMode("move");
              setError("");
            } else setError("Bitte einen größeren Raumbereich markieren.");
            setDraft(undefined);
          }
          drag.current = undefined;
        }}
        onPointerCancel={() => {
          drag.current = undefined;
          setDraft(undefined);
        }}
      >
        <image href={scene.image} width={scene.width} height={scene.height} />
        <defs>
          <clipPath id="audio-room-clip">
            <rect
              x={a.room.x * scene.width}
              y={a.room.y * scene.height}
              width={a.room.width * scene.width}
              height={a.room.height * scene.height}
            />
          </clipPath>
        </defs>
        {(draft || a.roomConfirmed) && (
          <rect
            x={selection.x * scene.width}
            y={selection.y * scene.height}
            width={selection.width * scene.width}
            height={selection.height * scene.height}
            fill="#294e430c"
            stroke="#294e43"
            strokeWidth={dot * 0.18}
            strokeDasharray={draft ? dot : undefined}
            pointerEvents="none"
          />
        )}
        {a.showSpread && (
          <g clipPath="url(#audio-room-clip)" pointerEvents="none">
            {speakers
              .filter((s) => s.kind !== "sub")
              .map((s) => (
                <polygon
                  key={s.id}
                  points={wedge(a, s)
                    .map(point)
                    .map((p) => `${p.x},${p.y}`)
                    .join(" ")}
                  fill="#7caa7625"
                  stroke="#7caa7644"
                />
              ))}
          </g>
        )}
        {a.roomConfirmed && (
          <text
            x={frontMid.x * scene.width}
            y={frontMid.y * scene.height + dot * 1.2}
            textAnchor="middle"
            fontSize={dot}
            fill="#294e43"
            pointerEvents="none"
          >
            FRONT
          </text>
        )}
        {speakers.map((s) => {
          const p = point(planPoint(a, s));
          return (
            <g
              key={s.id}
              data-speaker={s.id}
              className="audio-marker"
              onPointerDown={(e) => start(e, "speaker", s.id)}
            >
              <circle
                cx={p.x}
                cy={p.y}
                r={dot}
                fill={s.kind === "sub" ? "#b48c59" : "#294e43"}
                stroke="white"
                strokeWidth={dot * 0.15}
              />
              <text
                x={p.x}
                y={p.y - dot * 1.6}
                fontSize={dot * 0.95}
                fontWeight="bold"
                textAnchor="middle"
                fill="#294e43"
                stroke="white"
                strokeWidth={dot * 0.09}
                paintOrder="stroke"
              >
                {s.label}
              </text>
              <title>{s.label}: verschieben</title>
            </g>
          );
        })}
        {a.roomConfirmed && a.mode === "cinema" && (
          <g
            className="audio-marker"
            data-listener="true"
            onPointerDown={(e) => start(e, "listener")}
          >
            <circle
              cx={planPoint(a, listener).x * scene.width}
              cy={planPoint(a, listener).y * scene.height}
              r={dot}
              fill="#b16b49"
              stroke="white"
              strokeWidth={dot * 0.15}
            />
            <text
              x={planPoint(a, listener).x * scene.width}
              y={planPoint(a, listener).y * scene.height - dot * 1.6}
              fontSize={dot * 0.95}
              textAnchor="middle"
              fill="#b16b49"
            >
              Hörplatz
            </text>
          </g>
        )}
      </svg>
      <div className="audio-settings">
        <label>
          Ziel
          <select
            aria-label="Audio-Ziel"
            value={a.mode}
            onChange={(e) => {
              reset({ mode: e.target.value as AudioSettings["mode"] });
              setMode(a.roomConfirmed ? "move" : "mark");
            }}
          >
            <option value="coverage">Musik im ganzen Raum</option>
            <option value="cinema">Stereo / Heimkino am Sitzplatz</option>
          </select>
        </label>
        {a.mode === "coverage" ? (
          <label>
            Lautsprecher gesamt
            <select
              aria-label="Lautsprecher gesamt"
              value={a.count}
              onChange={(e) => reset({ count: +e.target.value as 2 | 4 | 6 })}
            >
              <option value={2}>2 Lautsprecher</option>
              <option value={4}>4 Lautsprecher – verteilt</option>
              <option value={6}>6 Lautsprecher – verteilt</option>
            </select>
          </label>
        ) : (
          <label>
            System
            <select
              aria-label="Audio-System"
              value={a.system}
              onChange={(e) =>
                reset({ system: e.target.value as AudioSettings["system"] })
              }
            >
              {["2.0", "2.1", "5.1", "7.1"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
        )}
        {a.mode === "cinema" && (
          <label>
            Abstand zum Hörplatz
            <select
              aria-label="Abstand zum Hörplatz"
              value={a.distance ?? ""}
              onChange={(e) =>
                reset({
                  distance: e.target.value ? Number(e.target.value) : undefined,
                })
              }
            >
              <option value="">So weit wie möglich (an der Wand)</option>
              <option value="1">1,0 m – kleiner Schreibtisch</option>
              <option value="1.2">1,2 m – Schreibtisch (Nahfeld)</option>
              <option value="1.5">1,5 m – großer Schreibtisch</option>
              <option value="2">2,0 m</option>
              <option value="2.5">2,5 m</option>
              <option value="3">3,0 m – Sofa</option>
            </select>
          </label>
        )}
        <label>
          Raumbreite quer zur Front (m)
          <input
            aria-label="Raumbreite (m)"
            type="number"
            min=".5"
            max="80"
            step=".1"
            value={a.roomWidth}
            onChange={(e) => {
              const n = +e.target.value;
              if (n >= 0.5 && n <= 80) reset({ roomWidth: n });
            }}
          />
        </label>
        <label>
          Raumtiefe von der Front (m)
          <input
            aria-label="Raumtiefe (m)"
            type="number"
            min=".5"
            max="80"
            step=".1"
            value={a.roomLength}
            onChange={(e) => {
              const n = +e.target.value;
              if (n >= 0.5 && n <= 80) reset({ roomLength: n });
            }}
          />
        </label>
        <label>
          Frontwand im Grundriss
          <select
            aria-label="Frontwand"
            value={a.front}
            onChange={(e) =>
              reset({ front: e.target.value as AudioSettings["front"] })
            }
          >
            <option value="top">Oben</option>
            <option value="bottom">Unten</option>
            <option value="left">Links</option>
            <option value="right">Rechts</option>
          </select>
        </label>
        <label>
          Horizontaler Abstrahlwinkel (°)
          <input
            aria-label="Abstrahlwinkel"
            type="number"
            min="30"
            max="180"
            step="5"
            value={a.spread}
            onChange={(e) => {
              const n = +e.target.value;
              if (n >= 30 && n <= 180) edit({ spread: n });
            }}
          />
        </label>
      </div>
      <label className="cutout-option">
        <input
          type="checkbox"
          checked={a.showSpread}
          onChange={(e) => edit({ showSpread: e.target.checked })}
        />
        Schematische Abstrahlrichtungen zeigen (keine berechnete Abdeckung)
      </label>
      {error && <p className="error">{error}</p>}
      <div className="audio-advice">
        <strong>
          {a.mode === "coverage"
            ? "Für möglichst gleichmäßige Beschallung"
            : "Für Stereo und Heimkino"}
        </strong>
        <p>
          {a.mode === "coverage"
            ? "Verteilte Paare statt nur einer lauten Ecke: richte die Lautsprecher in ihre Raumzone und höre an mehreren Stellen probe. Für Musik auf allen Paaren braucht dein Verstärker einen passenden Mehrkanal-/Multiroom-Betrieb. Mehr Lautsprecher garantieren durch Überlagerungen nicht automatisch besseren Klang."
            : "Die Frontlautsprecher zielen ungefähr auf ±30° zum Hörplatz. 5.1-Surrounds starten bei ±110°, 7.1-Seiten bei ±100° und hintere Lautsprecher bei ±145°. Der Subwoofer ist nur ein Startpunkt: seine passende Position musst du im Raum testen. Am Schreibtisch „Abstand zum Hörplatz“ auf 1–1,5 m stellen: Dann bilden beide Lautsprecher und dein Kopf ein gleichseitiges Dreieck, die Hochtöner gehören auf Ohrhöhe."}
        </p>
        <p>
          Die Raumgrenzen, Maße und Front gibst du selbst an. Die App erkennt
          keine Wände, Türen oder Möbel automatisch. Abstrahlwinkel laut
          Lautsprecher-Datenblatt einstellen. Wandabstand, Montagehöhe,
          Raumakustik und Pegel vor Ort prüfen; keine Schallpegel- oder
          Basssimulation.
        </p>
        <div className="audio-position-list">
          {speakers.map((s) => (
            <span key={s.id}>
              <strong>{s.label}</strong>{" "}
              {Math.round(s.x * a.roomWidth * 100) / 100} m quer ·{" "}
              {Math.round(s.y * a.roomLength * 100) / 100} m ab Front
            </span>
          ))}
        </div>
        <small>
          Grundlagen:{" "}
          <a
            href="https://www.dolby.com/about/support/guide/surround-sound-speaker-setup"
            target="_blank"
            rel="noopener noreferrer"
          >
            Dolby Aufstellung
          </a>{" "}
          ·{" "}
          <a
            href="https://blogs.qsc.com/live-sound/practical-tips-on-loudspeaker-placement-for-live-sound-part-iii/"
            target="_blank"
            rel="noopener noreferrer"
          >
            QSC Ausrichtung und Abstrahlung
          </a>
          . Die Raummusik-Verteilung ist ein geometrischer Startvorschlag.
        </small>
      </div>
    </div>
  );
}
