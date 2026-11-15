export interface EdgeCandidate {
  start: { x: number; y: number };
  end: { x: number; y: number };
  strength: number;
}
/** Finds long diagonal visual edges only. A candidate is not a semantic roof detection or metric measurement. */
export function findDiagonalCandidates(
  p: Uint8ClampedArray,
  w: number,
  h: number,
): EdgeCandidate[] {
  const gray = new Float32Array(w * h);
  for (let k = 0; k < gray.length; k++)
    gray[k] = 0.299 * p[k * 4] + 0.587 * p[k * 4 + 1] + 0.114 * p[k * 4 + 2];
  const edges: { x: number; y: number }[] = [];
  for (let y = 1; y < h - 1; y++)
    for (let x = 1; x < w - 1; x++) {
      const k = y * w + x,
        gx =
          -gray[k - w - 1] +
          gray[k - w + 1] -
          2 * gray[k - 1] +
          2 * gray[k + 1] -
          gray[k + w - 1] +
          gray[k + w + 1],
        gy =
          -gray[k - w - 1] -
          2 * gray[k - w] -
          gray[k - w + 1] +
          gray[k + w - 1] +
          2 * gray[k + w] +
          gray[k + w + 1];
      if (Math.hypot(gx, gy) > 180) edges.push({ x, y });
    }
  const stride = Math.max(1, Math.ceil(edges.length / 10000)),
    points = edges.filter((_, i) => i % stride === 0),
    diag = Math.ceil(Math.hypot(w, h)),
    bins = diag + 1;
  const angles: number[] = [];
  for (let a = 18; a <= 72; a += 3) angles.push(a);
  for (let a = 108; a <= 162; a += 3) angles.push(a);
  const peaks: { angle: number; rho: number; votes: number }[] = [];
  for (const angle of angles) {
    const a = (angle * Math.PI) / 180,
      nx = -Math.sin(a),
      ny = Math.cos(a),
      votes = new Uint16Array(bins);
    for (const p of points) {
      const bin = Math.round((p.x * nx + p.y * ny + diag) / 2);
      if (bin >= 0 && bin < bins) votes[bin]++;
    }
    for (let b = 0; b < bins; b++)
      if (votes[b] >= Math.max(8, (Math.min(w, h) * 0.1) / stride))
        peaks.push({ angle, rho: b * 2 - diag, votes: votes[b] });
  }
  peaks.sort((a, b) => b.votes - a.votes);
  const chosen: typeof peaks = [];
  const result: EdgeCandidate[] = [];
  for (const peak of peaks) {
    if (
      chosen.some(
        (p) =>
          Math.abs(p.angle - peak.angle) < 9 && Math.abs(p.rho - peak.rho) < 10,
      )
    )
      continue;
    const a = (peak.angle * Math.PI) / 180,
      dx = Math.cos(a),
      dy = Math.sin(a),
      nx = -dy,
      ny = dx;
    const line = points.filter(
      (p) => Math.abs(p.x * nx + p.y * ny - peak.rho) <= 2.5,
    );
    if (line.length < 8) continue;
    const t = line.map((p) => p.x * dx + p.y * dy),
      min = Math.min(...t),
      max = Math.max(...t);
    if (max - min < Math.min(w, h) * 0.3) continue;
    const clamp = (n: number) => Math.max(0, Math.min(1, n));
    result.push({
      start: {
        x: clamp((peak.rho * nx + min * dx) / w),
        y: clamp((peak.rho * ny + min * dy) / h),
      },
      end: {
        x: clamp((peak.rho * nx + max * dx) / w),
        y: clamp((peak.rho * ny + max * dy) / h),
      },
      strength: peak.votes,
    });
    chosen.push(peak);
    if (result.length === 4) break;
  }
  return result;
}
export async function roofCandidates(imageURL: string) {
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () =>
      reject(new Error("Das Raumfoto konnte nicht geladen werden."));
    img.src = imageURL;
  });
  const c = document.createElement("canvas"),
    scale = Math.min(1, 480 / Math.max(img.width, img.height));
  c.width = Math.round(img.width * scale);
  c.height = Math.round(img.height * scale);
  const x = c.getContext("2d")!;
  x.drawImage(img, 0, 0, c.width, c.height);
  return findDiagonalCandidates(
    x.getImageData(0, 0, c.width, c.height).data,
    c.width,
    c.height,
  );
}
