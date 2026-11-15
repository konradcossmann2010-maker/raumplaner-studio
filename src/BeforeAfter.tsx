import React, { useState } from "react";
import { download } from "./api";
export default function BeforeAfter({
  before,
  after,
  onClose,
}: {
  before: string;
  after: string;
  onClose: () => void;
}) {
  const [split, setSplit] = useState(50),
    [side, setSide] = useState(false),
    [error, setError] = useState("");
  async function save() {
    try {
      const load = (src: string) =>
        new Promise<HTMLImageElement>((resolve, reject) => {
          const i = new Image();
          i.onload = () => resolve(i);
          i.onerror = reject;
          i.src = src;
        });
      const [a, b] = await Promise.all([load(before), load(after)]);
      const c = document.createElement("canvas");
      c.width = b.naturalWidth * (side ? 2 : 1);
      c.height = b.naturalHeight;
      const x = c.getContext("2d")!;
      if (side) {
        x.drawImage(a, 0, 0, b.naturalWidth, c.height);
        x.drawImage(b, b.naturalWidth, 0, b.naturalWidth, c.height);
      } else {
        x.drawImage(b, 0, 0);
        x.save();
        x.beginPath();
        x.rect(0, 0, (c.width * split) / 100, c.height);
        x.clip();
        x.drawImage(a, 0, 0, c.width, c.height);
        x.restore();
        x.fillStyle = "white";
        x.fillRect((c.width * split) / 100 - 1, 0, 2, c.height);
      }
      download(c.toDataURL("image/png"), "Vorher-Nachher.png");
      setError("");
    } catch {
      setError(
        "Vergleich konnte nicht gespeichert werden. Bitte Bilder erneut laden.",
      );
    }
  }
  return (
    <section className="before-after" aria-label="Vorher-Nachher-Vergleich">
      <div className="view-tabs">
        <button aria-pressed={!side} onClick={() => setSide(false)}>
          Schieberegler
        </button>
        <button aria-pressed={side} onClick={() => setSide(true)}>
          Nebeneinander
        </button>
        <button onClick={onClose}>Zurück zur Bearbeitung</button>
        <button onClick={save}>Vergleich als Bild speichern</button>
      </div>
      <p>
        Vorher: dein unverändertes Raumfoto. Nachher: dein Foto mit den aktuell
        eingefügten Möbeln. Vorhandene Möbel im Foto werden dabei nicht
        entfernt.
      </p>
      {side ? (
        <div className="comparison-side">
          <figure>
            <img src={before} alt="Vorher: Originalfoto" />
            <figcaption>Vorher</figcaption>
          </figure>
          <figure>
            <img src={after} alt="Nachher: geplante Einrichtung" />
            <figcaption>Nachher</figcaption>
          </figure>
        </div>
      ) : (
        <>
          <div className="comparison-slider">
            <img src={after} alt="Nachher: geplante Einrichtung" />
            <img
              className="comparison-before"
              src={before}
              alt="Vorher: Originalfoto"
              style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}
            />
            <div className="comparison-divider" style={{ left: split + "%" }} />
            <span className="comparison-label before">Vorher</span>
            <span className="comparison-label after">Nachher</span>
          </div>
          <label>
            Vorher-Anteil{" "}
            <input
              aria-label="Vorher-Nachher-Schieberegler"
              type="range"
              min="0"
              max="100"
              value={split}
              onChange={(e) => setSplit(+e.target.value)}
            />
          </label>
        </>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
