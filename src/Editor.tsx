import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Stage,
  Layer as CanvasLayer,
  Image as KImage,
  Transformer,
} from "react-konva";
import Konva from "konva";
import {
  Undo2,
  Redo2,
  Download,
  FlipHorizontal,
  Trash2,
  ArrowUp,
  ArrowDown,
  ImagePlus,
  MousePointer2,
} from "lucide-react";
import { type Scene, type Item, type Layer } from "./model";
import { download } from "./api";
const brightnessFilters = [Konva.Filters.Brighten];
function useImage(url: string) {
  const [loaded, set] = useState<{ url: string; image: HTMLImageElement }>();
  useEffect(() => {
    set(undefined);
    if (!url) return;
    const i = new Image();
    i.onload = () => set({ url, image: i });
    i.src = url;
    return () => {
      i.onload = null;
    };
  }, [url]);
  return loaded?.url === url ? loaded.image : undefined;
}
function Furniture({
  item,
  layer,
  w,
  h,
  selected,
  onSelect,
  onChange,
  onReady,
}: {
  item: Item;
  layer: Layer;
  w: number;
  h: number;
  selected: boolean;
  onSelect: () => void;
  onChange: (l: Layer) => void;
  onReady: (url: string, ready: boolean) => void;
}) {
  const image = useImage(item.image);
  useEffect(() => onReady(item.image, !!image), [item.image, image, onReady]);
  const ref = useRef<Konva.Image>(null);
  const tr = useRef<Konva.Transformer>(null);
  useEffect(() => {
    const n = ref.current;
    if (!n || !image) return;
    if (layer.brightness) n.cache({ pixelRatio: 2 });
    else n.clearCache();
    n.getLayer()?.batchDraw();
  }, [image, layer.brightness, layer.shadow, layer.width, layer.height, w, h]);
  useEffect(() => {
    if (selected && tr.current && ref.current) {
      tr.current.nodes([ref.current]);
      tr.current.getLayer()?.batchDraw();
    }
  }, [selected, image]);
  return (
    <>
      <KImage
        ref={ref}
        image={image}
        x={layer.x * w}
        y={layer.y * h}
        width={layer.width * w}
        height={layer.height * h}
        scaleX={layer.flip ? -1 : 1}
        rotation={layer.rotation}
        skewX={layer.skew ?? 0}
        shadowColor="black"
        shadowOpacity={layer.shadow ?? 0}
        shadowBlur={Math.max(
          3,
          Math.min(layer.width * w, layer.height * h) * 0.045,
        )}
        shadowOffsetX={layer.width * w * 0.015}
        shadowOffsetY={layer.height * h * 0.025}
        filters={layer.brightness ? brightnessFilters : undefined}
        brightness={layer.brightness ?? 0}
        draggable
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={(e) =>
          onChange({ ...layer, x: e.target.x() / w, y: e.target.y() / h })
        }
        onTransformEnd={() => {
          const n = ref.current!;
          const sx = n.scaleX(),
            sy = n.scaleY();
          n.scaleX(layer.flip ? -1 : 1);
          n.scaleY(1);
          onChange({
            ...layer,
            x: n.x() / w,
            y: n.y() / h,
            width: Math.max(0.005, Math.min(5, (n.width() * Math.abs(sx)) / w)),
            height: Math.max(
              0.005,
              Math.min(5, (n.height() * Math.abs(sy)) / h),
            ),
            rotation: n.rotation(),
          });
        }}
      />
      {selected && (
        <Transformer
          ref={tr}
          flipEnabled={false}
          rotateEnabled
          anchorSize={12}
          borderStroke="#294e43"
          anchorStroke="#294e43"
          anchorCornerRadius={3}
          boundBoxFunc={(old, b) =>
            Math.abs(b.width) < 15 || Math.abs(b.height) < 15 ? old : b
          }
        />
      )}
    </>
  );
}
export default function Editor({
  scene,
  items,
  onChange,
  onUpload,
}: {
  scene?: Scene;
  items: Item[];
  onChange: (s: Scene) => void;
  onUpload: () => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const stage = useRef<Konva.Stage>(null);
  const [size, setSize] = useState(800);
  const [selected, select] = useState("");
  const [original, setOriginal] = useState(false);
  const [ready, setReady] = useState<Record<string, boolean>>({});
  const onReady = useCallback(
    (url: string, loaded: boolean) =>
      setReady((v) => (v[url] === loaded ? v : { ...v, [url]: loaded })),
    [],
  );
  const [history, setHistory] = useState<Scene[]>([]),
    [redo, setRedo] = useState<Scene[]>([]);
  const bg = useImage(scene?.image ?? "");
  useEffect(() => {
    const o = new ResizeObserver((e) => setSize(e[0].contentRect.width));
    if (box.current) o.observe(box.current);
    return () => o.disconnect();
  }, []);
  useEffect(() => {
    select("");
    setHistory([]);
    setRedo([]);
  }, [scene?.id, items.map((i) => i.id).join(",")]);
  useEffect(() => {
    if (scene?.layers.length) {
      select(scene.layers.at(-1)!.id);
      setOriginal(false);
    }
  }, [scene?.id, scene?.layers.length]);
  const h = scene ? (size * scene.height) / scene.width : size * 0.64;
  function commit(s: Scene) {
    if (!scene) return;
    setHistory((v) => [...v.slice(-29), structuredClone(scene)]);
    setRedo([]);
    onChange(s);
  }
  function change(l: Layer) {
    if (scene)
      commit({
        ...scene,
        layers: scene.layers.map((x) => (x.id === l.id ? l : x)),
      });
  }
  const active = scene?.layers.find((l) => l.id === selected);
  return (
    <div className="editor">
      <div className="editor-tools">
        <div className="toolgroup">
          <button
            title="Rückgängig"
            disabled={!history.length}
            onClick={() => {
              if (!scene) return;
              onChange(history.at(-1)!);
              setRedo([...redo, scene]);
              setHistory(history.slice(0, -1));
            }}
          >
            <Undo2 size={18} />
          </button>
          <button
            title="Wiederholen"
            disabled={!redo.length}
            onClick={() => {
              if (!scene) return;
              onChange(redo.at(-1)!);
              setHistory([...history, scene]);
              setRedo(redo.slice(0, -1));
            }}
          >
            <Redo2 size={18} />
          </button>
          <span className="divider" />
          <button
            disabled={!scene?.layers.length}
            aria-pressed={original}
            onClick={() => {
              setOriginal(!original);
              select("");
            }}
          >
            {original ? "Möbel zeigen" : "Original zeigen"}
          </button>
          <span className="toolhint">
            <MousePointer2 size={14} /> Möbel anklicken & verschieben
          </span>
        </div>
        <button
          disabled={
            !scene ||
            !bg ||
            items.some(
              (i) =>
                scene.layers.some((l) => l.itemId === i.id) &&
                (!i.image || !ready[i.image]),
            )
          }
          onClick={() => {
            select("");
            setTimeout(() => {
              try {
                download(
                  stage.current!.toDataURL({ pixelRatio: scene!.width / size }),
                  "Mein-Raum.png",
                );
              } catch {
                alert(
                  "Ein Bild konnte nicht exportiert werden. Bitte Möbelbild erneut hochladen.",
                );
              }
            }, 100);
          }}
        >
          <Download size={17} />
          <span>Bild speichern</span>
        </button>
      </div>
      <div className="canvas-wrap" ref={box}>
        {scene ? (
          <>
            <Stage
              ref={stage}
              width={size}
              height={h}
              onMouseDown={(e) => {
                if (
                  e.target === e.target.getStage() ||
                  e.target.name() === "background"
                )
                  select("");
              }}
              onTouchStart={(e) => {
                if (e.target.name() === "background") select("");
              }}
            >
              <CanvasLayer>
                <KImage name="background" image={bg} width={size} height={h} />
                {!original &&
                  scene.layers.map((l) => {
                    const item = items.find((i) => i.id === l.itemId);
                    return item ? (
                      <Furniture
                        key={l.id}
                        item={item}
                        layer={l}
                        w={size}
                        h={h}
                        selected={selected === l.id}
                        onSelect={() => select(l.id)}
                        onChange={change}
                        onReady={onReady}
                      />
                    ) : null;
                  })}
              </CanvasLayer>
            </Stage>
            {!bg && <div className="loading-photo">Foto wird geladen …</div>}
          </>
        ) : (
          <div className="empty-room">
            <div className="room-illustration">
              <svg viewBox="0 0 360 240" fill="none">
                <path
                  d="M45 190V60l135-35 135 35v130l-135 30-135-30Z"
                  fill="#e9e5db"
                />
                <path
                  d="M180 25v132M45 190l135-33 135 33"
                  stroke="#c8c3b5"
                  strokeWidth="2"
                />
                <path
                  d="M215 68l62 15v65l-62-9V68Z"
                  fill="#f8f7ef"
                  stroke="#c8c3b5"
                  strokeWidth="2"
                />
                <path d="M246 76v68M215 104l62 11" stroke="#c8c3b5" />
                <path d="m82 166 62-15 93 21-65 17-90-23Z" fill="#d1c1a4" />
                <path
                  d="M82 166v-33l63-16v34M145 117l92 22v33M82 133l90 23 65-17M172 156v33"
                  fill="#dce4d7"
                  stroke="#a6b49e"
                  strokeWidth="2"
                />
                <path
                  d="M111 195v-20M213 200v-23"
                  stroke="#7f8f79"
                  strokeWidth="4"
                />
                <path
                  d="M282 177v-41m0 13c-25-1-25-22-25-22s24-3 25 22Zm0 7c22-2 24-23 24-23s-26 0-24 23Z"
                  fill="#a8b79d"
                  stroke="#87997b"
                />
                <path d="M271 173h24l-5 22h-14l-5-22Z" fill="#bf9e80" />
              </svg>
            </div>
            <span className="eyebrow">DEIN RAUM. DEINE IDEEN.</span>
            <h2>Hier beginnt dein neues Zuhause.</h2>
            <p>
              Lade ein Foto hoch und entdecke,
              <br />
              wie deine Lieblingsmöbel darin aussehen.
            </p>
            <button className="primary" onClick={onUpload}>
              <ImagePlus size={18} />
              Raumfoto hochladen
            </button>
            <small>JPG, PNG oder WebP · bis 10 MB</small>
          </div>
        )}
      </div>
      {active && (
        <div className="transform-bar">
          <strong>{items.find((i) => i.id === active.itemId)?.name}</strong>
          {(["x", "y", "width", "height", "rotation"] as const).map((k, i) => (
            <label key={k}>
              {["X %", "Y %", "Breite %", "Höhe %", "Winkel °"][i]}
              <input
                type="number"
                step="1"
                value={Math.round(active[k] * (k === "rotation" ? 1 : 100))}
                onChange={(e) => {
                  const n =
                    Number(e.target.value) / (k === "rotation" ? 1 : 100);
                  if ((k === "width" || k === "height") && (n < 0.005 || n > 5))
                    return;
                  change({ ...active, [k]: n });
                }}
              />
            </label>
          ))}
          <label className="appearance-control">
            Schatten
            <input
              aria-label="Schatten"
              type="range"
              min="0"
              max=".7"
              step=".01"
              value={active.shadow ?? 0}
              onChange={(e) => change({ ...active, shadow: +e.target.value })}
            />
          </label>
          <label className="appearance-control">
            Helligkeit
            <input
              aria-label="Helligkeit"
              type="range"
              min="-.4"
              max=".4"
              step=".01"
              value={active.brightness ?? 0}
              onChange={(e) =>
                change({ ...active, brightness: +e.target.value })
              }
            />
          </label>
          <label className="appearance-control">
            Neigung
            <input
              aria-label="Neigung"
              type="range"
              min="-.3"
              max=".3"
              step=".01"
              value={active.skew ?? 0}
              onChange={(e) => change({ ...active, skew: +e.target.value })}
            />
          </label>
          <button
            title="Spiegeln"
            onClick={() => change({ ...active, flip: !active.flip })}
          >
            <FlipHorizontal size={17} />
          </button>
          <button
            title="Nach vorne"
            onClick={() =>
              scene &&
              commit({
                ...scene,
                layers: [
                  ...scene.layers.filter((l) => l.id !== active.id),
                  active,
                ],
              })
            }
          >
            <ArrowUp size={17} />
          </button>
          <button
            title="Nach hinten"
            onClick={() =>
              scene &&
              commit({
                ...scene,
                layers: [
                  active,
                  ...scene.layers.filter((l) => l.id !== active.id),
                ],
              })
            }
          >
            <ArrowDown size={17} />
          </button>
          <button
            title="Aus Foto entfernen"
            onClick={() => {
              if (scene)
                commit({
                  ...scene,
                  layers: scene.layers.filter((l) => l.id !== active.id),
                });
              select("");
            }}
          >
            <Trash2 size={17} />
          </button>
        </div>
      )}
      <div className="canvas-caption">
        <span>
          <i className="dot" />
          Manuelle Fotovorschau
        </span>
        <span>Dein Originalfoto bleibt erhalten</span>
      </div>
    </div>
  );
}
