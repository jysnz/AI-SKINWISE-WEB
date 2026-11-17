"use client";
import { useRef, useState } from "react";
import clsx from "clsx";
import { motion } from "motion/react";
import { toast } from "sonner";
import { MAX_FILES, MAX_MB, type Photo } from "@/lib/api";
import { debugSkinWise } from "@/lib/debug";

type Props = {
  photos: Photo[]; setPhotos: (p: Photo[]) => void;
  onSubmit: () => void;
};

export default function Form(p: Props) {
  const [over, setOver] = useState(false);
  const [nudge, setNudge] = useState(false);
  const dropRef = useRef<HTMLLabelElement>(null);
  const n = p.photos.length;
  const ready = n > 0;

  const flash = (el: HTMLElement | null, msg: string) => {
    setNudge(true); setTimeout(() => setNudge(false), 1000);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    toast.error(msg);
  };

  function addFiles(list: FileList | File[]) {
    const next = [...p.photos];
    for (const f of Array.from(list)) {
      if (next.length >= MAX_FILES) { toast.error("You can add up to 3 photos."); break; }
      if (!/^image\/(jpeg|png|webp)$/.test(f.type)) { toast.error("Only JPG, PNG or WEBP photos are supported."); continue; }
      if (f.size > MAX_MB * 1048576) { toast.error("Each photo must be under " + MAX_MB + " MB."); continue; }
      next.push({ file: f, url: URL.createObjectURL(f) });
    }
    p.setPhotos(next);
  }
  function remove(i: number) {
    URL.revokeObjectURL(p.photos[i].url);
    p.setPhotos(p.photos.filter((_, j) => j !== i));
  }
  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!n) {
      debugSkinWise("form.submit.blocked", { reason: "missing_photo" });
      return flash(dropRef.current, "Add at least one photo.");
    }
    debugSkinWise("form.submit.validated", { photoCount: n });
    p.onSubmit();
  }


  return (
    <form id="form" className="scan-grid" noValidate onSubmit={submit}>
      <section className="card" aria-labelledby="h-photos">
        <div className="card-head">
          <h2 id="h-photos">Photos <span className="field-required">Required</span></h2>
          <span className={clsx("count", n === MAX_FILES && "full")} aria-live="polite">{n} of {MAX_FILES}</span>
        </div>
        <label ref={dropRef} className={clsx("drop", over && "over", n >= MAX_FILES && "full", nudge && "nudge")}
          onDragEnter={(e) => { e.preventDefault(); setOver(true); }} onDragOver={(e) => { e.preventDefault(); setOver(true); }}
          onDragLeave={(e) => { e.preventDefault(); setOver(false); }}
          onDrop={(e) => { e.preventDefault(); setOver(false); addFiles(e.dataTransfer.files); }}>
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden
            onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }} />
          <span className="drop-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8a2 2 0 0 1 2-2h1.5l1-1.5h7L17.5 6H18a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" /><circle cx="12" cy="12.5" r="3.5" /></svg>
          </span>
          <strong>{n >= MAX_FILES ? "Photo limit reached" : "Choose a photo or drop it here"}</strong>
          <span className="muted">Well-lit and in focus; JPG, PNG or WEBP; max 10 MB each</span>
        </label>
        <ul className="slots">
          {p.photos.map((it, i) => {
            return (
              <li key={it.url} className="filled">
                <motion.div className="slot-in" initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 380, damping: 28 }}>
                  <img src={it.url} alt={"Photo " + (i + 1)} draggable={false} />
                  <button type="button" aria-label={"Remove photo " + (i + 1)} onClick={() => remove(i)}>×</button>
                </motion.div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="card scan-model-card" aria-labelledby="h-details">
        <div className="card-head">
          <h2 id="h-details">About this check</h2>
        </div>
        <div className="scan-model-note">
          <span className="scan-model-icon" aria-hidden="true">✳</span>
          <div><strong>Photo-only analysis</strong><p>The model compares the photo with supported visual patterns. It does not analyze symptoms or body area.</p></div>
        </div>
        <p className="scan-model-footnote">Use the result as general information, not a diagnosis.</p>
      </section>

      <div className="actionbar">
        <p className={clsx("hint", ready && "ok")} id="hint" aria-live="polite">
          {ready ? "Ready when you are" : "Add a photo to continue"}
        </p>
        <button className={clsx("btn", !ready && "not-ready")} type="submit" aria-describedby="hint">
          <span>Analyze my skin</span>
          <svg aria-hidden="true" viewBox="0 0 20 20" width="17" height="17" fill="none"><path d="M4 10h11m-4-4 4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>
    </form>
  );
}
