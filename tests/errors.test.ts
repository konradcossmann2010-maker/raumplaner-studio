import { describe, it, expect } from "vitest";
import { api, type Env } from "../server/index";
import { publicUrl } from "../server/products";
import { HttpError } from "../server/http-error";
import {
  moneyValue,
  newProject,
  projectSchema,
  readableError,
} from "../src/model";

const headers = { "oai-authenticated-user-id": "u1" };
const base = "https://example.org/api/";

/** Kleine D1/R2-Attrappe: Projekte und Bilder liegen in Maps. */
function fakeEnv(opts: {
  project?: { id: string; revision: number; data: string };
  assets?: string[];
  broken?: boolean;
}) {
  const deleted: string[][] = [];
  const env = {
    DB: {
      prepare: (sql: string) => ({
        bind: (...values: unknown[]) => ({
          first: async () => {
            if (opts.broken) throw new Error("D1_ERROR: interne Details");
            if (sql.startsWith("SELECT * FROM projects"))
              return opts.project && values[0] === opts.project.id
                ? opts.project
                : null;
            return null;
          },
          all: async () => {
            if (sql.includes("id IN ("))
              return {
                results: values
                  .slice(2)
                  .filter((v) => opts.assets?.includes(String(v)))
                  .map((id) => ({ id })),
              };
            if (sql.startsWith("SELECT id FROM assets WHERE project_id"))
              return { results: (opts.assets ?? []).map((id) => ({ id })) };
            return { results: [] };
          },
          run: async () => ({ meta: { changes: 1 } }),
        }),
      }),
      batch: async () => [],
    },
    BUCKET: {
      delete: async (keys: string[]) => {
        deleted.push(keys);
      },
    },
  } as unknown as Env;
  return { env, deleted };
}
const call = (path: string, env: Env, init: RequestInit = {}) =>
  api(new Request(base + path, { ...init, headers }), env);

describe("API-Fehler", () => {
  it("meldet einen unbekannten Raum mit 404 statt 400", async () => {
    const r = await call("projects/gibtsnicht", fakeEnv({}).env);
    expect(r.status).toBe(404);
    expect((await r.json()).error).toBe("Raum nicht gefunden.");
  });
  it("lehnt kaputtes JSON mit 400 ab", async () => {
    const r = await call("projects", fakeEnv({}).env, {
      method: "POST",
      body: "{kaputt",
    });
    expect(r.status).toBe(400);
    expect((await r.json()).error).toBe("Ungültige Anfrage.");
  });
  it("verlangt beim Speichern eine gültige Revision", async () => {
    const p = newProject();
    const { env } = fakeEnv({
      project: { id: p.id, revision: 1, data: JSON.stringify(p) },
    });
    const r = await call("projects/" + p.id, env, {
      method: "PUT",
      body: JSON.stringify({ project: p }),
    });
    expect(r.status).toBe(400);
  });
  it("gibt Datenbankdetails nicht an den Browser weiter", async () => {
    const r = await call("projects/x", fakeEnv({ broken: true }).env);
    expect(r.status).toBe(500);
    expect(JSON.stringify(await r.json())).not.toContain("D1_ERROR");
  });
  it("behandelt einen fehlenden Link beim Einlesen als Eingabefehler", async () => {
    const r = await call("import", fakeEnv({}).env, {
      method: "POST",
      body: "{}",
    });
    expect(r.status).toBe(400);
  });
  it("prüft Bildbesitz gebündelt und erkennt fremde Bilder", async () => {
    const p = newProject();
    p.scenes = [
      {
        id: "s1",
        name: "Wohnzimmer",
        image: "/api/assets/eigen",
        width: 800,
        height: 600,
        layers: [],
      },
      {
        id: "s2",
        name: "Flur",
        image: "/api/assets/fremd",
        width: 800,
        height: 600,
        layers: [],
      },
    ];
    const save = (assets: string[]) =>
      call(
        "projects/" + p.id,
        fakeEnv({
          project: { id: p.id, revision: 3, data: "{}" },
          assets,
        }).env,
        { method: "PUT", body: JSON.stringify({ project: p, revision: 3 }) },
      );
    const foreign = await save(["eigen"]);
    expect(foreign.status).toBe(400);
    expect((await foreign.json()).error).toBe(
      "Bild gehört nicht zu diesem Raum.",
    );
    const ok = await save(["eigen", "fremd"]);
    expect(ok.status).toBe(200);
    expect(await ok.json()).toEqual({ revision: 4 });
  });
  it("löscht die Bilder eines Raums in einem R2-Aufruf", async () => {
    const { env, deleted } = fakeEnv({
      project: { id: "p1", revision: 1, data: "{}" },
      assets: ["a", "b", "c"],
    });
    const r = await call("projects/p1", env, { method: "DELETE" });
    expect(r.status).toBe(200);
    expect(deleted).toEqual([["a", "b", "c"]]);
  });
  it("wirft bei ungültigen Adressen einen HttpError mit Status 400", () => {
    for (const u of ["kein link", undefined, ""]) {
      try {
        publicUrl(u);
        expect.unreachable();
      } catch (e) {
        expect(e).toBeInstanceOf(HttpError);
        expect((e as HttpError).status).toBe(400);
      }
    }
  });
});

describe("Eingaben im Browser", () => {
  it("liefert Preise als Zahl, damit „199,00“ beim Tippen nicht springt", () => {
    expect(moneyValue(19900)).toBe(199);
    expect(moneyValue(1999)).toBe(19.99);
    expect(moneyValue(0)).toBe(0);
    expect(moneyValue(null)).toBe("");
  });
  it("übersetzt Prüffehler in lesbare deutsche Meldungen", () => {
    const p = newProject();
    const range = projectSchema.safeParse({
      ...p,
      limits: { Bett: { min: 50000, max: 10000, cap: null } },
    });
    expect(readableError(range.error)).toBe("Mindestpreis über Höchstpreis.");
    const empty = projectSchema.safeParse({ ...p, name: "" });
    expect(readableError(empty.error)).toBe("Bitte Eingaben prüfen: Name.");
    expect(readableError(new Error("Kaputt."))).toBe("Kaputt.");
    expect(readableError("???")).toBe("Unbekannter Fehler.");
  });
});
