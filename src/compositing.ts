/** Conservative edge-connected background removal. Never removes enclosed white details. */
export function removeBackground(
  input: Uint8ClampedArray,
  width: number,
  height: number,
  tolerance = 34,
) {
  const unchanged = () => ({
    pixels: input,
    changed: false,
    bounds: { x: 0, y: 0, width, height },
  });
  const corners = [
    0,
    width - 1,
    (height - 1) * width,
    width * height - 1,
  ].filter((k) => input[k * 4 + 3] > 240);
  let reference = -1,
    count = 0;
  const distance = (a: number, b: number) =>
    Math.max(
      ...[0, 1, 2].map((c) => Math.abs(input[a * 4 + c] - input[b * 4 + c])),
    );
  for (const corner of corners) {
    const matches = corners.filter(
      (c) => distance(c, corner) <= tolerance,
    ).length;
    if (matches > count) {
      reference = corner;
      count = matches;
    }
  }
  if (reference < 0 || count < 3) return unchanged();
  const visited = new Uint8Array(width * height),
    queue = new Int32Array(width * height);
  let head = 0,
    tail = 0;
  function add(k: number) {
    if (k < 0 || k >= visited.length || visited[k]) return;
    visited[k] = 1;
    if (input[k * 4 + 3] < 8 || distance(k, reference) <= tolerance)
      queue[tail++] = k;
  }
  for (let x = 0; x < width; x++) {
    add(x);
    add((height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    add(y * width);
    add(y * width + width - 1);
  }
  const pixels = new Uint8ClampedArray(input);
  while (head < tail) {
    const k = queue[head++];
    pixels[k * 4 + 3] = 0;
    const x = k % width;
    if (x > 0) add(k - 1);
    if (x < width - 1) add(k + 1);
    add(k - width);
    add(k + width);
  }
  let minX = width,
    minY = height,
    maxX = -1,
    maxY = -1;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      if (pixels[(y * width + x) * 4 + 3] > 8) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
  if (maxX < minX || tail < width * height * 0.02) return unchanged();
  return {
    pixels,
    changed: true,
    bounds: {
      x: minX,
      y: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
    },
  };
}
export function furnitureSize(
  scene: { width: number; height: number },
  imageWidth: number,
  imageHeight: number,
  preferredHeight = 0.55,
  maxWidth = 0.5,
) {
  let height = preferredHeight,
    width = (height * scene.height * imageWidth) / imageHeight / scene.width;
  if (width > maxWidth) {
    height *= maxWidth / width;
    width = maxWidth;
  }
  const scale = Math.max(1, 0.005 / width, 0.005 / height);
  width = Math.max(0.005, width * scale);
  height = Math.max(0.005, height * scale);
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width > 5 ||
    height > 5
  )
    throw new Error(
      "Das Möbelbild ist zu schmal oder zu breit. Bitte das Produktbild passend zuschneiden.",
    );
  return { width, height };
}
export function placement(
  scene: { width: number; height: number },
  imageWidth: number,
  imageHeight: number,
  index = 0,
) {
  const { width, height } = furnitureSize(scene, imageWidth, imageHeight);
  const center = [0.5, 0.25, 0.75, 0.4, 0.6][index % 5];
  return {
    x: Math.max(0.02, Math.min(0.98 - width, center - width / 2)),
    y: 0.86 - height,
    width,
    height,
    rotation: 0,
    flip: false,
    shadow: 0.27,
    skew: 0,
    brightness: 0,
  };
}
export async function prepareFurniture(blob: Blob, automatic = true) {
  const image = await createImageBitmap(blob),
    c = document.createElement("canvas");
  if (image.width * image.height > 20000000) {
    image.close();
    throw new Error("Das Möbelbild darf höchstens 20 Megapixel haben.");
  }
  const scale = Math.min(1, 2048 / Math.max(image.width, image.height));
  c.width = Math.max(1, Math.round(image.width * scale));
  c.height = Math.max(1, Math.round(image.height * scale));
  const ctx = c.getContext("2d")!;
  ctx.drawImage(image, 0, 0, c.width, c.height);
  image.close();
  let width = c.width,
    height = c.height,
    changed = false;
  if (automatic) {
    const data = ctx.getImageData(0, 0, width, height),
      r = removeBackground(data.data, width, height);
    if (r.changed) {
      data.data.set(r.pixels);
      ctx.putImageData(data, 0, 0);
      const cropped = document.createElement("canvas");
      cropped.width = r.bounds.width;
      cropped.height = r.bounds.height;
      cropped
        .getContext("2d")!
        .drawImage(
          c,
          r.bounds.x,
          r.bounds.y,
          r.bounds.width,
          r.bounds.height,
          0,
          0,
          cropped.width,
          cropped.height,
        );
      width = cropped.width;
      height = cropped.height;
      changed = true;
      return {
        blob: await new Promise<Blob>((resolve) =>
          cropped.toBlob((b) => resolve(b!), "image/png"),
        ),
        width,
        height,
        changed,
      };
    }
  }
  return { blob, width, height, changed };
}
