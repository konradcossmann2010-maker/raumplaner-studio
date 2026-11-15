import React from "react";
import { furnitureArt } from "./furniture-art";
import { type Project, type Item, euro, uid } from "./model";
import { recommendProducts } from "./recommendations";
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
  onRecommend,
}: {
  project: Project;
  onChange: (p: Project) => void;
  onSearch: (category: string) => void;
  onRecommend: (item: Item) => void;
}) {
  const preferences = project.furnishing ?? { style: "", wanted: [] };
  return (
    <section className="furnishing" aria-label="Einrichtung auswählen">
      <div>
        <h2>Welche Einrichtung möchtest du?</h2>
        <p>
          Wähle deinen Stil und die Möbelarten. Darunter erscheinen konkrete
          Modellvorschläge, die du prüfen und in deine Planung übernehmen
          kannst.
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
      {!!preferences.wanted.length && (
        <div className="product-recommendations">
          <h3>Konkrete Möbelvorschläge</h3>
          <p>
            Lokaler Beispielkatalog: Stilzuordnung redaktionell, Preise sind
            Richtwerte ohne Versand. Die Filter vergleichen Richtwerte mit
            deinen Preisgrenzen und dem bekannten Restbudget. Preise, Varianten
            und Verfügbarkeit bitte im Shop prüfen. Vorschläge bilden gemeinsam
            noch kein budgetgeprüftes Möbelset.
          </p>
          {recommendProducts(project).map((group) => (
            <section
              key={group.category}
              aria-label={"Vorschläge für " + group.category}
            >
              <h4>{group.category}</h4>
              {!group.products.length ? (
                <p>
                  Kein hinterlegtes Modell für diesen Stil innerhalb deiner
                  Preisgrenzen.{" "}
                  <button onClick={() => onSearch(group.category)}>
                    Weitere {group.category} suchen
                  </button>
                </p>
              ) : (
                <div className="recommendation-grid">
                  {group.products.map((product) => (
                    <article className="recommendation-card" key={product.id}>
                      <small>
                        {product.merchant} · {product.category}
                      </small>
                      <img
                        className="furniture-art"
                        src={
                          furnitureArt(product.category, preferences.style)
                            .image
                        }
                        alt={
                          product.category +
                          " · schematische Zeichnung, kein Produktfoto"
                        }
                      />
                      <h4>{product.name}</h4>
                      <strong>Richtpreis ca. {euro(product.estimate)}</strong>
                      <p>{product.detail}</p>
                      <small>
                        Beispielvariante: {product.size}. Maße im Shop
                        bestätigen.
                      </small>
                      <a
                        href={product.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Genaues Modell im Shop finden ↗
                      </a>
                      <button
                        onClick={() =>
                          onRecommend({
                            id: uid(),
                            name: product.name,
                            category: product.category,
                            merchant: product.merchant,
                            url: product.url,
                            image: "",
                            price: null,
                            quantity: 1,
                            observedAt: "",
                          })
                        }
                      >
                        Vorschlag prüfen und übernehmen
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </section>
  );
}
