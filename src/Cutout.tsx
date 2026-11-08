import React, { useEffect, useRef, useState } from "react";
import { X, RotateCcw, Check, Crop, Eraser } from "lucide-react";
export default function Cutout({
  src,
  onClose,
  onSave,
}: {
  src: string;
  onClose: () => void;
  onSave: (b: Blob) => Promise<void>;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<"erase" | "crop">("erase");
  const [brush, setBrush] = useState(25);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const start = useRef<{ x: number; y: number } | null>(null);
  const undo = useRef<ImageData[]>([]);
  const [selection, setSelection] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const c = canvas.current!;
      const scale = Math.min(1, 1200 / Math.max(img.width, img.height));
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    };
    img.src = src;
  }, [src]);
  function point(e: React.PointerEvent) {
    const c = canvas.current!,
      r = c.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) * c.width) / r.width,
      y: ((e.clientY - r.top) * c.height) / r.height,
    };
  }
  function erase(p: { x: number; y: number }) {
    const ctx = canvas.current!.getContext("2d")!;
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(p.x, p.y, brush, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
  }
  function crop() {
    if (!selection) return;
    const c = canvas.current!,
      ctx = c.getContext("2d")!;
    const x = Math.max(0, Math.round(selection.x)),
      y = Math.max(0, Math.round(selection.y)),
      w = Math.min(c.width - x, Math.round(selection.w)),
      h = Math.min(c.height - y, Math.round(selection.h));
    if (w < 3 || h < 3) return;
    const data = ctx.getImageData(x, y, w, h);
    undo.current.push(ctx.getImageData(0, 0, c.width, c.height));
    c.width = w;
    c.height = h;
    ctx.putImageData(data, 0, 0);
    setSelection(null);
  }
  return (
    <div className="modal-backdrop">
      <div className="modal cutout">
        <header>
          <div>
            <span className="eyebrow">BILD BEARBEITEN</span>
            <h2>Möbel freistellen</h2>
          </div>
          <button onClick={onClose} aria-label="Schließen">
            <X />
          </button>
        </header>
        <p>
          Hintergrund mit dem Radierer entfernen oder einen Ausschnitt ziehen.
        </p>
        <div className="row">
          <button
            className={mode === "erase" ? "active" : ""}
            onClick={() => {
              setMode("erase");
              setSelection(null);
            }}
          >
            <Eraser size={16} />
            Radierer
          </button>
          <button
            className={mode === "crop" ? "active" : ""}
            onClick={() => setMode("crop")}
          >
            <Crop size={16} />
            Zuschneiden
          </button>
          <label>
            Pinsel{" "}
            <input
              type="range"
              min="3"
              max="80"
              value={brush}
              onChange={(e) => setBrush(+e.target.value)}
            />
          </label>
          <button
            title="Letzten Schritt zurück"
            onClick={() => {
              const d = undo.current.pop();
              if (d) {
                canvas.current!.width = d.width;
                canvas.current!.height = d.height;
                canvas.current!.getContext("2d")!.putImageData(d, 0, 0);
              }
              setSelection(null);
            }}
          >
            <RotateCcw size={16} />
          </button>
          {selection && <button onClick={crop}>Ausschnitt übernehmen</button>}
        </div>
        <div className="checker"><div className="crop-stage">
          <canvas
            ref={canvas}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              const p = point(e);
              start.current = p;
              const c = canvas.current!;
              undo.current.push(
                c.getContext("2d")!.getImageData(0, 0, c.width, c.height),
              );
              undo.current = undo.current.slice(-10);
              if (mode === "erase") erase(p);
            }}
            onPointerMove={(e) => {
              if (!start.current) return;
              const p = point(e);
              if (mode === "erase") erase(p);
              else
                setSelection({
                  x: Math.min(p.x, start.current.x),
                  y: Math.min(p.y, start.current.y),
                  w: Math.abs(p.x - start.current.x),
                  h: Math.abs(p.y - start.current.y),
                });
            }}
            onPointerUp={() => {
              start.current = null;
            }}
            onPointerCancel={() => {
              start.current = null;
            }}
          />
          {selection && canvas.current && <div className="crop-outline" style={{left:selection.x/canvas.current.width*100+'%',top:selection.y/canvas.current.height*100+'%',width:selection.w/canvas.current.width*100+'%',height:selection.h/canvas.current.height*100+'%'}}/>}</div>
          {selection && (
            <p className="crop-note">
              Ausschnitt: {Math.round(selection.w)} × {Math.round(selection.h)}{" "}
              px
            </p>
          )}
        </div>
        {error && <p className="error">{error}</p>}
        <footer>
          <button onClick={onClose}>Abbrechen</button>
          <button
            className="primary"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              canvas.current!.toBlob(async (b) => {
                try {
                  if (!b) throw new Error("Bild nicht verfügbar.");
                  await onSave(b);
                  onClose();
                } catch (e) {
                  setError((e as Error).message);
                  setBusy(false);
                }
              }, "image/png");
            }}
          >
            <Check size={17} />
            {busy ? "Speichert …" : "Bild übernehmen"}
          </button>
        </footer>
      </div>
    </div>
  );
}
