import { resolve } from "node:path";
import { build } from "esbuild";
import { mkdir, writeFile, readFile, cp } from "node:fs/promises";
const pdfWorker = {
  name: "pdf-worker-text",
  setup(build) {
    build.onResolve({ filter: /^pdf-codecs-inline$/ }, () => ({
      path: "codecs",
      namespace: "pdf-codecs",
    }));
    build.onLoad({ filter: /.*/, namespace: "pdf-codecs" }, async () => ({
      contents:
        "export default " +
        JSON.stringify(
          Object.fromEntries(
            await Promise.all(
              ["openjpeg.wasm", "jbig2.wasm"].map(async (name) => [
                name,
                (
                  await readFile(resolve("node_modules/pdfjs-dist/wasm", name))
                ).toString("base64"),
              ]),
            ),
          ),
        ),
      loader: "js",
    }));
    build.onResolve({ filter: /pdf\.worker\.min\.mjs\?raw$/ }, () => ({
      path: resolve("node_modules/pdfjs-dist/build/pdf.worker.min.mjs"),
      namespace: "pdf-worker",
    }));
    build.onLoad({ filter: /.*/, namespace: "pdf-worker" }, async (args) => ({
      contents: await readFile(args.path, "utf8"),
      loader: "text",
    }));
  },
};
await mkdir("dist/server", { recursive: true });
await mkdir("dist/.openai", { recursive: true });
await build({
  entryPoints: ["src/main.tsx"],
  plugins: [pdfWorker],
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
await build({
  entryPoints: ["src/main.tsx"],
  plugins: [pdfWorker],
  bundle: true,
  format: "iife",
  platform: "browser",
  target: "es2022",
  outfile: "dist/offline.js",
  minify: true,
  define: { "process.env.NODE_ENV": '"production"' },
});
const offlineJS = await readFile("dist/offline.js", "utf8");
const offlineCSS = await readFile("dist/offline.css", "utf8");
const codecLicenses = await Promise.all(
  [
    "LICENSE_OPENJPEG",
    "LICENSE_JBIG2",
    "LICENSE_PDFJS_OPENJPEG",
    "LICENSE_PDFJS_JBIG2",
  ].map((name) =>
    readFile(resolve("node_modules/pdfjs-dist/wasm", name), "utf8"),
  ),
);
const offlineHTML =
  '<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Raumplaner Offline</title><style>' +
  offlineCSS +
  '</style></head><body><div id="root"></div><script>' +
  offlineJS.replace(/<\/script/gi, "<\\/script") +
  "</script><!-- PDF image codecs licenses: " +
  codecLicenses.join("\n").replaceAll("--", "—") +
  " --></body></html>";
await writeFile("dist/raumplaner-offline.html", offlineHTML);
const entry = `import {api} from './server/index.ts'; const files={'/app.js':${JSON.stringify(js)},'/app.css':${JSON.stringify(css)},'/raumplaner-offline.html':${JSON.stringify(offlineHTML)}};export default {async fetch(request,env){const u=new URL(request.url);if(u.pathname.startsWith('/api/'))return api(request,env);if(files[u.pathname])return new Response(files[u.pathname],{headers:{'content-type':u.pathname.endsWith('.js')?'text/javascript':u.pathname.endsWith('.html')?'text/html; charset=utf-8':'text/css','cache-control':'no-cache','x-content-type-options':'nosniff'}});return new Response(${JSON.stringify(html)},{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}})}}`;
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
