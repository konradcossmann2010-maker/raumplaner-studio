import { projectSchema, newProject, uid, safeUrl } from "../src/model";
import { publicFetch, bounded, extractProduct } from "./products";
import { HttpError } from "./http-error";
export interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
  LOCAL_DEV?: string;
}
const json = (v: unknown, status = 200) =>
  Response.json(v, {
    status,
    headers: {
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
export function owner(req: Request, env: Env) {
  const host = new URL(req.url).hostname;
  return env.LOCAL_DEV === "true" && ["127.0.0.1", "localhost"].includes(host)
    ? "local-user"
    : req.headers.get("oai-authenticated-user-id");
}
async function body(req: Request): Promise<Record<string, any>> {
  let j: unknown;
  try {
    j = JSON.parse(
      new TextDecoder().decode(await bounded(req as any, 1500000)),
    );
  } catch (e) {
    if (e instanceof HttpError) throw e;
    throw new HttpError(400, "Ungültige Anfrage.");
  }
  if (!j || typeof j !== "object" || Array.isArray(j))
    throw new HttpError(400, "Ungültige Anfrage.");
  return j as Record<string, any>;
}
async function project(env: Env, id: unknown, user: string) {
  const row = await env.DB.prepare(
    "SELECT * FROM projects WHERE id=? AND owner=?",
  )
    .bind(String(id ?? ""), user)
    .first<any>();
  if (!row) throw new HttpError(404, "Raum nicht gefunden.");
  return row;
}
/** D1 erlaubt höchstens 100 gebundene Werte pro Abfrage. */
const IN_CHUNK = 90;
/** Prüft mit wenigen Abfragen, ob alle Bilder diesem Nutzer und Raum gehören. */
async function assertOwnImages(
  env: Env,
  user: string,
  pid: string,
  images: string[],
) {
  const ids = new Set<string>();
  for (const image of images) {
    const aid = image.replace("/api/assets/", "");
    if (!aid || image !== "/api/assets/" + aid)
      throw new HttpError(400, "Bild gehört nicht zu diesem Raum.");
    ids.add(aid);
  }
  const all = [...ids];
  for (let i = 0; i < all.length; i += IN_CHUNK) {
    const chunk = all.slice(i, i + IN_CHUNK);
    const rows = await env.DB.prepare(
      `SELECT id FROM assets WHERE owner=? AND project_id=? AND id IN (${chunk
        .map(() => "?")
        .join(",")})`,
    )
      .bind(user, pid, ...chunk)
      .all<{ id: string }>();
    if (rows.results.length !== chunk.length)
      throw new HttpError(400, "Bild gehört nicht zu diesem Raum.");
  }
}
async function asset(
  env: Env,
  user: string,
  pid: string,
  data: Uint8Array,
  mime: string,
) {
  if (!["image/png", "image/jpeg", "image/webp"].includes(mime))
    throw new HttpError(415, "Bitte JPG, PNG oder WebP verwenden.");
  const png = data[0] === 137 && data[1] === 80;
  const jpg = data[0] === 255 && data[1] === 216;
  const webp =
    new TextDecoder().decode(data.slice(0, 4)) === "RIFF" &&
    new TextDecoder().decode(data.slice(8, 12)) === "WEBP";
  if (
    !(
      (mime === "image/png" && png) ||
      (mime === "image/jpeg" && jpg) ||
      (mime === "image/webp" && webp)
    )
  )
    throw new HttpError(415, "Bildformat ungültig.");
  const id = uid();
  await env.BUCKET.put(id, data, { httpMetadata: { contentType: mime } });
  await env.DB.prepare(
    "INSERT INTO assets (id,owner,project_id,mime) VALUES (?,?,?,?)",
  )
    .bind(id, user, pid, mime)
    .run();
  return "/api/assets/" + id;
}
export async function api(req: Request, env: Env): Promise<Response> {
  const user = owner(req, env);
  if (!user) return json({ error: "Bitte mit ChatGPT anmelden." }, 401);
  const url = new URL(req.url),
    path = url.pathname,
    method = req.method;
  if (
    !["GET", "HEAD"].includes(method) &&
    req.headers.get("origin") &&
    req.headers.get("origin") !== url.origin
  )
    return json({ error: "Fremde Anfrage gesperrt." }, 403);
  try {
    if (path === "/api/projects" && method === "GET") {
      const rows = await env.DB.prepare(
        "SELECT id,name,revision,updated_at FROM projects WHERE owner=? ORDER BY updated_at DESC",
      )
        .bind(user)
        .all();
      return json(rows.results);
    }
    if (path === "/api/projects" && method === "POST") {
      const p = newProject();
      const j = await body(req);
      p.name = String(j.name || p.name).slice(0, 120);
      await env.DB.prepare(
        "INSERT INTO projects (id,owner,name,data,revision,updated_at) VALUES (?,?,?,?,1,?)",
      )
        .bind(p.id, user, p.name, JSON.stringify(p), new Date().toISOString())
        .run();
      return json({ project: p, revision: 1 });
    }
    if (/^\/api\/projects\/[^/]+$/.test(path)) {
      const id = path.split("/").pop()!;
      const row = await project(env, id, user);
      if (method === "GET")
        return json({ project: JSON.parse(row.data), revision: row.revision });
      if (method === "PUT") {
        const j = await body(req);
        if (!Number.isInteger(j.revision) || j.revision < 1)
          throw new HttpError(400, "Revision fehlt oder ist ungültig.");
        const p = projectSchema.parse(j.project);
        if (p.id !== id)
          return json({ error: "Raum-ID stimmt nicht überein." }, 400);
        await assertOwnImages(
          env,
          user,
          id,
          [
            ...p.scenes.map((s) => s.image),
            ...p.items.flatMap((i) => [i.image, i.originalImage ?? ""]),
          ].filter(Boolean),
        );
        for (const i of p.items)
          if (i.url && !safeUrl(i.url))
            throw new HttpError(400, "Ungültiger Produktlink.");
        const r = await env.DB.prepare(
          "UPDATE projects SET name=?,data=?,revision=revision+1,updated_at=? WHERE id=? AND owner=? AND revision=?",
        )
          .bind(
            p.name,
            JSON.stringify(p),
            new Date().toISOString(),
            id,
            user,
            j.revision,
          )
          .run();
        return r.meta.changes
          ? json({ revision: j.revision + 1 })
          : json(
              { error: "Dieser Raum wurde auf einem anderen Gerät geändert." },
              409,
            );
      }
      if (method === "DELETE") {
        const rows = await env.DB.prepare(
          "SELECT id FROM assets WHERE project_id=? AND owner=?",
        )
          .bind(id, user)
          .all<{ id: string }>();
        const keys = rows.results.map((a) => a.id);
        // R2 löscht bis zu 1000 Schlüssel pro Aufruf.
        for (let i = 0; i < keys.length; i += 1000)
          await env.BUCKET.delete(keys.slice(i, i + 1000));
        await env.DB.batch([
          env.DB.prepare(
            "DELETE FROM assets WHERE project_id=? AND owner=?",
          ).bind(id, user),
          env.DB.prepare("DELETE FROM projects WHERE id=? AND owner=?").bind(
            id,
            user,
          ),
        ]);
        return json({ ok: true });
      }
      return json({ error: "Methode nicht erlaubt." }, 405);
    }
    if (path === "/api/assets" && method === "POST") {
      const pid = url.searchParams.get("project") ?? "";
      await project(env, pid, user);
      const data = await bounded(req as any, 10 * 1024 * 1024);
      return json({
        url: await asset(
          env,
          user,
          pid,
          data,
          req.headers.get("content-type")?.split(";")[0] ?? "",
        ),
      });
    }
    if (path.startsWith("/api/assets/") && method === "GET") {
      const id = path.split("/").pop()!;
      const row = await env.DB.prepare(
        "SELECT id FROM assets WHERE id=? AND owner=?",
      )
        .bind(id, user)
        .first();
      if (!row) return json({ error: "Bild nicht gefunden." }, 404);
      const object = await env.BUCKET.get(id);
      if (!object) return json({ error: "Bild nicht gefunden." }, 404);
      return new Response(object.body, {
        headers: {
          "content-type":
            object.httpMetadata?.contentType ?? "application/octet-stream",
          "cache-control": "private, max-age=3600",
          "x-content-type-options": "nosniff",
        },
      });
    }
    if (path === "/api/import" && method === "POST") {
      const j = await body(req);
      const { response, url: final } = await publicFetch(j.url, "text/html");
      const html = new TextDecoder().decode(await bounded(response, 2000000));
      return json(extractProduct(html, final));
    }
    if (path === "/api/image-import" && method === "POST") {
      const j = await body(req);
      const pid = String(j.project ?? "");
      await project(env, pid, user);
      const { response } = await publicFetch(
        j.url,
        "image/png,image/jpeg,image/webp",
      );
      return json({
        url: await asset(
          env,
          user,
          pid,
          await bounded(response, 10 * 1024 * 1024),
          response.headers.get("content-type")?.split(";")[0] ?? "",
        ),
      });
    }
    if (path === "/api/search-status")
      return json({ mode: "shop-links", requiresKey: false });
    if (path === "/api/search" || path === "/api/offers")
      return json(
        {
          error:
            "Die Suche erfolgt jetzt direkt über Shop-Links, ohne Suchdienst.",
        },
        410,
      );
    return json({ error: "Nicht gefunden." }, 404);
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.message }, e.status);
    if (e instanceof Error && e.name === "ZodError")
      return json({ error: "Bitte Eingaben prüfen." }, 400);
    // Unerwarteter Fehler (z. B. Datenbank): Details nur ins Log, nicht an den Browser.
    console.error("API-Fehler", path, e);
    return json(
      { error: "Interner Fehler. Bitte später erneut versuchen." },
      500,
    );
  }
}
