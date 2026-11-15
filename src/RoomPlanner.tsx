import React, { useEffect, useState } from "react";
import {
  Plus,
  Trash2,
  ScanLine,
  Volume2,
  Armchair,
  Check,
  RotateCcw,
} from "lucide-react";
import { type Project, uid, room3DSchema, dimensionsSchema } from "./model";
import {
  defaultRoom,
  evaluateFit,
  dimensionsOf,
  objectLabel,
  speakerYaw,
  type RoomObject,
  type Slope,
  type Room3D,
} from "./space";
import { defaultAudio, recommendSpeakers } from "./audio";
import { roofCandidates, type EdgeCandidate } from "./roof-edges";
import ThreeRoom from "./ThreeRoom";
export default function RoomPlanner({
  project,
  onChange,
  sceneId,
}: {
  project: Project;
  onChange: (p: Project) => void;
  sceneId: string;
}) {
  const room = project.room3D ?? defaultRoom(),
    [selected, setSelected] = useState(""),
    [mode, setMode] = useState<"translate" | "rotate">("translate"),
    [showRoof, setShowRoof] = useState(true),
    [error, setError] = useState(""),
    [draft, setDraft] = useState({
      width: String(room.width),
      length: String(room.length),
      height: String(room.height),
    }),
    [size, setSize] = useState({ width: "", height: "", depth: "" }),
    [photoId, setPhotoId] = useState(
      project.scenes.find((s) => s.kind !== "plan")?.id ?? "",
    ),
    [lines, setLines] = useState<EdgeCandidate[]>([]),
    [chosen, setChosen] = useState(0),
    [searching, setSearching] = useState(false),
    [wall, setWall] = useState<Slope["wall"]>("left"),
    [knee, setKnee] = useState(""),
    [run, setRun] = useState("");
  const active = room.objects.find((o) => o.id === selected),
    photo = project.scenes.find((s) => s.id === photoId),
    fits = evaluateFit(room, room.objects, project.items);
  function update(next: Room3D) {
    const parsed = room3DSchema.safeParse(next);
    if (!parsed.success) {
      setError(
        parsed.error.issues[0]?.message ?? "Bitte die Raumdaten prüfen.",
      );
      return;
    }
    onChange({ ...project, room3D: parsed.data });
    setError("");
  }
  function edit(o: RoomObject, changes: Partial<RoomObject>) {
    update({
      ...room,
      objects: room.objects.map((x) =>
        x.id === o.id ? { ...x, ...changes } : x,
      ),
    });
  }
  useEffect(() => {
    const d = active ? dimensionsOf(active, project.items) : undefined;
    setSize({
      width: d ? String(Math.round(d.width * 1000) / 10) : "",
      height: d ? String(Math.round(d.height * 1000) / 10) : "",
      depth: d ? String(Math.round(d.depth * 1000) / 10) : "",
    });
  }, [selected, project.items, active?.dimensions]);
  useEffect(() => {
    setLines([]);
    setChosen(0);
  }, [photoId]);
  function addFurniture() {
    const objects = [
      ...room.objects.filter(
        (o) =>
          o.kind !== "furniture" ||
          project.items.some((i) => i.id === o.itemId),
      ),
    ];
    let truncated = false;
    for (const item of project.items) {
      const count = objects.filter((o) => o.itemId === item.id).length;
      for (let n = count; n < item.quantity; n++) {
        if (objects.length >= 100) {
          truncated = true;
          break;
        }
        const index = objects.length;
        objects.push({
          id: uid(),
          kind: "furniture",
          itemId: item.id,
          x: 0.7 + (index % 3) * 1.1,
          y: 0,
          z: 0.7 + Math.floor(index / 3) * 1.1,
          rotation: 0,
        });
      }
    }
    update({ ...room, objects });
    setSelected(objects.find((o) => o.kind === "furniture")?.id ?? "");
    if (truncated)
      setError(
        "Es sind höchstens 100 Objekte gleichzeitig in der 3D-Ansicht möglich. Weitere Mengen wurden nicht übernommen.",
      );
  }
  function addAudio(fromPlan = false) {
    const a =
      fromPlan && currentPlan?.audio
        ? currentPlan.audio
        : {
            ...defaultAudio(),
            roomWidth: room.width,
            roomLength: room.length,
            mode:
              room.audioSystem === "coverage"
                ? ("coverage" as const)
                : ("cinema" as const),
            system:
              room.audioSystem === "coverage"
                ? ("2.0" as const)
                : room.audioSystem,
            count: room.audioCount,
          };
    const speakers = recommendSpeakers(a);
    if (
      fromPlan &&
      (Math.abs(a.roomWidth - room.width) > 0.01 ||
        Math.abs(a.roomLength - room.length) > 0.01)
    ) {
      setError(
        "Bitte zuerst Breite und Länge aus dem Audioplan eintragen und als Raummaße bestätigen.",
      );
      return;
    }
    const furniture = room.objects.filter((o) => o.kind === "furniture");
    if (furniture.length + speakers.length > 100) {
      setError(
        "Für die Lautsprecher sind nicht genug freie 3D-Objektplätze vorhanden.",
      );
      return;
    }
    update({
      ...room,
      objects: [
        ...furniture,
        ...speakers.map((s) => ({
          id: uid(),
          kind: s.kind === "sub" ? ("sub" as const) : ("speaker" as const),
          label: s.label,
          x: s.x * room.width,
          y: 0,
          z: s.y * room.length,
          rotation: speakerYaw(
            (s.target.x - s.x) * room.width,
            (s.target.y - s.y) * room.length,
          ),
        })),
      ],
    });
  }
  function addSlope(fromPhoto: boolean) {
    if (!room.confirmed) {
      setError("Bitte zuerst die Raummaße bestätigen.");
      return;
    }
    if (!knee.trim() || !run.trim()) {
      setError(
        "Kniestockhöhe und horizontale Tiefe bitte am Raum messen und eintragen.",
      );
      return;
    }
    const slope: Slope = {
      id: uid(),
      wall,
      knee: Number(knee.replace(",", ".")),
      run: Number(run.replace(",", ".")),
      source: fromPhoto ? "photo-confirmed" : "manual",
      ...(fromPhoto ? { photoId } : {}),
    };
    update({
      ...room,
      slopes: [...room.slopes.filter((s) => s.wall !== wall), slope],
    });
  }
  const currentPlan = project.scenes.find(
    (s) => s.id === sceneId && s.audio?.roomConfirmed,
  );
  return (
    <div className="room-planner">
      <div className="space-intro">
        <strong>Raummaße und Passprüfung</strong>
        <p>
          Der 3D-Raum verwendet deine bestätigten Maße. Möbel werden als
          vereinfachte Maßkörper mit Produktbild dargestellt. Dachschrägen und
          Überschneidungen werden bei der Prüfung berücksichtigt.
        </p>
      </div>
      <form
        className="room-measures"
        onSubmit={(e) => {
          e.preventDefault();
          update({
            ...room,
            width: Number(draft.width.replace(",", ".")),
            length: Number(draft.length.replace(",", ".")),
            height: Number(draft.height.replace(",", ".")),
            confirmed: true,
          });
        }}
      >
        {(["width", "length", "height"] as const).map((k, i) => (
          <label key={k}>
            {["Raumbreite (m)", "Raumlänge (m)", "Maximale Raumhöhe (m)"][i]}
            <input
              aria-label={["3D-Raumbreite", "3D-Raumlänge", "3D-Raumhöhe"][i]}
              required
              type="number"
              step=".01"
              min=".5"
              max={k === "height" ? 20 : 80}
              value={draft[k]}
              onChange={(e) => setDraft({ ...draft, [k]: e.target.value })}
            />
          </label>
        ))}
        <button className="primary">
          <Check size={16} />
          Raummaße bestätigen
        </button>
      </form>
      {!room.confirmed && (
        <p className="space-warning">
          Die dargestellten 4 × 6 × 2,5 m sind Beispielmaße. Eine positive
          Passprüfung ist erst nach deiner Bestätigung möglich.
        </p>
      )}
      {currentPlan && (
        <button
          onClick={() => {
            const a = currentPlan.audio!;
            setDraft({
              width: String(a.roomWidth),
              length: String(a.roomLength),
              height: draft.height,
            });
            setError(
              "Breite und Länge aus dem Audioplan sind eingetragen. Höhe prüfen und Raummaße bestätigen.",
            );
          }}
        >
          Breite und Länge aus Audioplan eintragen
        </button>
      )}
      <div className="space-actions">
        <button disabled={!project.items.length} onClick={addFurniture}>
          <Armchair size={16} />
          Möbelauswahl in 3D übernehmen
        </button>
        <label>
          Audio
          <select
            aria-label="3D-Audiosystem"
            value={room.audioSystem}
            onChange={(e) =>
              update({
                ...room,
                audioSystem: e.target.value as Room3D["audioSystem"],
              })
            }
          >
            <option value="coverage">Musik im ganzen Raum</option>
            {["2.0", "2.1", "5.1", "7.1"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        {room.audioSystem === "coverage" && (
          <label>
            Lautsprecher
            <select
              aria-label="3D-Lautsprecheranzahl"
              value={room.audioCount}
              onChange={(e) =>
                update({ ...room, audioCount: +e.target.value as 2 | 4 | 6 })
              }
            >
              {[2, 4, 6].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
        )}
        <button onClick={() => addAudio()}>
          <Volume2 size={16} />
          Audio platzieren
        </button>
        {currentPlan && (
          <button onClick={() => addAudio(true)}>
            Audio aus Audioplan übernehmen
          </button>
        )}
      </div>
      <div className="three-tools">
        <button
          className={mode === "translate" ? "active" : ""}
          onClick={() => setMode("translate")}
        >
          Verschieben (X/Y/Z)
        </button>
        <button
          className={mode === "rotate" ? "active" : ""}
          onClick={() => setMode("rotate")}
        >
          Drehen
        </button>
        <label className="cutout-option">
          <input
            type="checkbox"
            checked={showRoof}
            onChange={(e) => setShowRoof(e.target.checked)}
          />
          Dach / Decke zeigen
        </label>
      </div>
      <p className="fineprint">
        Möbel oder Lautsprecher anklicken und mit den farbigen Pfeilen bewegen.
        Leere Fläche ziehen: Kamera drehen. Mausrad oder zwei Finger: zoomen.
        Positionen lassen sich auch unten als Zahlen eingeben.
      </p>
      <ThreeRoom
        room={room}
        items={project.items}
        selected={selected}
        onSelect={setSelected}
        onMove={(id, point) => {
          const o = room.objects.find((o) => o.id === id);
          if (o) edit(o, point);
        }}
        mode={mode}
        showRoof={showRoof}
      />
      <div className="fit-legend">
        <span>Grün: geprüfter Maßkörper passt am Standort</span>
        <span>Rot: Kollision oder Raumgrenze</span>
        <span>Grau: Maße fehlen / nicht bestätigt</span>
      </div>
      <div className="object-list">
        {room.objects.length === 0 && (
          <p>
            Noch keine Objekte in 3D. Übernimm Möbel aus deiner Auswahl oder
            füge Audio-Platzhalter hinzu.
          </p>
        )}
        {room.objects.map((o) => {
          const fit = fits.find((f) => f.id === o.id)!;
          return (
            <button
              key={o.id}
              className={
                (selected === o.id ? "chosen " : "") +
                (!fit.known
                  ? "unknown"
                  : fit.issues.length
                    ? "invalid"
                    : "valid")
              }
              onClick={() => setSelected(o.id)}
            >
              <strong>{objectLabel(o, project.items)}</strong>
              <small>
                {!fit.known
                  ? "Nicht prüfbar"
                  : fit.issues.length
                    ? "Passt hier nicht"
                    : "Passt am Standort"}
              </small>
            </button>
          );
        })}
      </div>
      {active && (
        <div className="object-editor">
          <div className="section-heading">
            <h3>{objectLabel(active, project.items)}</h3>
            <button
              onClick={() => {
                update({
                  ...room,
                  objects: room.objects.filter((o) => o.id !== active.id),
                });
                setSelected("");
              }}
            >
              <Trash2 size={15} />
              Aus 3D entfernen
            </button>
          </div>
          <div className="space-position">
            {(["x", "y", "z", "rotation"] as const).map((key, i) => (
              <label key={key}>
                {
                  [
                    "X quer (m)",
                    "Höhe über Boden (m)",
                    "Z Tiefe (m)",
                    "Drehung (°)",
                  ][i]
                }
                <input
                  aria-label={
                    ["Objekt X", "Objekt Höhe", "Objekt Z", "Objekt Drehung"][i]
                  }
                  type="number"
                  step={key === "rotation" ? 5 : 0.01}
                  value={Math.round(active[key] * 100) / 100}
                  onChange={(e) => {
                    const n = +e.target.value;
                    if (Number.isFinite(n)) edit(active, { [key]: n });
                  }}
                />
              </label>
            ))}
          </div>
          <form
            className="object-dimensions"
            onSubmit={(e) => {
              e.preventDefault();
              const dimensions = {
                width: Number(size.width.replace(",", ".")) / 100,
                height: Number(size.height.replace(",", ".")) / 100,
                depth: Number(size.depth.replace(",", ".")) / 100,
              };
              const result = dimensionsSchema.safeParse(dimensions);
              if (!result.success) {
                setError(
                  "Bitte Breite, Höhe und Tiefe als gültige Zentimetermaße eingeben.",
                );
                return;
              }
              if (active.kind === "furniture") {
                onChange({
                  ...project,
                  items: project.items.map((i) =>
                    i.id === active.itemId ? { ...i, dimensions } : i,
                  ),
                });
              } else edit(active, { dimensions });
              setError("");
            }}
          >
            {(["width", "height", "depth"] as const).map((k, i) => (
              <label key={k}>
                {
                  [
                    "Möbel-/Gerätebreite (cm)",
                    "Möbel-/Gerätehöhe (cm)",
                    "Möbel-/Gerätetiefe (cm)",
                  ][i]
                }
                <input
                  aria-label={
                    ["Objektbreite cm", "Objekthöhe cm", "Objekttiefe cm"][i]
                  }
                  required
                  min="1"
                  type="number"
                  step=".1"
                  placeholder="Gemessener Wert"
                  value={size[k]}
                  onChange={(e) => setSize({ ...size, [k]: e.target.value })}
                />
              </label>
            ))}
            <button className="primary">Objektmaße speichern</button>
          </form>
          <ul className="fit-issues">
            {fits
              .find((f) => f.id === active.id)
              ?.issues.map((issue, i) => (
                <li key={i}>{issue}</li>
              ))}
          </ul>
        </div>
      )}
      <section className="roof-section">
        <h3>Dachschrägen</h3>
        <p>
          Bei einer Schräge wird die niedrigere Höhe über dem gesamten Möbel
          geprüft. Trage die Kniestockhöhe und die horizontale Strecke bis zur
          vollen Raumhöhe ein.
        </p>
        <div className="roof-slopes">
          {room.slopes.map((s) => (
            <div key={s.id}>
              <span>
                {
                  {
                    left: "Links",
                    right: "Rechts",
                    front: "Vorn",
                    back: "Hinten",
                  }[s.wall]
                }
                : Kniestock {s.knee} m · Tiefe {s.run} m{" "}
                {s.source === "photo-confirmed"
                  ? "· anhand Foto bestätigt"
                  : ""}
              </span>
              <button
                aria-label="Dachschräge entfernen"
                onClick={() =>
                  update({
                    ...room,
                    slopes: room.slopes.filter((x) => x.id !== s.id),
                  })
                }
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
        <div className="roof-photo">
          <label>
            Raumfoto
            <select
              aria-label="Dachschrägen-Foto"
              value={photoId}
              onChange={(e) => setPhotoId(e.target.value)}
            >
              <option value="">Foto auswählen</option>
              {project.scenes
                .filter((s) => s.kind !== "plan")
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </select>
          </label>
          <button
            disabled={!photo || searching}
            onClick={async () => {
              if (!photo) return;
              setSearching(true);
              try {
                const result = await roofCandidates(photo.image);
                setLines(result);
                setChosen(0);
                setError(
                  result.length
                    ? "Mögliche diagonale Kanten gefunden. Das können auch Möbel- oder Türrahmen sein. Bitte die Dachkante im Foto prüfen."
                    : "Keine deutlichen diagonalen Kanten gefunden. Du kannst die Dachschräge trotzdem manuell eintragen.",
                );
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setSearching(false);
              }
            }}
          >
            <ScanLine size={16} />
            {searching
              ? "Foto wird lokal untersucht …"
              : "Mögliche Dachkanten suchen"}
          </button>
        </div>
        {photo && lines.length > 0 && (
          <>
            <svg
              className="roof-candidates"
              viewBox={`0 0 ${photo.width} ${photo.height}`}
            >
              <image
                href={photo.image}
                width={photo.width}
                height={photo.height}
              />
              {lines.map((line, i) => (
                <line
                  key={i}
                  x1={line.start.x * photo.width}
                  y1={line.start.y * photo.height}
                  x2={line.end.x * photo.width}
                  y2={line.end.y * photo.height}
                  stroke={chosen === i ? "#ff803c" : "#85b5e3"}
                  strokeWidth={Math.max(4, photo.width * 0.006)}
                  onClick={() => setChosen(i)}
                />
              ))}
            </svg>
            <label>
              Mögliche Kante
              <select
                aria-label="Dachkanten-Vorschlag"
                value={chosen}
                onChange={(e) => setChosen(+e.target.value)}
              >
                {lines.map((_, i) => (
                  <option key={i} value={i}>
                    Kandidat {i + 1} – bitte im Foto bestätigen
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
        <div className="slope-inputs">
          <label>
            Wand im 3D-Raum
            <select
              aria-label="Dachschrägenwand"
              value={wall}
              onChange={(e) => setWall(e.target.value as Slope["wall"])}
            >
              <option value="left">Links (X = 0)</option>
              <option value="right">Rechts (X = Raumbreite)</option>
              <option value="front">Vorn (Z = 0)</option>
              <option value="back">Hinten (Z = Raumtiefe)</option>
            </select>
          </label>
          <label>
            Kniestockhöhe (m)
            <input
              aria-label="Kniestockhöhe"
              type="number"
              min="0"
              max={room.height}
              step=".01"
              value={knee}
              onChange={(e) => setKnee(e.target.value)}
              placeholder="Bitte messen"
            />
          </label>
          <label>
            Horizontale Tiefe (m)
            <input
              aria-label="Schrägentiefe"
              type="number"
              min=".01"
              step=".01"
              value={run}
              onChange={(e) => setRun(e.target.value)}
              placeholder="Bis zur vollen Raumhöhe"
            />
          </label>
        </div>
        <div className="row">
          <button
            disabled={!room.confirmed || !lines.length}
            onClick={() => addSlope(true)}
          >
            <Check size={16} />
            Foto-Vorschlag mit Maßen bestätigen
          </button>
          <button disabled={!room.confirmed} onClick={() => addSlope(false)}>
            <Plus size={16} />
            Dachschräge manuell hinzufügen
          </button>
        </div>
        <p className="fineprint">
          Die Fotoanalyse findet geometrische Kanten, keine verlässlichen
          Raummaße. Eine Schräge wird erst nach deiner Bestätigung
          berücksichtigt. Türen, Schubladen, Sockelleisten und Transportwege
          werden in der Maßkörperprüfung nicht erfasst.
        </p>
      </section>
      {error && (
        <p className="space-message" role="status">
          {error}
        </p>
      )}
    </div>
  );
}
