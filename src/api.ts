export async function api<T = any>(
  path: string,
  data?: unknown,
  method?: string,
): Promise<T> {
  const r = await fetch("/api/" + path, {
    method: method ?? (data === undefined ? "GET" : "POST"),
    headers: data === undefined ? {} : { "content-type": "application/json" },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  const j: any = await r.json();
  if (!r.ok) {
    const e: any = new Error(j.error ?? "Anfrage fehlgeschlagen.");
    e.status = r.status;
    throw e;
  }
  return j;
}
export async function upload(file: Blob, project: string) {
  const r = await fetch("/api/assets?project=" + encodeURIComponent(project), {
    method: "POST",
    headers: { "content-type": file.type },
    body: file,
  });
  const j: any = await r.json();
  if (!r.ok) throw new Error(j.error);
  return j.url as string;
}
export async function normalize(file: File | Blob) {
  if (file.size > 10 * 1024 * 1024)
    throw new Error("Das Bild darf höchstens 10 MB groß sein.");
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type))
    throw new Error("Bitte JPG, PNG oder WebP verwenden.");
  const bitmap = await createImageBitmap(file);
  if (bitmap.width * bitmap.height > 20000000) {
    bitmap.close();
    throw new Error("Das Bild darf höchstens 20 Megapixel haben.");
  }
  const scale = Math.min(1, 2048 / Math.max(bitmap.width, bitmap.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bitmap.width * scale);
  c.height = Math.round(bitmap.height * scale);
  c.getContext("2d")!.drawImage(bitmap, 0, 0, c.width, c.height);
  bitmap.close();
  return {
    blob: await new Promise<Blob>((resolve) =>
      c.toBlob((b) => resolve(b!), "image/png"),
    ),
    width: c.width,
    height: c.height,
  };
}
export function download(data: Blob | string, name: string) {
  const url = typeof data === "string" ? data : URL.createObjectURL(data);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  if (typeof data !== "string")
    setTimeout(() => URL.revokeObjectURL(url), 5000);
}
