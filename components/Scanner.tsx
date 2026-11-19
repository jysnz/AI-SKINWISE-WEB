"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Dialog } from "@base-ui/react/dialog";
import { Toaster, toast } from "sonner";
import { DEMO_LOW, DEMO_NONE, DEMO_OK, TIMEOUT_MS, demoPhotos, predict, type ApiResult, type Details, type Photo } from "@/lib/api";
import { debugSkinWise, debugSkinWiseError } from "@/lib/debug";
import Form from "./Form";
import Loading from "./Loading";
import Result from "./Result";

type View = "form" | "loading" | "result";
const swap = { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const } };

export default function SkinWise() {
  const [view, setView] = useState<View>("form");
  const [photos, setPhotos] = useState<Photo[]>([]);
  // Kept here, not in the form, so photos and details survive the loading view and a failed or cancelled scan.
  const [details, setDetails] = useState<Details>({ body: null, symptoms: [], description: "" });
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
    else { setResult(demo === "result" ? DEMO_OK : demo === "none" ? DEMO_NONE : DEMO_LOW); setView("result"); }
  }, []);

  async function submit() {
    debugSkinWise("scan.analysis.started", { photoCount: photos.length, symptomCount: details.symptoms.length, hasBodyArea: !!details.body });
    window.scrollTo({ top: 0, behavior: "auto" });
    setView("loading");
    const c = new AbortController(); ctl.current = c; cancelled.current = false;
    const kill = setTimeout(() => c.abort(), TIMEOUT_MS);
    try {
      const data = await predict({ photos, details, signal: c.signal });
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
      <main id="top" className={"wrap scan-product-page" + (view === "result" ? "" : " scan-fit")}>
        <div id="scan" className="scan-anchor">
          {view !== "result" && (
            <div className="cap-heading">
              <h1 className="page-title">{view === "form" ? "Start a skin check" : "Analyzing your photos"}</h1>
              <p className="scan-intro">{view === "form" ? "Add up to three clear photos, the affected area and any symptoms." : "Checking your photos against the symptoms you gave."}</p>
              {view === "form" && (
                <ol className="sw-steps" aria-label="Progress">
                  {(() => {
                    const steps: [string, boolean][] = [["Photo", photos.length > 0], ["Area", !!details.body], ["Symptoms", details.symptoms.length > 0]];
                    const now = steps.findIndex(([, d]) => !d);
                    return steps.map(([label, done], i) => (
                      <li key={label} className={done ? "done" : i === now ? "now" : undefined} aria-current={i === now ? "step" : undefined}>
                        <span className="sw-dot" aria-hidden="true">{done ? <svg viewBox="0 0 16 16" width="12" height="12" fill="none"><path d="m3.5 8.5 3 3 6-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg> : i + 1}</span>
                        {label}{i === 2 && <span className="sw-opt">optional</span>}
                      </li>
                    ));
                  })()}
                </ol>
              )}
            </div>
          )}
          <motion.div key={view} className="scan-view" {...swap}>
            {view === "form" && (
              <Form photos={photos} setPhotos={setPhotos} details={details} setDetails={setDetails} onSubmit={submit} />
            )}
            {view === "loading" && <Loading photos={photos} hasSymptoms={details.symptoms.length > 0 || !!details.description.trim()} onCancel={cancel} />}
            {view === "result" && result && <Result data={result} photos={photos} onReset={reset} onPhoto={setZoom} />}
          </motion.div>
        </div>
        {view !== "result" && (
          <footer className="foot">
            <p className="disclaimer">AI SkinWise is not 100% accurate and does not give a medical diagnosis. It is best to consult a board-certified dermatologist for any concern.</p>
          </footer>
        )}
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
