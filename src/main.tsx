import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import {
  Armchair,
  Plus,
  ArrowLeft,
  Search,
  Link2,
  X,
  ExternalLink,
  ImagePlus,
  Trash2,
  SlidersHorizontal,
  Wallet,
  Check,
  Cloud,
  Download,
  Image as ImageIcon,
  ChevronRight,
  Layers,
  RefreshCw,
  Pencil,
  AlertCircle,
  Loader2,
  Home,
} from "lucide-react";
import { flushLatest } from "./persistence";
import Editor from "./Editor";
import Cutout from "./Cutout";
import {
  type Project,
  type Item,
  type Scene,
  budget,
  euro,
  moneyInput,
  moneyValue,
  csv,
  uid,
  safeUrl,
  projectSchema,
} from "./model";
import { api, upload, normalize, download } from "./api";
import "./style.css";
import { shopSearches } from "./shops";
import { isOffline } from "./offline";
type RecordRow = {
  id: string;
  name: string;
  revision: number;
  updated_at: string;
};
const blankItem = (category: string): Item => ({
  id: uid(),
  name: "",
  category,
  price: null,
  quantity: 1,
  merchant: "",
  url: "",
  image: "",
  observedAt: new Date().toISOString(),
});
function Price({
  value,
  onChange,
  label,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  label: string;
}) {
  return (
    <label>
      {label}
      <div className="price-field">
        <input
          aria-label={label}
          type="number"
          min="0"
          step=".01"
          value={moneyValue(value)}
          onChange={(e) => onChange(moneyInput(e.target.value))}
          placeholder="Offen"
        />
        <span>€</span>
      </div>
    </label>
  );
}
function ProductForm({
  initial,
  categories,
  onClose,
  onSave,
}: {
  initial: Item;
  categories: string[];
  onClose: () => void;
  onSave: (i: Item, f?: File) => Promise<void>;
}) {
  const [item, set] = useState(initial),
    [file, setFile] = useState<File>(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [preview, setPreview] = useState("");
  useEffect(() => {
    if (!file) {
      setPreview(item.image);
      return;
    }
    const u = URL.createObjectURL(file);
    setPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [file, item.image]);
  const edit = (v: Partial<Item>) => set((i) => ({ ...i, ...v }));
  return (
    <div className="modal-backdrop">
      <form
        className="modal"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            if (item.url && !safeUrl(item.url))
              throw new Error("Bitte gültigen Produktlink angeben.");
            await onSave(item, file);
            onClose();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <header>
          <div>
            <span className="eyebrow">DEINE MÖBELAUSWAHL</span>
            <h2>
              {initial.name ? "Produkt bearbeiten" : "Eigenes Möbel hinzufügen"}
            </h2>
          </div>
          <button type="button" aria-label="Schließen" onClick={onClose}>
            <X />
          </button>
        </header>
        <label>
          Produktlink
          <div className="inline">
            <input
              type="url"
              value={item.url}
              placeholder="https://shop.de/dein-moebel"
              onChange={(e) => edit({ url: e.target.value })}
            />
            <button
              type="button"
              disabled={busy || !item.url || isOffline}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  const p = await api("import", { url: item.url });
                  edit({ ...p, name: p.name || item.name });
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Einlesen
            </button>
          </div>
        </label>
        <div className="product-form-body">
          <div className="product-photo">
            {preview ? (
              <img src={preview} alt="Möbelvorschau" />
            ) : (
              <Armchair size={54} />
            )}
            <label className="button">
              Bild hochladen
              <input
                hidden
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => {
                  setFile(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
            {item.image && (
              <button
                type="button"
                onClick={() => {
                  edit({ image: "" });
                  setFile(undefined);
                }}
              >
                Bild entfernen
              </button>
            )}
          </div>
          <div className="fields">
            <label>
              Name
              <input
                required
                maxLength={200}
                value={item.name}
                onChange={(e) => edit({ name: e.target.value })}
              />
            </label>
            <label>
              Kategorie
              <select
                value={item.category}
                onChange={(e) => edit({ category: e.target.value })}
              >
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <div className="two-col">
              <Price
                label="Einzelpreis"
                value={item.price}
                onChange={(price) => edit({ price })}
              />
              <label>
                Anzahl
                <input
                  required
                  type="number"
                  min="1"
                  max="999"
                  value={item.quantity}
                  onChange={(e) => edit({ quantity: +e.target.value })}
                />
              </label>
            </div>
            <label>
              Händler
              <input
                maxLength={200}
                value={item.merchant}
                onChange={(e) => edit({ merchant: e.target.value })}
                placeholder="Zum Beispiel IKEA"
              />
            </label>
          </div>
        </div>
        <p className="fineprint">
          Produktdaten und Variante vor dem Übernehmen prüfen. Ein transparentes
          Produktbild eignet sich besonders gut für die Raumvorschau.
        </p>
        {error && <p className="error">{error}</p>}
        <footer>
          <button type="button" onClick={onClose}>
            Abbrechen
          </button>
          <button className="primary" disabled={busy}>
            {busy ? (
              <Loader2 size={17} className="spin" />
            ) : (
              <Check size={17} />
            )}
            Möbel übernehmen
          </button>
        </footer>
      </form>
    </div>
  );
}
function App() {
  const [rows, setRows] = useState<RecordRow[]>([]),
    [p, setP] = useState<Project | null>(null),
    [sceneId, setSceneId] = useState(""),
    [tab, setTab] = useState("room"),
    [panel, setPanel] = useState("discover"),
    [category, setCategory] = useState("Kleiderschrank"),
    [query, setQuery] = useState("Schwarz Eiche"),
    [results, setResults] = useState<any[]>([]),
    [status, setStatus] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [searchBusy, setSearchBusy] = useState(false),
    [form, setForm] = useState<Item | null>(null),
    [cutout, setCutout] = useState<Item | null>(null),
    [shopLinks, setShopLinks] = useState<ReturnType<typeof shopSearches>>([]);
  const revision = useRef(0),
    latest = useRef<Project | null>(null),
    saved = useRef(""),
    chain = useRef<Promise<any>>(Promise.resolve()),
    blocked = useRef(false),
    photoInput = useRef<HTMLInputElement>(null);
  async function refresh() {
    try {
      setRows(await api("projects"));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    refresh();
  }, []);
  const change = (next: Project) => {
    latest.current = next;
    setP(next);
    setStatus("Änderungen …");
  };
  function save() {
    const snapshot = latest.current;
    if (!snapshot || blocked.current) return chain.current;
    chain.current = chain.current
      .catch(() => {})
      .then(async () => {
        if (saved.current === JSON.stringify(snapshot)) return;
        setStatus("Speichert …");
        try {
          const parsed = projectSchema.parse(snapshot);
          const r = await api(
            "projects/" + parsed.id,
            { project: parsed, revision: revision.current },
            "PUT",
          );
          revision.current = r.revision;
          saved.current = JSON.stringify(snapshot);
          setStatus(
            latest.current === snapshot ? "Gespeichert" : "Änderungen …",
          );
        } catch (e) {
          if ((e as any).status === 409) blocked.current = true;
          setStatus(blocked.current ? "Konflikt" : "Speichern fehlgeschlagen");
          setError((e as Error).message);
          throw e;
        }
      });
    return chain.current;
  }
  function flush() {
    return flushLatest(
      () => (latest.current ? JSON.stringify(latest.current) : null),
      () => saved.current,
      async () => {
        await save();
      },
    );
  }
  useEffect(() => {
    if (!p) return;
    const t = setTimeout(() => {
      save().catch(() => {});
    }, 900);
    return () => clearTimeout(t);
  }, [p]);
  useEffect(() => {
    const f = (e: BeforeUnloadEvent) => {
      if (latest.current && JSON.stringify(latest.current) !== saved.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", f);
    return () => window.removeEventListener("beforeunload", f);
  }, []);
  async function load(id: string) {
    try {
      await flush();
      const r = await api("projects/" + id);
      latest.current = r.project;
      saved.current = JSON.stringify(r.project);
      revision.current = r.revision;
      blocked.current = false;
      setP(r.project);
      setSceneId(r.project.scenes[0]?.id ?? "");
      setStatus("Gespeichert");
      setResults([]);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function create() {
    setBusy(true);
    try {
      await flush();
      const r = await api("projects", {});
      latest.current = r.project;
      saved.current = JSON.stringify(r.project);
      revision.current = r.revision;
      setP(r.project);
      blocked.current = false;
      setSceneId("");
      setStatus("Gespeichert");
      refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const scene = p?.scenes.find((s) => s.id === sceneId),
    b = p ? budget(p) : null,
    limits = p?.limits[category] ?? { min: null, max: null, cap: null };
  async function addPhoto(file: File) {
    if (!p) return;
    setBusy(true);
    setError("");
    try {
      const n = await normalize(file);
      const image = await upload(n.blob, p.id);
      const s: Scene = {
        id: uid(),
        name: file.name.replace(/\.[^.]+$/, ""),
        image,
        width: n.width,
        height: n.height,
        layers: [],
      };
      change({ ...latest.current!, scenes: [...latest.current!.scenes, s] });
      setSceneId(s.id);
      setTab("room");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function saveItem(i: Item, file?: File) {
    if (!p) return;
    let image = i.image;
    if (file) {
      const n = await normalize(file);
      image = await upload(n.blob, p.id);
    } else if (
      image &&
      !image.startsWith("/api/assets/") &&
      !image.startsWith("data:image/")
    ) {
      try {
        image = (await api("image-import", { project: p.id, url: image })).url;
      } catch {
        throw new Error(
          "Das Produktbild konnte nicht geladen werden. Bitte eigenes Bild hochladen oder das Bild entfernen.",
        );
      }
    }
    const item = {
      ...i,
      image,
      merchant: i.merchant.trim() || "Unbekannter Händler",
      url: safeUrl(i.url),
    };
    const now = latest.current!;
    change({
      ...now,
      items: now.items.some((x) => x.id === item.id)
        ? now.items.map((x) => (x.id === item.id ? item : x))
        : [...now.items, item],
    });
    setPanel("selected");
  }
  function place(i: Item) {
    if (!p || !scene) return;
    if (!i.image) {
      setError("Bitte zuerst ein Möbelbild hochladen.");
      setForm(i);
      return;
    }
    const s = {
      ...scene,
      layers: [
        ...scene.layers,
        {
          id: uid(),
          itemId: i.id,
          x: 0.35,
          y: 0.3,
          width: 0.3,
          height: 0.4,
          rotation: 0,
          flip: false,
        },
      ],
    };
    change({ ...p, scenes: p.scenes.map((x) => (x.id === s.id ? s : x)) });
    setTab("room");
  }
  function search() {
    try {
      setShopLinks(
        shopSearches(category + " " + query, limits.min, limits.max),
      );
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function choose(r: any) {
    setForm({ ...blankItem(category), ...r, id: uid() });
  }
  function removeItem(id: string) {
    if (
      !p ||
      !confirm("Dieses Möbel aus der Auswahl und allen Fotos entfernen?")
    )
      return;
    change({
      ...p,
      items: p.items.filter((i) => i.id !== id),
      scenes: p.scenes.map((s) => ({
        ...s,
        layers: s.layers.filter((l) => l.itemId !== id),
      })),
    });
  }
  return (
    <>
      <header className="topbar">
        <a
          className="brand"
          href="/"
          onClick={async (e) => {
            e.preventDefault();
            try {
              await flush();
              setP(null);
              latest.current = null;
              refresh();
            } catch {}
          }}
        >
          <span className="brand-icon">
            <Armchair size={23} />
          </span>
          <span>
            raumplaner<span className="brand-studio">STUDIO</span>
          </span>
        </a>
        <span className="header-note">Ein neuer Blick auf dein Zuhause.</span>
        <span className="private">
          <span className="dot" />
          {isOffline ? "Lokal auf deinem Gerät" : "Dein privates Studio"}
        </span>
      </header>
      {error && (
        <div className="notification" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
          <button aria-label="Meldung schließen" onClick={() => setError("")}>
            <X size={18} />
          </button>
        </div>
      )}
      {!p ? (
        <main className="projects">
          <span className="eyebrow">PLATZ FÜR DEINE IDEEN</span>
          <h1>
            Dein Zuhause.
            <br />
            <em>Neu gedacht.</em>
          </h1>
          <p>
            Probiere Möbel in deinen eigenen Räumen aus.
            <br />
            Mit echten Produkten und einem Budget, das zu dir passt.
          </p>
          {isOffline && (
            <div className="offline-notice">
              <strong>Diese Version speichert auf diesem Gerät.</strong>
              <p>
                Für einen Gerätewechsel oder als Sicherung kannst du dein
                Raumprojekt mit Fotos als Datei exportieren und hier wieder
                öffnen.
              </p>
              <label className="button">
                Projektdatei öffnen
                <input
                  type="file"
                  accept="application/json,.json"
                  hidden
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    try {
                      if (f.size > 100 * 1024 * 1024)
                        throw new Error("Projektdatei zu groß.");
                      const imported = projectSchema.parse(
                        JSON.parse(await f.text()),
                      );
                      for (const image of [
                        ...imported.items.map((i) => i.image),
                        ...imported.scenes.map((s) => s.image),
                      ])
                        if (
                          image &&
                          !/^data:image\/(png|jpeg|webp);base64,/.test(image)
                        )
                          throw new Error(
                            "Die Datei enthält keine eingebetteten Bilder. Bitte eine Offline-Sicherung öffnen.",
                          );
                      const fresh = await api("projects", {});
                      imported.id = fresh.project.id;
                      await api(
                        "projects/" + imported.id,
                        { project: imported, revision: fresh.revision },
                        "PUT",
                      );
                      await load(imported.id);
                      refresh();
                    } catch (e) {
                      setError((e as Error).message);
                    }
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
          )}
          <div className="project-grid">
            <button className="new-project" disabled={busy} onClick={create}>
              <span>
                <Plus size={28} />
              </span>
              <h3>Neuen Raum gestalten</h3>
              <p>Foto hochladen. Möbel ausprobieren.</p>
            </button>
            {rows.map((r) => (
              <div className="project-card" key={r.id}>
                <button className="project-open" onClick={() => load(r.id)}>
                  <Home size={30} />
                  <h3>{r.name}</h3>
                  <small>
                    Bearbeitet{" "}
                    {new Date(r.updated_at).toLocaleDateString("de-DE")}
                  </small>
                  <span>
                    Raum öffnen <ChevronRight size={17} />
                  </span>
                </button>
                <button
                  className="delete-project"
                  aria-label={r.name + " löschen"}
                  onClick={async () => {
                    if (
                      confirm(
                        "Raum und alle zugehörigen Bilder endgültig löschen?",
                      )
                    ) {
                      try {
                        await api("projects/" + r.id, undefined, "DELETE");
                        refresh();
                      } catch (e) {
                        setError((e as Error).message);
                      }
                    }
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
          <div className="how">
            <span>
              01 <strong>Raumfoto hochladen</strong>
            </span>
            <span>
              02 <strong>Lieblingsmöbel finden</strong>
            </span>
            <span>
              03 <strong>Deinen Raum gestalten</strong>
            </span>
          </div>
        </main>
      ) : (
        <>
          <div className="project-heading">
            <div className="heading-title">
              <button
                title="Alle Räume"
                onClick={async () => {
                  try {
                    await flush();
                    setP(null);
                    latest.current = null;
                    refresh();
                  } catch {}
                }}
              >
                <ArrowLeft size={19} />
              </button>
              <div>
                <span className="eyebrow">DEIN RAUMPROJEKT</span>
                <input
                  aria-label="Raumname"
                  value={p.name}
                  maxLength={120}
                  onChange={(e) => change({ ...p, name: e.target.value })}
                />
              </div>
            </div>
            <div className="save-state">
              <button
                style={{ display: isOffline ? "inline-flex" : "none" }}
                title="Raum mit Fotos als Datei sichern"
                onClick={() =>
                  download(
                    new Blob([JSON.stringify(p)], { type: "application/json" }),
                    "Raumplaner-Projekt.json",
                  )
                }
              >
                <Download size={15} />
                Sicherung
              </button>
              <Cloud size={16} />
              {status}
              <button
                onClick={() => save().catch(() => {})}
                disabled={status === "Gespeichert" || blocked.current}
              >
                Jetzt speichern
              </button>
            </div>
          </div>
          {status === "Konflikt" && (
            <div className="conflict">
              Auf einem anderen Gerät wurde etwas geändert.{" "}
              <button
                onClick={() =>
                  download(
                    new Blob([JSON.stringify(p, null, 2)], {
                      type: "application/json",
                    }),
                    "Raum-Entwurf.json",
                  )
                }
              >
                Meinen Entwurf sichern
              </button>
              <button
                onClick={async () => {
                  blocked.current = false;
                  latest.current = null;
                  chain.current = Promise.resolve();
                  await load(p.id);
                }}
              >
                Serverstand laden
              </button>
            </div>
          )}
          <nav className="mobile-tabs">
            <button
              className={tab === "room" ? "active" : ""}
              onClick={() => setTab("room")}
            >
              <ImageIcon size={17} />
              Raum
            </button>
            <button
              className={tab === "furniture" ? "active" : ""}
              onClick={() => setTab("furniture")}
            >
              <Armchair size={17} />
              Möbel
            </button>
            <button
              className={tab === "budget" ? "active" : ""}
              onClick={() => setTab("budget")}
            >
              <Wallet size={17} />
              Budget
            </button>
          </nav>
          <main className={"workspace mobile-" + tab}>
            <section className="room-pane">
              <div className="section-heading">
                <div>
                  <h2>Dein Raum</h2>
                  <p>Aus Ideen wird ein Zuhause.</p>
                </div>
                <button
                  className="outline"
                  disabled={busy}
                  onClick={() => photoInput.current?.click()}
                >
                  <ImagePlus size={16} />
                  Foto hinzufügen
                </button>
              </div>
              <input
                hidden
                ref={photoInput}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) addPhoto(f);
                  e.target.value = "";
                }}
              />
              <Editor
                scene={scene}
                items={p.items}
                onChange={(s) =>
                  change({
                    ...p,
                    scenes: p.scenes.map((x) => (x.id === s.id ? s : x)),
                  })
                }
                onUpload={() => photoInput.current?.click()}
              />
              {p.scenes.length > 0 && (
                <div className="scenes">
                  {p.scenes.map((s) => (
                    <div
                      key={s.id}
                      className={
                        "scene-thumb " + (s.id === sceneId ? "chosen" : "")
                      }
                    >
                      <button onClick={() => setSceneId(s.id)}>
                        <img src={s.image} alt={s.name} />
                        <span>{s.name}</span>
                      </button>
                      <button
                        className="remove-scene"
                        aria-label="Foto entfernen"
                        onClick={() => {
                          if (confirm("Diese Fotoansicht entfernen?")) {
                            change({
                              ...p,
                              scenes: p.scenes.filter((x) => x.id !== s.id),
                            });
                            if (s.id === sceneId)
                              setSceneId(
                                p.scenes.find((x) => x.id !== s.id)?.id ?? "",
                              );
                          }
                        }}
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                  <button
                    className="add-scene"
                    title="Weitere Ansicht"
                    onClick={() => photoInput.current?.click()}
                  >
                    <Plus />
                  </button>
                </div>
              )}
              <div className="tip">
                <span className="tip-icon">
                  <Layers size={21} />
                </span>
                <div>
                  <strong>Ein Raum. Viele Möglichkeiten.</strong>
                  <p>
                    Wähle ein Möbel aus deiner Auswahl und füge es deiner
                    Fotoansicht hinzu. Jedes Möbel zählt einmal im Budget – auch
                    auf mehreren Fotos.
                  </p>
                </div>
              </div>
            </section>
            <aside className="furniture-pane">
              <div className="section-heading">
                <div>
                  <h2>Passende Möbel</h2>
                  <p>Finde, was zu dir passt.</p>
                </div>
                <Armchair className="muted" size={23} />
              </div>
              <div className="switch">
                <button
                  className={panel === "discover" ? "active" : ""}
                  onClick={() => setPanel("discover")}
                >
                  Entdecken
                </button>
                <button
                  className={panel === "selected" ? "active" : ""}
                  onClick={() => setPanel("selected")}
                >
                  Meine Auswahl <span>{p.items.length}</span>
                </button>
              </div>
              {panel === "discover" ? (
                <>
                  <label>
                    Kategorie
                    <div className="inline">
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                      >
                        {p.categories.map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                      <button
                        title="Eigene Kategorie"
                        onClick={() => {
                          const c = prompt("Name der neuen Kategorie")?.trim();
                          if (
                            c &&
                            c.length <= 80 &&
                            !p.categories.includes(c)
                          ) {
                            change({ ...p, categories: [...p.categories, c] });
                            setCategory(c);
                          }
                        }}
                      >
                        <Plus size={17} />
                      </button>
                    </div>
                  </label>
                  <label>
                    Stil, Farbe oder Suchbegriff
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="z. B. Eiche, Schwarz, skandinavisch"
                    />
                  </label>
                  <div className="two-col">
                    <Price
                      label="Preis ab"
                      value={limits.min}
                      onChange={(min) =>
                        change({
                          ...p,
                          limits: {
                            ...p.limits,
                            [category]: { ...limits, min },
                          },
                        })
                      }
                    />
                    <Price
                      label="Preis bis"
                      value={limits.max}
                      onChange={(max) =>
                        change({
                          ...p,
                          limits: {
                            ...p.limits,
                            [category]: { ...limits, max },
                          },
                        })
                      }
                    />
                  </div>
                  <button
                    className="primary full"
                    disabled={false}
                    onClick={search}
                  >
                    {searchBusy ? (
                      <Loader2 className="spin" size={17} />
                    ) : (
                      <Search size={17} />
                    )}
                    Möbel suchen
                  </button>
                  <div className="search-info">
                    <span>
                      Ohne Konto und Suchschlüssel: Öffne eine Shop-Suche,
                      kopiere den Produktlink und füge dein Möbel hinzu. Preise
                      und Bilder werden hier nicht automatisch aus den
                      Suchseiten übernommen.
                    </span>
                  </div>
                  {shopLinks.length > 0 && (
                    <div className="shop-searches">
                      {shopLinks.map((shop) => (
                        <a
                          key={shop.name}
                          href={shop.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <strong>
                            {shop.name}
                            <ExternalLink size={14} />
                          </strong>
                          <small>{shop.note}</small>
                        </a>
                      ))}
                    </div>
                  )}
                  <button
                    className="add-own full"
                    onClick={() => setForm(blankItem(category))}
                  >
                    <Link2 size={16} />
                    Eigenen Produktlink hinzufügen
                  </button>
                  <div className="results-heading">
                    <span>
                      {results.length
                        ? "SUCHERGEBNISSE"
                        : "DEINE NÄCHSTEN LIEBLINGSSTÜCKE"}
                    </span>
                    <span>
                      {results.length ? results.length + " Treffer" : ""}
                    </span>
                  </div>
                  {!results.length ? (
                    <div className="search-empty">
                      <Search size={28} />
                      <p>
                        {searchBusy
                          ? "Möbel werden gesucht …"
                          : "Deine Suche beginnt hier."}
                      </p>
                      <small>
                        Suche nach passenden Möbeln oder füge einen eigenen
                        Produktlink hinzu.
                      </small>
                    </div>
                  ) : (
                    <div className="product-results">
                      {results.map((r, i) => (
                        <article key={i} className="result-card">
                          <div className="result-image">
                            {r.image ? (
                              <img src={r.image} alt={r.name} />
                            ) : (
                              <Armchair size={32} />
                            )}
                          </div>
                          <small>{r.merchant}</small>
                          <h3>{r.name}</h3>
                          <strong>{euro(r.price)}</strong>
                          <button
                            disabled={searchBusy}
                            onClick={() => choose(r)}
                          >
                            {r.token ? "Händlerangebote" : "Auswählen"}
                            <Plus size={15} />
                          </button>
                          <small>
                            Preisstand{" "}
                            {new Date(r.observedAt).toLocaleDateString("de-DE")}
                          </small>
                        </article>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="selected-items">
                  <button
                    className="add-own full"
                    onClick={() => setForm(blankItem(category))}
                  >
                    <Plus size={16} />
                    Möbel hinzufügen
                  </button>
                  {!p.items.length && (
                    <div className="search-empty">
                      <Armchair size={30} />
                      <p>Platz für deine Favoriten.</p>
                      <small>
                        Füge Möbel über die Suche oder einen Produktlink hinzu.
                      </small>
                    </div>
                  )}
                  {p.items.map((i) => (
                    <article className="selected-card" key={i.id}>
                      <div className="selected-top">
                        {i.image ? (
                          <img src={i.image} alt={i.name} />
                        ) : (
                          <div className="image-placeholder">
                            <Armchair />
                          </div>
                        )}
                        <div>
                          <small>
                            {i.category} · {i.merchant}
                          </small>
                          <h3>{i.name}</h3>
                          <strong>{euro(i.price)}</strong>
                          <span className="quantity"> × {i.quantity}</span>
                        </div>
                      </div>
                      <div className="item-actions">
                        <button
                          className="primary small"
                          disabled={!scene}
                          onClick={() => place(i)}
                        >
                          <Plus size={15} />
                          In Raum einfügen
                        </button>
                        <button
                          title="Produkt bearbeiten"
                          onClick={() => setForm(i)}
                        >
                          <Pencil size={15} />
                        </button>
                        {i.image && (
                          <button
                            title="Bild freistellen"
                            onClick={() => setCutout(i)}
                          >
                            <ImageIcon size={15} />
                          </button>
                        )}
                        <button
                          title="Möbel entfernen"
                          onClick={() => removeItem(i.id)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                      {safeUrl(i.url) && (
                        <a
                          className="shop-link"
                          href={safeUrl(i.url)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {new URL(i.url).hostname.includes("google.")
                            ? "Auf Google ansehen"
                            : "Zum Produkt im Shop"}
                          <ExternalLink size={12} />
                        </a>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </aside>
            <section className="budget-pane">
              <div className="budget-title">
                <Wallet size={22} />
                <div>
                  <h2>Dein Budget im Blick</h2>
                  <p>Gute Ideen passen auch ins Budget.</p>
                </div>
                <button
                  onClick={() =>
                    download(
                      new Blob([csv(p)], { type: "text/csv;charset=utf-8" }),
                      "Moebel-Einkaufsliste.csv",
                    )
                  }
                >
                  <Download size={16} />
                  Einkaufsliste
                </button>
              </div>
              <div className="budget-content">
                <div>
                  <Price
                    label="Gesamtbudget für diesen Raum"
                    value={p.totalBudget}
                    onChange={(totalBudget) => change({ ...p, totalBudget })}
                  />
                  <div className={"budget-progress " + (b!.over ? "over" : "")}>
                    <span
                      style={{
                        width:
                          Math.min(
                            100,
                            p.totalBudget
                              ? (b!.total / p.totalBudget) * 100
                              : 0,
                          ) + "%",
                      }}
                    />
                  </div>
                  <div className="budget-numbers">
                    <strong className={b!.over ? "red" : ""}>
                      {euro(b!.total)}
                    </strong>
                    <span>von {euro(p.totalBudget)}</span>
                  </div>
                  <small className="muted">
                    {b!.complete
                      ? "inklusive eingetragener Versandkosten"
                      : "Zwischensumme · Preise oder Versandkosten noch offen"}
                  </small>
                  {b!.over && (
                    <p className="error">
                      Dein Gesamtbudget ist überschritten.
                    </p>
                  )}
                </div>
                <div className="category-budgets">
                  <h4>Budgets je Kategorie</h4>
                  {[
                    ...new Set([...p.items.map((i) => i.category), category]),
                  ].map((c) => (
                    <div key={c} className="category-budget">
                      <span>
                        {c}
                        <small>{euro(b!.categories[c] ?? 0)} ausgewählt</small>
                      </span>
                      <Price
                        label="Max. gesamt"
                        value={p.limits[c]?.cap ?? null}
                        onChange={(cap) =>
                          change({
                            ...p,
                            limits: {
                              ...p.limits,
                              [c]: {
                                ...(p.limits[c] ?? { min: null, max: null }),
                                cap,
                              },
                            },
                          })
                        }
                      />
                      {p.limits[c]?.cap != null &&
                        (b!.categories[c] ?? 0) > p.limits[c].cap! && (
                          <small className="red">Überschritten</small>
                        )}
                    </div>
                  ))}
                </div>
                <div className="shipping">
                  <h4>Versand je Händlerbestellung</h4>
                  {b!.merchants.length ? (
                    b!.merchants.map((m) => (
                      <Price
                        key={m}
                        label={m}
                        value={p.shipping[m] ?? null}
                        onChange={(n) =>
                          change({ ...p, shipping: { ...p.shipping, [m]: n } })
                        }
                      />
                    ))
                  ) : (
                    <p>Wird nach der Möbelauswahl ergänzt.</p>
                  )}
                  <small>
                    0 € eintragen, wenn du abholst oder der Versand kostenlos
                    ist. Den aktuellen Endpreis im Shop prüfen.
                  </small>
                </div>
              </div>
            </section>
          </main>
        </>
      )}
      {form && p && (
        <ProductForm
          initial={form}
          categories={p.categories}
          onClose={() => setForm(null)}
          onSave={saveItem}
        />
      )}
      {cutout && p && (
        <Cutout
          src={cutout.image}
          onClose={() => setCutout(null)}
          onSave={async (blob) => {
            const image = await upload(blob, p.id);
            change({
              ...latest.current!,
              items: latest.current!.items.map((i) =>
                i.id === cutout.id ? { ...i, image } : i,
              ),
            });
          }}
        />
      )}
      {busy && (
        <div className="busy-pill">
          <Loader2 className="spin" size={18} />
          Einen Moment …
        </div>
      )}
      <footer className="app-footer">
        <span>RAUMPLANER STUDIO</span>
        <span>Für Räume mit Persönlichkeit.</span>
        <a
          href="/raumplaner-offline.html"
          download="Raumplaner-Offline.html"
          style={{ display: isOffline ? "none" : "inline" }}
        >
          Offline-Version herunterladen
        </a>
        <span>
          {isOffline
            ? "Lokal gespeichert · regelmäßig sichern"
            : "Manuelle Vorschau · Preise im Shop prüfen"}
        </span>
      </footer>
    </>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
