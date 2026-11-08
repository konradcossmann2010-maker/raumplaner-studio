import ipaddr from "ipaddr.js";
import { parseHTML } from "linkedom";
export function publicUrl(s: string) {
  const u = new URL(s);
  if (
    !["https:", "http:"].includes(u.protocol) ||
    u.username ||
    u.password ||
    (u.port && !["443", "80"].includes(u.port))
  )
    throw new Error("Nur öffentliche Webadressen sind erlaubt.");
  const host = u.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (
    !host.includes(".") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host === "localhost"
  )
    throw new Error("Private Adresse ist nicht erlaubt.");
  if (ipaddr.isValid(host) && ipaddr.parse(host).range() !== "unicast")
    throw new Error("Private Adresse ist nicht erlaubt.");
  return u;
}
export async function publicFetch(raw: string, accept: string) {
  let u = publicUrl(raw);
  for (let n = 0; n < 4; n++) {
    const host = u.hostname.replace(/^\[|\]$/g, "");
    if (!ipaddr.isValid(host)) {
      for (const type of ["A", "AAAA"]) {
        const dns = await fetch(
          "https://cloudflare-dns.com/dns-query?name=" +
            encodeURIComponent(host) +
            "&type=" +
            type,
          {
            headers: { accept: "application/dns-json" },
            signal: AbortSignal.timeout(8000),
          },
        );
        if (!dns.ok) throw new Error("DNS-Prüfung fehlgeschlagen.");
        const j: any = await dns.json();
        if (j.Status !== 0) throw new Error("Adresse nicht erreichbar.");
        for (const a of j.Answer ?? [])
          if (
            [1, 28].includes(a.type) &&
            (!ipaddr.isValid(a.data) ||
              ipaddr.parse(a.data).range() !== "unicast")
          )
            throw new Error("Private Adresse gesperrt.");
      }
    }
    const r = await fetch(u, {
      redirect: "manual",
      headers: { accept },
      signal: AbortSignal.timeout(12000),
    });
    if (r.status >= 300 && r.status < 400) {
      u = publicUrl(new URL(r.headers.get("location") ?? "", u).href);
      continue;
    }
    if (!r.ok)
      throw new Error(
        "Der Shop erlaubt keinen Abruf. Bitte Angaben selbst ergänzen.",
      );
    return { response: r, url: u.href };
  }
  throw new Error("Zu viele Weiterleitungen.");
}
export async function bounded(r: Response, max: number) {
  if (Number(r.headers.get("content-length") ?? 0) > max)
    throw new Error("Datei zu groß.");
  const reader = r.body?.getReader();
  if (!reader) throw new Error("Leere Antwort.");
  let size = 0;
  const parts: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel();
      throw new Error("Datei zu groß.");
    }
    parts.push(value);
  }
  const all = new Uint8Array(size);
  let p = 0;
  for (const part of parts) {
    all.set(part, p);
    p += part.length;
  }
  return all;
}
export function extractProduct(html: string, url: string) {
  const { document } = parseHTML(html);
  const nodes: any[] = [];
  function walk(x: any) {
    if (!x || typeof x !== "object") return;
    if (Array.isArray(x)) return x.forEach(walk);
    nodes.push(x);
    if (x["@graph"]) walk(x["@graph"]);
    if (x.mainEntity) walk(x.mainEntity);
  }
  for (const el of document.querySelectorAll(
    'script[type="application/ld+json"]',
  )) {
    try {
      walk(JSON.parse(el.textContent ?? ""));
    } catch {}
  }
  const p = nodes.find((n) => [n["@type"]].flat().includes("Product")) ?? {};
  const o = Array.isArray(p.offers)
    ? p.offers.length === 1
      ? p.offers[0]
      : {}
    : (p.offers ?? {});
  const meta = (k: string) =>
    document.querySelector(`meta[property="${k}"]`)?.getAttribute("content") ??
    "";
  const img = Array.isArray(p.image) ? p.image[0] : p.image;
  let image = "";
  try {
    const source =
      typeof img === "string" ? img : (img?.url ?? meta("og:image"));
    if (source) image = new URL(source, url).href;
  } catch {}
  const num =
    typeof o.price === "string"
      ? o.price.trim()
        ? Number(o.price.replace(",", "."))
        : null
      : o.price;
  return {
    name: String(p.name || meta("og:title") || document.title || "").slice(
      0,
      200,
    ),
    price:
      o.priceCurrency === "EUR" &&
      num !== undefined &&
      num !== null &&
      Number.isFinite(num) &&
      num >= 0
        ? Math.round(num * 100)
        : null,
    image,
    url,
    merchant: new URL(url).hostname,
    observedAt: new Date().toISOString(),
  };
}
export function searchAllowed(a: any) {
  return a.plan_monthly_price === 0 && a.plan_searches_left > 0;
}
export async function account(key: string) {
  const r = await fetch(
    "https://serpapi.com/account.json?api_key=" + encodeURIComponent(key),
    { signal: AbortSignal.timeout(12000) },
  );
  if (!r.ok)
    throw new Error("Suchschlüssel ungültig oder Suchdienst nicht erreichbar.");
  return (await r.json()) as any;
}
export async function provider(key: string, params: Record<string, string>) {
  const q = new URLSearchParams({ ...params, api_key: key });
  const r = await fetch("https://serpapi.com/search.json?" + q, {
    signal: AbortSignal.timeout(25000),
  });
  const j: any = await r.json();
  if (!r.ok || j.error)
    throw new Error(
      "Suche derzeit nicht verfügbar. Kontingent und Suchschlüssel prüfen.",
    );
  return j;
}
