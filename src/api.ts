import { isOffline, offlineRequest, offlineImage } from "./offline";
/** fetch mit verständlicher Meldung, wenn der Server gar nicht erreichbar ist. */
async function request(input: string, init: RequestInit) {
  try {
    return await fetch(input, init);
  } catch {
    throw new Error(
      "Keine Verbindung zum Server. Bitte Internetverbindung prüfen.",
    );
  }
}
/**
 * Liest eine JSON-Antwort. Antwortet ein Proxy oder Hoster mit einer
 * HTML-Fehlerseite (z. B. 502), gibt es statt „Unexpected token <“ eine
 * deutsche Meldung mit Statuscode.
 */
async function readJson(r: Response): Promise<any> {
  let j: any = null;
  try {
    j = await r.json();
  } catch {}
  if (!r.ok || j === null) {
    const e: any = new Error(
      j?.error ?? `Anfrage fehlgeschlagen (Status ${r.status}).`,
    );
    e.status = r.status;
    throw e;
  }
  return j;
}
export async function api<T = any>(
  path: string,
  data?: unknown,
  method?: string,
): Promise<T> {
  if (isOffline) return (await offlineRequest(path, data, method)) as T;
  const r = await request("/api/" + path, {
    method: method ?? (data === undefined ? "GET" : "POST"),
    headers: data === undefined ? {} : { "content-type": "application/json" },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  return readJson(r);
}
export async function upload(file: Blob, project: string) {
  if (isOffline) return offlineImage(file);
  const r = await request(
    "/api/assets?project=" + encodeURIComponent(project),
    {
      method: "POST",
      headers: { "content-type": file.type },
      body: file,
    },
  );
  return (await readJson(r)).url as string;
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
  // Fotos (JPEG) bleiben JPEG: Als PNG wäre ein 2048-px-Raumfoto oft 5–8 MB
  // statt unter 1 MB – das bremst Upload, Speicher und Offline-Sicherungen.
  // PNG/WebP können Transparenz enthalten (freigestellte Möbel) und bleiben PNG.
  const type = file.type === "image/jpeg" ? "image/jpeg" : "image/png";
  return {
    blob: await new Promise<Blob>((resolve, reject) =>
      c.toBlob(
        (b) =>
          b
            ? resolve(b)
            : reject(new Error("Bild konnte nicht verarbeitet werden.")),
        type,
        type === "image/jpeg" ? 0.9 : undefined,
      ),
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
