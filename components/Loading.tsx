"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Progress } from "@base-ui/react/progress";
import NumberFlow from "@number-flow/react";
import type { Photo } from "@/lib/api";
import { useReducedMotion } from "@/lib/hooks";

const STAGES = ["Preparing photos", "Running visual analysis", "Combining photo scores"];
// Progress eases toward 92% so it keeps moving but never claims to be finished.
const progressAt = (sec: number) => 8 + 84 * (1 - Math.exp(-sec / 6));

export default function Loading({ photos, onCancel }: { photos: Photo[]; onCancel: () => void }) {
  const rm = useReducedMotion();
  const [pct, setPct] = useState(8);
  const [label, setLabel] = useState(8); // the number ticks once a second so it reads calmly; the bar moves smoothly
  const [stage, setStage] = useState(0);
  const [slow, setSlow] = useState(false);
  const noteRef = useRef<HTMLSpanElement>(null);
  const shown = photos.slice(0, 3);

  useEffect(() => {
    const t0 = performance.now();
    let lastSec = 0;
    const id = setInterval(() => {
      const sec = (performance.now() - t0) / 1000;
      setPct(progressAt(sec));
      if (Math.floor(sec) !== lastSec) { lastSec = Math.floor(sec); setLabel(Math.round(progressAt(sec))); }
      setStage(sec >= 3.5 ? 2 : sec >= 1.5 ? 1 : 0);
      setSlow(sec >= 15);
    }, 250);
    return () => clearInterval(id);
  }, []);
  const note = slow ? "The server is waking up. This can take up to a minute." : STAGES[stage];
  useEffect(() => {
    if (!rm) noteRef.current?.animate([{ transform: "translateY(5px)", opacity: 0.3 }, { transform: "none", opacity: 1 }], { duration: 240, easing: "ease-out" });
  }, [note, rm]);

  return (
    <section className="loading card" aria-live="polite">
      <div className="scan-stage" style={{ "--n": Math.max(1, shown.length) } as CSSProperties} aria-hidden="true">
        <ul>{shown.map((p) => <li key={p.url} className="ph"><img src={p.url} alt="" draggable={false} /></li>)}</ul>
        <i className="scan-line" />
      </div>
      <strong className="sr">Analyzing your photos</strong>
      <ol className="stages" aria-hidden="true">
        {STAGES.map((s, i) => <li key={s} className={i < stage ? "done" : i === stage ? "now" : ""}><span />{s}</li>)}
      </ol>
      <Progress.Root className="progress-row" value={pct} aria-label="Analysis progress">
        <Progress.Track className="progress"><Progress.Indicator className="progress-fill" /></Progress.Track>
        <span className="muted pct"><NumberFlow value={label} suffix="%" /></span>
      </Progress.Root>
      <span className="muted stage-txt" ref={noteRef}>{note}</span>
      <button className="cancel-btn" type="button" onClick={onCancel}>Cancel</button>
    </section>
  );
}
