import { projectSchema, newProject, uid, safeUrl } from "../src/model";
import { publicFetch, bounded, extractProduct } from "./products";
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
async function body(req: Request) {
  return JSON.parse(
    new TextDecoder().decode(await bounded(req as any, 1500000)),
  );
}
async function project(env: Env, id: string, user: string) {
  const row = await env.DB.prepare(
    "SELECT * FROM projects WHERE id=? AND owner=?",
  )
    .bind(id, user)
    .first<any>();
  if (!row) throw new Error("Raum nicht gefunden.");
  return row;
}
async function asset(
  env: Env,
  user: string,
  pid: string,
  data: Uint8Array,
  mime: string,
) {
  if (!["image/png", "image/jpeg", "image/webp"].includes(mime))
    throw new Error("Bitte JPG, PNG oder WebP verwenden.");
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
    throw new Error("Bildformat ungültig.");
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
        const p = projectSchema.parse(j.project);
        if (p.id !== id)
          return json({ error: "Raum-ID stimmt nicht überein." }, 400);
        const ids = new Set(p.items.map((i) => i.id));
        for (const scene of p.scenes)
          for (const l of scene.layers)
            if (!ids.has(l.itemId)) throw new Error("Möbelzuordnung fehlt.");
        for (const image of [
          ...p.scenes.map((s) => s.image),
          ...p.items.map((i) => i.image),
        ].filter(Boolean)) {
          const aid = image.replace("/api/assets/", "");
          if (
            image !== "/api/assets/" + aid ||
            !(await env.DB.prepare(
              "SELECT id FROM assets WHERE id=? AND owner=? AND project_id=?",
            )
              .bind(aid, user, id)
              .first())
          )
            throw new Error("Bild gehört nicht zu diesem Raum.");
        }
        for (const i of p.items)
          if (i.url && !safeUrl(i.url))
            throw new Error("Ungültiger Produktlink.");
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
        for (const a of rows.results) await env.BUCKET.delete(a.id);
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
      await project(env, j.project, user);
      const { response } = await publicFetch(
        j.url,
        "image/png,image/jpeg,image/webp",
      );
      return json({
        url: await asset(
          env,
          user,
          j.project,
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
    return json(
      {
        error:
          e instanceof Error
            ? e.name === "ZodError"
              ? "Bitte Eingaben prüfen."
              : e.message
            : "Anfrage fehlgeschlagen.",
      },
      400,
    );
  }
}
