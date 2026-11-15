import React, { useEffect, useRef, useState } from "react";
import { X, FileImage, Loader2 } from "lucide-react";
import codecs from "pdf-codecs-inline";
import workerSource from "pdfjs-dist/build/pdf.worker.min.mjs?raw";
class EmbeddedPdfData {
  async fetch({ kind, filename }: { kind: string; filename: string }) {
    if (kind === "wasmUrl" && codecs[filename])
      return Uint8Array.from(atob(codecs[filename]), (c) => c.charCodeAt(0));
    throw new Error(
      "Diese PDF-Bilddaten sind offline nicht verfügbar. Bitte den Plan als PNG oder JPG exportieren.",
    );
  }
}
export default function PdfImport({
  file,
  onClose,
  onImport,
}: {
  file: File;
  onClose: () => void;
  onImport: (file: File) => Promise<void>;
}) {
  const [doc, setDoc] = useState<any>(),
    [page, setPage] = useState(1),
    [busy, setBusy] = useState(true),
    [ready, setReady] = useState(false),
    [error, setError] = useState("");
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let task: any,
      disposed = false;
    let workerURL = "";
    (async () => {
      try {
        if (file.size > 20 * 1024 * 1024)
          throw new Error("Das PDF darf höchstens 20 MB groß sein.");
        const pdf = await import("pdfjs-dist");
        workerURL = URL.createObjectURL(
          new Blob([workerSource], { type: "text/javascript" }),
        );
        pdf.GlobalWorkerOptions.workerSrc = workerURL;
        task = pdf.getDocument({
          data: await file.arrayBuffer(),
          enableXfa: false,
          useSystemFonts: true,
          useWorkerFetch: false,
          BinaryDataFactory: EmbeddedPdfData,
          stopAtErrors: true,
        });
        const loaded = await task.promise;
        if (!disposed) setDoc(loaded);
      } catch (e) {
        if (!disposed) {
          setError("PDF konnte nicht geöffnet werden: " + (e as Error).message);
          setBusy(false);
        }
      }
    })();
    return () => {
      disposed = true;
      task?.destroy();
      if (workerURL) URL.revokeObjectURL(workerURL);
    };
  }, [file]);
  useEffect(() => {
    if (!doc) return;
    let disposed = false,
      render: any;
    setBusy(true);
    setReady(false);
    (async () => {
      try {
        const p = await doc.getPage(page);
        if (disposed) return;
        const v = p.getViewport({ scale: 1 });
        const viewport = p.getViewport({
          scale: Math.min(2, 2048 / Math.max(v.width, v.height)),
        });
        const c = canvas.current!;
        c.width = Math.ceil(viewport.width);
        c.height = Math.ceil(viewport.height);
        render = p.render({
          canvas: c,
          viewport,
          background: "rgb(255,255,255)",
        });
        await render.promise;
        const pdf = await import("pdfjs-dist");
        const ops = await p.getOperatorList();
        for (let i = 0; i < ops.fnArray.length; i++) {
          if (
            [
              pdf.OPS.paintImageXObject,
              pdf.OPS.paintImageXObjectRepeat,
            ].includes(ops.fnArray[i])
          ) {
            const id = ops.argsArray[i]?.[0];
            if (typeof id === "string") {
              const image = id.startsWith("g_")
                ? p.commonObjs.get(id)
                : p.objs.get(id);
              if (!image)
                throw new Error(
                  "Ein Bild im PDF konnte nicht dekodiert werden. Bitte den Plan als PNG oder JPG exportieren.",
                );
            }
          }
        }
        if (!disposed) setReady(true);
      } catch (e) {
        if (!disposed)
          setError(
            "PDF-Seite konnte nicht angezeigt werden: " + (e as Error).message,
          );
      } finally {
        if (!disposed) setBusy(false);
      }
    })();
    return () => {
      disposed = true;
      render?.cancel();
    };
  }, [doc, page]);
  return (
    <div className="modal-backdrop">
      <div className="modal pdf-import">
        <header>
          <div>
            <span className="eyebrow">HAUSPLAN ALS PDF</span>
            <h2>Grundriss-Seite auswählen</h2>
          </div>
          <button onClick={onClose} aria-label="Schließen">
            <X />
          </button>
        </header>
        <p>
          Wähle die gewünschte Etage oder Planseite. Sie wird lokal als Bild
          übernommen.
        </p>
        {doc && (
          <label>
            PDF-Seite
            <select
              aria-label="PDF-Seite"
              value={page}
              onChange={(e) => {
                setError("");
                setPage(+e.target.value);
              }}
            >
              {Array.from({ length: Math.min(doc.numPages, 100) }, (_, i) => (
                <option key={i} value={i + 1}>
                  Seite {i + 1} von {doc.numPages}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="pdf-preview">
          <canvas ref={canvas} />
        </div>
        {busy && (
          <p>
            <Loader2 className="spin" size={15} />
            Seite wird geladen …
          </p>
        )}
        {error && <p className="error">{error}</p>}
        <footer>
          <button onClick={onClose}>Abbrechen</button>
          <button
            className="primary"
            disabled={!ready || busy}
            onClick={() => {
              setBusy(true);
              canvas.current!.toBlob(async (b) => {
                try {
                  if (!b) throw new Error("PDF-Bild nicht verfügbar.");
                  await onImport(
                    new File(
                      [b],
                      file.name.replace(/\.pdf$/i, "") +
                        " – Seite " +
                        page +
                        ".png",
                      { type: "image/png" },
                    ),
                  );
                  onClose();
                } catch (e) {
                  setError((e as Error).message);
                  setBusy(false);
                }
              }, "image/png");
            }}
          >
            <FileImage size={16} />
            Seite als Hausplan übernehmen
          </button>
        </footer>
      </div>
    </div>
  );
}
