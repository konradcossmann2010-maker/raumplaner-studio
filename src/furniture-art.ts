// Local, schematic artwork. No inferred product dimensions or remote images.
export function furnitureArt(category: string, style = "") {
  const wood = style === "Industrial" || style === "Schwarz / Eiche",
    c = wood
      ? "#a98457"
      : style === "Boho" || style === "Skandinavisch"
        ? "#d7ba89"
        : style === "Klassisch" || style === "Landhaus"
          ? "#eee9dc"
          : "#b6c4bc",
    dark = wood ? "#303733" : "#6d786d";
  const rect = (x: number, y: number, w: number, h: number, fill = c) =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${fill}" stroke="${dark}" stroke-width="2"/>`;
  let w = 200,
    h = 200,
    b = "";
  if (category === "Bett") {
    w = 240;
    h = 150;
    b =
      rect(10, 5, 220, 100) +
      rect(6, 65, 228, 65, "#f7f4eb") +
      rect(20, 48, 85, 30, "#fff") +
      rect(135, 48, 85, 30, "#fff") +
      rect(6, 95, 228, 36) +
      rect(12, 131, 10, 18, dark) +
      rect(218, 131, 10, 18, dark);
  } else if (category === "Sofa" || category === "Sessel") {
    w = 240;
    h = 140;
    b =
      rect(15, 8, 210, 86) +
      rect(15, 77, 210, 45) +
      rect(28, 63, 88, 30) +
      rect(124, 63, 88, 30) +
      rect(2, 45, 28, 80, dark) +
      rect(210, 45, 28, 80, dark) +
      rect(20, 125, 8, 14, dark) +
      rect(212, 125, 8, 14, dark);
  } else if (category === "Stuhl") {
    w = 110;
    h = 190;
    b =
      rect(15, 2, 80, 70) +
      rect(8, 82, 94, 18) +
      rect(15, 100, 9, 88, dark) +
      rect(86, 100, 9, 88, dark) +
      rect(20, 70, 6, 12, dark) +
      rect(84, 70, 6, 12, dark);
  } else if (["Tisch", "Schreibtisch", "Couchtisch"].includes(category)) {
    w = 240;
    h = category === "Couchtisch" ? 110 : 160;
    b =
      rect(2, 2, 236, 16) +
      rect(15, 18, 12, h - 20, dark) +
      rect(213, 18, 12, h - 20, dark);
    if (category === "Schreibtisch")
      b += rect(153, 20, 56, 52) + rect(174, 39, 15, 4, dark);
  } else if (category === "Regal") {
    w = 150;
    h = 230;
    b = rect(2, 2, 10, 226) + rect(138, 2, 10, 226);
    for (let y = 2; y < 230; y += 55) b += rect(4, y, 142, 8);
    for (let j = 0; j < 3; j++)
      b += rect(
        23 + j * 17,
        23 + j * 4,
        12,
        34 - j * 4,
        ["#547a80", "#a86e55", "#d6c49a"][j],
      );
    b += rect(81, 80, 45, 28, "#e7dfce") + rect(24, 183, 66, 35, "#879a89");
  } else if (
    ["Kommode", "Sideboard", "TV-Schrank", "Nachttisch"].includes(category)
  ) {
    w = 220;
    h = category === "TV-Schrank" ? 100 : 150;
    b =
      rect(2, 2, 216, h - 16) +
      rect(12, h - 14, 10, 12, dark) +
      rect(198, h - 14, 10, 12, dark);
    for (let y = 12; y < h - 20; y += Math.floor((h - 26) / 3))
      b +=
        rect(10, y, 200, Math.floor((h - 26) / 3) - 5) +
        rect(102, y + 10, 16, 4, dark);
  } else {
    w = 150;
    h = 230;
    b =
      rect(2, 2, 146, 226) +
      rect(8, 8, 65, 210, category === "Vitrine" ? "#bcd1cf" : c) +
      rect(77, 8, 65, 210, category === "Vitrine" ? "#bcd1cf" : c) +
      rect(63, 95, 4, 26, dark) +
      rect(83, 95, 4, 26, dark);
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w * 3}" height="${h * 3}" viewBox="0 0 ${w} ${h}">${b}</svg>`;
  return {
    image: "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg),
    width: w,
    height: h,
  };
}
export function furnitureImage(
  item: { image?: string; category?: string },
  style = "",
) {
  return item.image || furnitureArt(item.category ?? "", style).image;
}
