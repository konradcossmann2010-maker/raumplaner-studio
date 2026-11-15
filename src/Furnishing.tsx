import React from "react";
import { type Project } from "./model";
const styles = [
  "Modern",
  "Skandinavisch",
  "Industrial",
  "Minimalistisch",
  "Landhaus",
  "Boho",
  "Klassisch",
  "Schwarz / Eiche",
];
const types = [
  "Kleiderschrank",
  "Kommode",
  "Regal",
  "Bett",
  "Nachttisch",
  "Schreibtisch",
  "Stuhl",
  "Sofa",
  "Couchtisch",
  "TV-Schrank",
  "Sideboard",
];
export default function Furnishing({
  project,
  onChange,
  onSearch,
}: {
  project: Project;
  onChange: (p: Project) => void;
  onSearch: (category: string) => void;
}) {
  const preferences = project.furnishing ?? { style: "", wanted: [] };
  return (
    <section className="furnishing" aria-label="Einrichtung auswählen">
      <div>
        <h2>Welche Einrichtung möchtest du?</h2>
        <p>
          Wähle zuerst deinen Stil und die Möbelarten. Anschließend suchst du
          passende Produkte und bewegst deine Auswahl im 3D-Raum.
        </p>
      </div>
      <label>
        Möbelstil
        <select
          aria-label="Möbelstil"
          value={preferences.style}
          onChange={(e) =>
            onChange({
              ...project,
              furnishing: { ...preferences, style: e.target.value },
            })
          }
        >
          <option value="">Alle Stile / noch offen</option>
          {styles.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </label>
      <fieldset>
        <legend>Gewünschte Möbelarten</legend>
        <div className="furnishing-types">
          {[
            ...new Set([
              ...types,
              ...project.categories,
              ...preferences.wanted,
            ]),
          ].map((t) => (
            <label key={t}>
              <input
                type="checkbox"
                checked={preferences.wanted.includes(t)}
                onChange={(e) =>
                  onChange({
                    ...project,
                    furnishing: {
                      ...preferences,
                      wanted: e.target.checked
                        ? [...preferences.wanted, t]
                        : preferences.wanted.filter((x) => x !== t),
                    },
                  })
                }
              />
              {t}
            </label>
          ))}
        </div>
      </fieldset>
      {!!preferences.wanted.length && (
        <div className="furnishing-links">
          {preferences.wanted.map((t) => (
            <button key={t} onClick={() => onSearch(t)}>
              {t} suchen →
            </button>
          ))}
        </div>
      )}
      <small>
        Der Stil ergänzt deine Produktsuche. Bereits gewählte Produkte und deren
        Aussehen bleiben erhalten.
      </small>
    </section>
  );
}
