import { build } from "esbuild";
import { mkdir, writeFile, readFile, cp } from "node:fs/promises";
await mkdir("dist/server", { recursive: true });
await mkdir("dist/.openai", { recursive: true });
await build({
  entryPoints: ["src/main.tsx"],
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  outfile: "dist/client.js",
  minify: true,
  define: { "process.env.NODE_ENV": '"production"' },
});
const js = await readFile("dist/client.js", "utf8"),
  css = await readFile("dist/client.css", "utf8");
const html =
  '<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#294e43"><title>Raumplaner Studio</title><link rel="stylesheet" href="/app.css"></head><body><div id="root"></div><script type="module" src="/app.js"></script></body></html>';
const entry = `import {api} from './server/index.ts'; const files={'/app.js':${JSON.stringify(js)},'/app.css':${JSON.stringify(css)}};export default {async fetch(request,env){const u=new URL(request.url);if(u.pathname.startsWith('/api/'))return api(request,env);if(files[u.pathname])return new Response(files[u.pathname],{headers:{'content-type':u.pathname.endsWith('.js')?'text/javascript':'text/css','cache-control':'no-cache','x-content-type-options':'nosniff'}});return new Response(${JSON.stringify(html)},{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}})}}`;
await build({
  stdin: { contents: entry, resolveDir: process.cwd(), sourcefile: "entry.ts" },
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  outfile: "dist/server/index.js",
  minify: true,
});
await cp(".openai/hosting.json", "dist/.openai/hosting.json");
await cp("drizzle", "dist/drizzle", { recursive: true });
console.log("Built private Worker: dist/server/index.js");
