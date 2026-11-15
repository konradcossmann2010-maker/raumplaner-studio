import { type Project, budget } from "./model";
export interface ProductIdea {
  id: string;
  name: string;
  category: string;
  styles: string[];
  estimate: number;
  size: string;
  detail: string;
  url: string;
  merchant: string;
}
// Editorial examples, not live offers. Never treat guide prices or example dimensions as confirmed product data.
const entry = (
  id: string,
  name: string,
  category: string,
  styles: string[],
  estimate: number,
  size: string,
  detail: string,
): ProductIdea => ({
  id,
  name,
  category,
  styles,
  estimate,
  size,
  detail,
  merchant: "IKEA",
  url: "https://www.ikea.com/de/de/search/?q=" + encodeURIComponent(name),
});
export const productIdeas: ProductIdea[] = [
  entry(
    "kleppstad",
    "KLEPPSTAD Kleiderschrank mit 2 Türen weiß",
    "Kleiderschrank",
    ["Modern", "Minimalistisch", "Skandinavisch"],
    12900,
    "79 × 176 × 55 cm",
    "Schlichter Schrank für kleine Räume.",
  ),
  entry(
    "brimnes-wardrobe",
    "BRIMNES Kleiderschrank mit 3 Türen weiß",
    "Kleiderschrank",
    ["Modern", "Klassisch", "Minimalistisch"],
    19900,
    "117 × 190 × 50 cm",
    "Mehr Stauraum und eine Spiegeltür.",
  ),
  entry(
    "idanas-wardrobe",
    "IDANÄS Kleiderschrank weiß",
    "Kleiderschrank",
    ["Landhaus", "Klassisch"],
    34900,
    "121 × 211 × 59 cm",
    "Rahmentüren für einen klassischen Eindruck.",
  ),
  entry(
    "malm",
    "MALM Kommode mit 3 Schubladen weiß",
    "Kommode",
    ["Modern", "Minimalistisch", "Skandinavisch"],
    8900,
    "80 × 78 × 48 cm",
    "Geschlossene Aufbewahrung ohne sichtbare Griffe.",
  ),
  entry(
    "hemnes",
    "HEMNES Kommode mit 3 Schubladen weiß gebeizt",
    "Kommode",
    ["Landhaus", "Klassisch"],
    17900,
    "108 × 96 × 50 cm",
    "Traditionelle Form mit sichtbaren Griffen.",
  ),
  entry(
    "rast",
    "RAST Kommode mit 3 Schubladen Kiefer",
    "Kommode",
    ["Boho", "Skandinavisch"],
    5900,
    "62 × 70 × 30 cm",
    "Naturholz lässt sich gut mit Körben kombinieren.",
  ),
  entry(
    "billy",
    "BILLY Bücherregal weiß",
    "Regal",
    ["Modern", "Minimalistisch", "Klassisch"],
    7900,
    "80 × 202 × 28 cm",
    "Schmales Bücherregal mit verstellbaren Böden.",
  ),
  entry(
    "kallax",
    "KALLAX Regal schwarzbraun",
    "Regal",
    ["Industrial", "Schwarz / Eiche", "Modern"],
    7900,
    "77 × 147 × 39 cm",
    "Dunkles Würfelregal für Bücher und Boxen.",
  ),
  entry(
    "ivar",
    "IVAR Regal Kiefer",
    "Regal",
    ["Boho", "Skandinavisch"],
    9900,
    "89 × 179 × 30 cm",
    "Offenes Naturholzregal.",
  ),
  entry(
    "tarva",
    "TARVA Bettgestell Kiefer 140x200",
    "Bett",
    ["Boho", "Skandinavisch"],
    14900,
    "Liegefläche 140 × 200 cm",
    "Naturholz; Lattenrost und Matratze separat prüfen.",
  ),
  entry(
    "malm-bed",
    "MALM Bettgestell weiß 140x200",
    "Bett",
    ["Modern", "Minimalistisch"],
    19900,
    "Liegefläche 140 × 200 cm",
    "Geradliniges Bett; Zubehör und Außenmaße prüfen.",
  ),
  entry(
    "hemnes-night",
    "HEMNES Nachttisch weiß gebeizt",
    "Nachttisch",
    ["Landhaus", "Klassisch", "Skandinavisch"],
    6900,
    "46 × 70 × 35 cm",
    "Schublade und offene Ablage.",
  ),
  entry(
    "lack-night",
    "LACK Beistelltisch schwarzbraun",
    "Nachttisch",
    ["Modern", "Minimalistisch", "Schwarz / Eiche"],
    1500,
    "55 × 45 × 55 cm",
    "Einfache Alternative zum Nachttisch ohne Schublade.",
  ),
  entry(
    "micke",
    "MICKE Schreibtisch weiß",
    "Schreibtisch",
    ["Modern", "Minimalistisch", "Skandinavisch"],
    7900,
    "105 × 75 × 50 cm",
    "Kompakter Arbeitsplatz mit Kabeldurchlass.",
  ),
  entry(
    "fjallbo-desk",
    "FJÄLLBO Laptoptisch schwarz",
    "Schreibtisch",
    ["Industrial", "Schwarz / Eiche"],
    9900,
    "100 × 75 × 36 cm",
    "Metallrahmen und Holzplatte; wenig Tiefe.",
  ),
  entry(
    "stefan",
    "STEFAN Stuhl Kiefer",
    "Stuhl",
    ["Boho", "Skandinavisch", "Landhaus"],
    3500,
    "Sitzhöhe etwa 45 cm",
    "Schlichter Holzstuhl.",
  ),
  entry(
    "adde",
    "ADDE Stuhl schwarz",
    "Stuhl",
    ["Modern", "Minimalistisch", "Industrial", "Schwarz / Eiche"],
    1500,
    "Sitzhöhe etwa 45 cm",
    "Leichter Stuhl mit Metallgestell.",
  ),
  entry(
    "klippan",
    "KLIPPAN 2er-Sofa",
    "Sofa",
    ["Modern", "Minimalistisch"],
    29900,
    "180 × 66 × 88 cm",
    "Kompaktes Sofa; Bezug und Variante beachten.",
  ),
  entry(
    "ektorp",
    "EKTORP 2er-Sofa",
    "Sofa",
    ["Landhaus", "Klassisch", "Skandinavisch"],
    39900,
    "179 × 88 × 88 cm",
    "Weiche, traditionelle Form.",
  ),
  entry(
    "lack-table",
    "LACK Couchtisch schwarzbraun",
    "Couchtisch",
    ["Modern", "Minimalistisch", "Schwarz / Eiche"],
    3000,
    "90 × 45 × 55 cm",
    "Einfacher Couchtisch mit Ablage.",
  ),
  entry(
    "fjallbo-table",
    "FJÄLLBO Couchtisch schwarz",
    "Couchtisch",
    ["Industrial", "Schwarz / Eiche"],
    7900,
    "90 × 46 × 46 cm",
    "Dunkler Metallrahmen und Holzoberfläche.",
  ),
  entry(
    "fjallbo-tv",
    "FJÄLLBO TV-Bank schwarz",
    "TV-Schrank",
    ["Industrial", "Schwarz / Eiche"],
    14900,
    "150 × 54 × 36 cm",
    "Offene Metalloptik für Mediengeräte.",
  ),
  entry(
    "besta",
    "BESTÅ TV-Bank weiß",
    "TV-Schrank",
    ["Modern", "Minimalistisch", "Skandinavisch"],
    9900,
    "120 × 38 × 40 cm",
    "Modulares System; Türen und Zubehör variieren.",
  ),
  entry(
    "havsta",
    "HAVSTA Sideboard weiß",
    "Sideboard",
    ["Landhaus", "Klassisch"],
    29900,
    "121 × 89 × 47 cm",
    "Klassische Aufbewahrung mit Rahmentüren.",
  ),
  entry(
    "besta-side",
    "BESTÅ Aufbewahrung mit Türen schwarzbraun",
    "Sideboard",
    ["Modern", "Minimalistisch", "Schwarz / Eiche"],
    19900,
    "120 × 74 × 42 cm",
    "Schlichte Fronten; Konfiguration im Shop auswählen.",
  ),
];
export function recommendProducts(p: Project) {
  const preferences = p.furnishing ?? { style: "", wanted: [] },
    spent = budget(p),
    remaining =
      p.totalBudget === null
        ? Infinity
        : Math.max(0, p.totalBudget - spent.total);
  return preferences.wanted.map((category) => {
    const limits = p.limits[category],
      categorySpent = spent.categories[category] ?? 0;
    const cap = Math.min(
      remaining,
      limits?.max ?? Infinity,
      limits?.cap == null ? Infinity : Math.max(0, limits.cap - categorySpent),
    );
    const matches = productIdeas.filter(
      (i) =>
        i.category === category &&
        (!preferences.style || i.styles.includes(preferences.style)) &&
        i.estimate >= (limits?.min ?? 0) &&
        i.estimate <= cap,
    );
    return { category, products: matches.slice(0, 3) };
  });
}
