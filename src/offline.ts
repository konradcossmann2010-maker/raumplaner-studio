import { newProject, uid, projectSchema } from "./model";
export const isOffline =
  typeof location !== "undefined" &&
  (location.protocol === "file:" ||
    new URLSearchParams(location.search).has("offline"));
let db: Promise<IDBDatabase> | undefined;
function database() {
  return (db ??= new Promise((resolve, reject) => {
    const r = indexedDB.open("raumplaner-offline", 1);
    r.onupgradeneeded = () =>
      r.result.createObjectStore("projects", { keyPath: "id" });
    r.onerror = () =>
      reject(
        new Error(
          "Lokaler Speicher nicht verfügbar. Bitte normalen Browsermodus verwenden.",
        ),
      );
    r.onsuccess = () => resolve(r.result);
  }));
}
async function transaction<T>(
  mode: IDBTransactionMode,
  operation: (s: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const d = await database();
  return new Promise((resolve, reject) => {
    const t = d.transaction("projects", mode);
    const r = operation(t.objectStore("projects"));
    t.oncomplete = () => resolve(r.result);
    t.onerror = () =>
      reject(
        new Error(
          "Speichern fehlgeschlagen. Eventuell ist der Gerätespeicher voll.",
        ),
      );
    t.onabort = () => reject(new Error("Lokales Speichern abgebrochen."));
  });
}
export async function offlineRequest(
  path: string,
  data?: any,
  method?: string,
) {
  const verb = method ?? (data === undefined ? "GET" : "POST");
  if (path === "projects") {
    if (verb === "GET") {
      const rows: any[] = await transaction("readonly", (s) => s.getAll());
      return rows
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
        .map(({ id, name, revision, updated_at }) => ({
          id,
          name,
          revision,
          updated_at,
        }));
    }
    const p = newProject();
    const row = {
      id: p.id,
      name: p.name,
      revision: 1,
      updated_at: new Date().toISOString(),
      project: p,
    };
    await transaction("readwrite", (s) => s.add(row));
    return { project: p, revision: 1 };
  }
  if (path.startsWith("projects/")) {
    const id = path.slice(9);
    if (verb === "DELETE") {
      await transaction("readwrite", (s) => s.delete(id));
      return { ok: true };
    }
    if (verb === "PUT") {
      const d = await database();
      return new Promise((resolve, reject) => {
        const t = d.transaction("projects", "readwrite"),
          s = t.objectStore("projects");
        const r = s.get(id);
        let result: any, problem: any;
        r.onsuccess = () => {
          const row = r.result;
          if (!row) {
            problem = new Error("Raum nicht gefunden.");
            t.abort();
            return;
          }
          if (row.revision !== data.revision) {
            problem = Object.assign(
              new Error("Dieser Raum wurde in einem anderen Fenster geändert."),
              { status: 409 },
            );
            t.abort();
            return;
          }
          try {
            const p = projectSchema.parse(data.project);
            if (p.id !== id) throw new Error("Raum-ID ungültig.");
            const revision = row.revision + 1;
            s.put({
              id,
              name: p.name,
              revision,
              project: p,
              updated_at: new Date().toISOString(),
            });
            result = { revision };
          } catch (e) {
            problem = e;
            t.abort();
          }
        };
        t.oncomplete = () => resolve(result);
        t.onabort = () =>
          reject(problem ?? new Error("Speichern fehlgeschlagen."));
        t.onerror = () =>
          reject(problem ?? new Error("Gerätespeicher nicht verfügbar."));
      });
    }
    const row: any = await transaction("readonly", (s) => s.get(id));
    if (!row) throw new Error("Raum nicht gefunden.");
    return { project: row.project, revision: row.revision };
  }
  if (path === "import")
    throw new Error(
      "Offline bitte Name, Preis und Händler selbst eintragen und das Produktbild hochladen. Dein Kauflink bleibt gespeichert.",
    );
  if (path === "image-import")
    throw new Error("Offline bitte das Produktbild vom Gerät hochladen.");
  throw new Error("Diese Funktion ist offline nicht verfügbar.");
}
export async function offlineImage(file: Blob) {
  return new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("Bild konnte nicht gelesen werden."));
    r.readAsDataURL(file);
  });
}
