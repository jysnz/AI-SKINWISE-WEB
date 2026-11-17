"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Dialog } from "@base-ui/react/dialog";
import { Toaster, toast } from "sonner";
import { DEMO_LOW, DEMO_OK, TIMEOUT_MS, demoPhotos, predict, type ApiResult, type Photo } from "@/lib/api";
import { debugSkinWise, debugSkinWiseError } from "@/lib/debug";
import Form from "./Form";
import Loading from "./Loading";
import Result from "./Result";

type View = "form" | "loading" | "result";
const swap = { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const } };

export default function SkinWise() {
  const [view, setView] = useState<View>("form");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [result, setResult] = useState<ApiResult | null>(null);
  const [zoom, setZoom] = useState<string | null>(null);
  const ctl = useRef<AbortController | null>(null);
  const cancelled = useRef(false);

  // URL params for demos and stills (see AGENT.md): ?demo=loading|result|low, ?still
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    if (q.has("still")) document.documentElement.classList.add("still");
    const demo = q.get("demo");
    if (!demo) return;
    setPhotos(demoPhotos());
    if (demo === "loading") setView("loading");
    else { setResult(demo === "result" ? DEMO_OK : DEMO_LOW); setView("result"); }
  }, []);

  async function submit() {
    debugSkinWise("scan.analysis.started", { photoCount: photos.length });
    window.scrollTo({ top: 0, behavior: "auto" });
    setView("loading");
    const c = new AbortController(); ctl.current = c; cancelled.current = false;
    const kill = setTimeout(() => c.abort(), TIMEOUT_MS);
    try {
      const data = await predict({ photos, signal: c.signal });
      setResult(data); setView("result");
    } catch (err: any) {
      setView("form");
      debugSkinWiseError("scan.analysis.failed", {
        name: err?.name || "UnknownError",
        message: err?.message || String(err),
        cancelled: cancelled.current,
      });
      if (cancelled.current) toast("Scan cancelled", { description: "Your photos and details are still here." });
      else toast.error(err?.name === "AbortError" ? "The request timed out. Please try again." : err?.message || "Something went wrong.");
    } finally { clearTimeout(kill); ctl.current = null; }
  }
  const cancel = () => { cancelled.current = true; ctl.current?.abort(); };
  const reset = () => { setView("form"); document.getElementById("scan")?.scrollIntoView({ behavior: "smooth" }); };


  return (
    <>
      <main id="top" className="wrap scan-product-page">
        <div id="scan" className="scan-anchor">
          {view !== "result" && (
            <div className="scan-page-heading">
              <span className="section-eyebrow">A CLEARER FIRST LOOK</span>
              <h1 className="page-title">{view === "form" ? "Start a skin check" : "Analyzing your photos"}</h1>
              <p className="scan-intro">{view === "form" ? "Upload up to three clear photos for an AI-powered visual estimate." : "Your photos are being compared with supported visual patterns."}</p>
              <ol className="scan-steps" aria-label="Skin check progress">
                <li className={view === "form" ? "current" : "complete"}><b>01</b><span>Add photos</span></li>
                <li className={view === "loading" ? "current" : view === "form" ? "" : "complete"}><b>02</b><span>Compare patterns</span></li>
                <li><b>03</b><span>Review estimate</span></li>
              </ol>
              {view === "form" && <aside className="scan-boundary-note" aria-label="Medical guidance">
                <span aria-hidden="true">i</span>
                <p><strong>Visual estimate only.</strong> Symptoms and body area are not analyzed. This result is general information, not a diagnosis.</p>
              </aside>}
            </div>
          )}
          <motion.div key={view} {...swap}>
            {view === "form" && (
              <Form photos={photos} setPhotos={setPhotos} onSubmit={submit} />
            )}
            {view === "loading" && <Loading photos={photos} onCancel={cancel} />}
            {view === "result" && result && <Result data={result} photos={photos} onReset={reset} onPhoto={setZoom} />}
          </motion.div>
        </div>
        <footer className="foot">
          <p className="disclaimer">AI SkinWise gives general information, not a medical diagnosis. See a licensed dermatologist for any concern.</p>
        </footer>
      </main>

      <Dialog.Root open={!!zoom} onOpenChange={(o) => !o && setZoom(null)}>
        <Dialog.Portal>
          <Dialog.Backdrop className="dlg-backdrop" />
          <Dialog.Popup className="dlg">
            <Dialog.Title className="sr">Photo preview</Dialog.Title>
            {zoom && <img src={zoom} alt="Enlarged photo" />}
            <Dialog.Close className="dlg-close" aria-label="Close preview">×</Dialog.Close>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
      <Toaster position="bottom-center" theme="light" richColors closeButton />
    </>
  );
}
