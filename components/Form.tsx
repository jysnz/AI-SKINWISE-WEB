"use client";
import { useRef, useState, type CSSProperties } from "react";
import clsx from "clsx";
import { motion } from "motion/react";
import { toast } from "sonner";
import { BODY_AREAS, MAX_DESC, MAX_FILES, MAX_MB, SYMPTOMS, type Details, type Photo } from "@/lib/api";
import { debugSkinWise } from "@/lib/debug";

type Props = {
  photos: Photo[]; setPhotos: (p: Photo[]) => void;
  details: Details; setDetails: (d: Details) => void;
  onSubmit: () => void;
};

export default function Form(p: Props) {
  const [over, setOver] = useState(false);
  const [nudge, setNudge] = useState<"photo" | "body" | null>(null);
  const [active, setActive] = useState(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLFieldSetElement>(null);
  const n = p.photos.length;
  const { body, symptoms, description } = p.details;
  const ready = n > 0 && !!body;
  const shown = p.photos[Math.min(active, n - 1)];
  const set = (patch: Partial<Details>) => p.setDetails({ ...p.details, ...patch });

  const flash = (which: "photo" | "body", el: HTMLElement | null, msg: string) => {
    setNudge(which); setTimeout(() => setNudge(null), 1000);
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
    if (next.length > n) setActive(next.length - 1);
    p.setPhotos(next);
  }
  function remove(i: number) {
    URL.revokeObjectURL(p.photos[i].url);
    setActive(i < active ? active - 1 : Math.max(0, Math.min(active, n - 2)));
    p.setPhotos(p.photos.filter((_, j) => j !== i));
  }
  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!n) {
      debugSkinWise("form.submit.blocked", { reason: "missing_photo" });
      return flash("photo", stageRef.current, "Add at least one photo.");
    }
    if (!body) {
      debugSkinWise("form.submit.blocked", { reason: "missing_body_area" });
      return flash("body", bodyRef.current, "Choose the affected area.");
    }
    debugSkinWise("form.submit.validated", { photoCount: n, symptomCount: symptoms.length, hasNotes: !!description.trim() });
    p.onSubmit();
  }

  const hint = !n ? "Add a photo to continue." : !body ? "Choose the affected area to continue." : "Your photos and details are analyzed on the SkinWise server.";

  return (
    <form id="form" className="cap" noValidate onSubmit={submit}>
      <input id="cap-file" className="sr cap-input" type="file" accept="image/jpeg,image/png,image/webp" multiple
        onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }} />

      <div className="cap-main">
        <div className="cap-photos">
          <div ref={stageRef} className={clsx("cap-stage", n > 0 && "has-photo", over && "over", nudge === "photo" && "cap-nudge")}
            onDragEnter={(e) => { e.preventDefault(); setOver(true); }} onDragOver={(e) => { e.preventDefault(); setOver(true); }}
            onDragLeave={(e) => { e.preventDefault(); if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(false); }}
            onDrop={(e) => { e.preventDefault(); setOver(false); addFiles(e.dataTransfer.files); }}>
            <div className="cap-corners" aria-hidden="true"><i /><i /><i /><i /></div>
            {shown ? (
              <>
                <div key={shown.url} className="cap-frame" style={{ "--n": 1 } as CSSProperties}>
                  <div className="cap-cell">
                    <img className="cap-bg" src={shown.url} alt="" aria-hidden="true" draggable={false} />
                    <img src={shown.url} alt={"Photo " + (Math.min(active, n - 1) + 1) + " of " + n} draggable={false} />
                  </div>
                </div>
                <div key={"s" + shown.url} className="cap-scanbox once" aria-hidden="true"><i /></div>
              </>
            ) : (
              <>
                <div className="cap-scanbox idle" aria-hidden="true"><i /></div>
                <label htmlFor="cap-file" className="cap-prompt">
                  <span className="cap-cam" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8a2 2 0 0 1 2-2h1.5l1-1.5h7L17.5 6H18a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" /><circle cx="12" cy="12.5" r="3.5" /></svg>
                  </span>
                  <strong>{over ? "Release to add your photo" : "Add a photo of the skin area"}</strong>
                  <span className="cap-pick">Choose photo</span>
                  <span className="cap-fine">Well-lit and in focus. JPG, PNG or WEBP, up to {MAX_MB} MB each.</span>
                </label>
              </>
            )}
          </div>

          {n > 0 && (
            <div className="cap-thumbs">
              <ul>
                {p.photos.map((it, i) => (
                  <motion.li key={it.url} initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 380, damping: 28 }}>
                    <button type="button" className={clsx("cap-thumb", i === Math.min(active, n - 1) && "on")} aria-label={"Show photo " + (i + 1)} aria-pressed={i === Math.min(active, n - 1)} onClick={() => setActive(i)}>
                      <img src={it.url} alt="" draggable={false} />
                    </button>
                    <button type="button" className="cap-x" aria-label={"Remove photo " + (i + 1)} onClick={() => remove(i)}>×</button>
                  </motion.li>
                ))}
                {n < MAX_FILES && (
                  <li>
                    <label htmlFor="cap-file" className="cap-add" aria-label="Add another photo">
                      <svg aria-hidden="true" viewBox="0 0 20 20" width="18" height="18" fill="none"><path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
                    </label>
                  </li>
                )}
              </ul>
              <span className="cap-count" aria-hidden="true">{n} of {MAX_FILES}</span>
            </div>
          )}
        </div>

        <div className="cap-side">
          <fieldset ref={bodyRef} className={clsx("cap-field", nudge === "body" && "cap-nudge-soft")}>
            <legend>Affected area <span className="cap-req">Required</span></legend>
            <div className="cap-chips" role="radiogroup" aria-label="Affected area">
              {BODY_AREAS.map((a) => (
                <button key={a} type="button" role="radio" aria-checked={body === a} className="cap-chip" onClick={() => set({ body: a })}>{a}</button>
              ))}
            </div>
          </fieldset>

          <fieldset className="cap-field">
            <legend>Symptoms <span className="cap-opt">{symptoms.length ? symptoms.length + " selected" : "Optional"}</span></legend>
            <div className="cap-chips">
              {SYMPTOMS.map((s) => (
                <button key={s} type="button" aria-pressed={symptoms.includes(s)} className="cap-chip"
                  onClick={() => set({ symptoms: symptoms.includes(s) ? symptoms.filter((x) => x !== s) : [...symptoms, s] })}>{s}</button>
              ))}
            </div>
          </fieldset>

          <div className="cap-field">
            <label htmlFor="cap-desc">Anything else? <span className="cap-opt">Optional</span></label>
            <textarea id="cap-desc" rows={2} maxLength={MAX_DESC} value={description} placeholder="How long has it been there? Does it spread?"
              onChange={(e) => set({ description: e.target.value })} />
          </div>
        </div>
      </div>

      <div className="cap-actions">
        <button className={clsx("cap-go", ready && "ready")} type="submit" aria-describedby="hint">
          <span>Analyze my skin</span>
          <svg aria-hidden="true" viewBox="0 0 20 20" width="17" height="17" fill="none"><path d="M4 10h11m-4-4 4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <p className={clsx("cap-note", !ready && "need")} id="hint" aria-live="polite">
          <svg aria-hidden="true" viewBox="0 0 20 20" width="15" height="15" fill="none"><circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" /><path d="M10 9v5M10 6.2v.1" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
          <span>{hint}</span>
        </p>
      </div>
    </form>
  );
}
