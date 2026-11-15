/** Public search pages, not a paid shopping service. Each link opens only on user action. */
export function shopSearches(
  query: string,
  min: number | null,
  max: number | null,
) {
  if (min !== null && max !== null && min > max)
    throw new Error("Mindestpreis über Höchstpreis.");
  const q = query.trim();
  if (!q) throw new Error("Bitte Suchbegriff eingeben.");
  const google = new URL("https://www.google.com/search");
  google.searchParams.set("tbm", "shop");
  google.searchParams.set("q", q);
  if (min !== null || max !== null)
    google.searchParams.set(
      "tbs",
      "mr:1,price:1" +
        (min !== null ? ",ppr_min:" + min / 100 : "") +
        (max !== null ? ",ppr_max:" + max / 100 : ""),
    );
  const amazon = new URL("https://www.amazon.de/s");
  amazon.searchParams.set("k", q);
  if (min !== null || max !== null)
    amazon.searchParams.set("rh", "p_36:" + (min ?? 0) + "-" + (max ?? ""));
  return [
    {
      name: "Google Shopping",
      url: google.href,
      note: "Shopübergreifend suchen, mit Preisbereich",
    },
    {
      name: "IKEA",
      url: "https://www.ikea.com/de/de/search/?q=" + encodeURIComponent(q),
      note: "Preisfilter bei Bedarf im Shop setzen",
    },
    {
      name: "OTTO",
      url: "https://www.otto.de/suche/" + encodeURIComponent(q) + "/",
      note: "Preisfilter bei Bedarf im Shop setzen",
    },
    {
      name: "Amazon",
      url: amazon.href,
      note: "Mit Suchbegriff und Preisbereich",
    },
  ];
}
