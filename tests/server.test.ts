import { it, expect } from "vitest";
import { publicUrl, extractProduct } from "../server/products";
it("rejects private addresses and credentials", () => {
  for (const u of [
    "http://127.0.0.1",
    "http://169.254.169.254/",
    "http://[::1]",
    "http://10.0.0.1",
    "https://u:p@example.com",
    "http://localhost",
    "http://2130706433",
  ])
    expect(() => publicUrl(u)).toThrow();
});
it("reads a concrete offer instead of a price range", () => {
  const p = extractProduct(
    '<script type="application/ld+json">{"@type":"Product","name":"Logan","image":"/x.png","offers":{"@type":"Offer","price":"199.99","priceCurrency":"EUR"}}</script>',
    "https://shop.de/p",
  );
  expect(p.price).toBe(19999);
  expect(p.image).toBe("https://shop.de/x.png");
});
it("does not fabricate prices from missing or foreign currency offers", () =>
  expect(
    extractProduct(
      '<script type="application/ld+json">{"@type":"Product","name":"X","offers":{"price":22,"priceCurrency":"USD"}}</script>',
      "https://shop.de",
    ).price,
  ).toBeNull());
it("keeps missing product images empty", () =>
  expect(
    extractProduct("<title>Schrank</title>", "https://shop.de/p").image,
  ).toBe(""));
it("keeps blank offer prices unknown", () => {
  for (const price of ["", "   "])
    expect(
      extractProduct(
        '<script type="application/ld+json">' +
          JSON.stringify({
            "@type": "Product",
            name: "X",
            offers: { price, priceCurrency: "EUR" },
          }) +
          "</script>",
        "https://shop.de",
      ).price,
    ).toBeNull();
});
