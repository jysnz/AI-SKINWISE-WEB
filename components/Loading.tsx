"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Progress } from "@base-ui/react/progress";
import NumberFlow from "@number-flow/react";
import type { Photo } from "@/lib/api";
import { useReducedMotion } from "@/lib/hooks";

// Mirrors what the server does: it enhances each photo, runs the model, then matches the symptoms (only when given).
const stagesFor = (hasSymptoms: boolean) => ["Enhancing photos", "Running AI analysis", hasSymptoms ? "Matching symptoms" : "Combining photo scores"];
// Progress eases toward 92% so it keeps moving but never claims to be finished.
const progressAt = (sec: number) => 8 + 84 * (1 - Math.exp(-sec / 6));

/** An animated doctor who sweeps a magnifying glass over the photos while the analysis runs. Pure SVG + CSS; static when motion is reduced. */
function DoctorScan() {
  return (
    <svg className="doc" viewBox="0 0 220 240" aria-hidden="true" focusable="false">
      <g className="doc-body">
        <path d="M58 240v-62c0-26 18-44 52-44s52 18 52 44v62z" fill="#fff" stroke="#cfe3f3" strokeWidth="2" />
        <path d="M92 136l18 34 18-34" fill="#0b6fb8" />
        <path d="M84 150c-8 22 0 44 20 46M136 150c8 22 0 44-20 46" fill="none" stroke="#103c61" strokeWidth="3" strokeLinecap="round" />
        <circle cx="104" cy="198" r="6" fill="#7fb4dc" stroke="#103c61" strokeWidth="2.5" />
        <rect x="124" y="168" width="22" height="14" rx="3" fill="#e8f2fb" />
        <circle cx="110" cy="104" r="30" fill="#f1c9a5" />
        <path d="M80 100c0-22 14-32 30-32s30 10 30 32c-8-12-18-16-30-16s-22 4-30 16z" fill="#2a2f3a" />
        <rect x="90" y="52" width="40" height="18" rx="9" fill="#e8f2fb" stroke="#7fb4dc" strokeWidth="2" />
        <path d="M105 56h10M110 51v10" stroke="#0b6fb8" strokeWidth="3" strokeLinecap="round" />
        <g className="doc-eyes"><ellipse cx="99" cy="106" rx="3" ry="4" fill="#1d2430" /><ellipse cx="121" cy="106" rx="3" ry="4" fill="#1d2430" /></g>
        <path d="M101 119q9 7 18 0" fill="none" stroke="#9a5b3f" strokeWidth="2.5" strokeLinecap="round" />
      </g>
      <g className="doc-arm">
        <path d="M70 160L28 112" stroke="#fff" strokeWidth="22" strokeLinecap="round" />
        <path d="M70 160L28 112" stroke="#cfe3f3" strokeWidth="2" strokeLinecap="round" opacity=".0" />
        <circle cx="24" cy="106" r="10" fill="#f1c9a5" />
        <path d="M22 100L6 78" stroke="#103c61" strokeWidth="6" strokeLinecap="round" />
        <circle cx="-6" cy="58" r="30" fill="rgba(160,220,255,.28)" stroke="#103c61" strokeWidth="6" />
        <path d="M-22 48a20 20 0 0 1 14-14" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" className="doc-glint" />
      </g>
    </svg>
  );
}

export default function Loading({ photos, hasSymptoms, onCancel }: { photos: Photo[]; hasSymptoms: boolean; onCancel: () => void }) {
  const rm = useReducedMotion();
  const STAGES = stagesFor(hasSymptoms);
  const [pct, setPct] = useState(8);
  const [label, setLabel] = useState(8); // the number ticks once a second so it reads calmly; the bar moves smoothly
  const [stage, setStage] = useState(0);
  const [slow, setSlow] = useState(false);
  const pillRef = useRef<HTMLSpanElement>(null);
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
  useEffect(() => {
    if (!rm) pillRef.current?.animate([{ transform: "translateY(5px)", opacity: 0.3 }, { transform: "none", opacity: 1 }], { duration: 240, easing: "ease-out" });
  }, [stage, rm]);

  return (
    <section className="cap-loading" aria-live="polite">
      <div className="cap-stage has-photo locked" aria-hidden="true">
        <div className="cap-corners"><i /><i /><i /><i /></div>
        <div className="cap-frame" style={{ "--n": Math.max(1, shown.length) } as CSSProperties}>
          {shown.map((p) => (
            <div key={p.url} className="cap-cell">
              <img className="cap-bg" src={p.url} alt="" draggable={false} />
              <img src={p.url} alt="" draggable={false} />
            </div>
          ))}
        </div>
        <div className="cap-scanbox loop"><i /></div>
        <DoctorScan />
        <div className="cap-pill"><b /><span ref={pillRef}>{STAGES[stage]}</span></div>
      </div>
      <strong className="sr">Analyzing your photos. {STAGES[stage]}.</strong>
      <Progress.Root className="cap-bar" value={pct} aria-label="Analysis progress">
        <Progress.Track className="cap-track"><Progress.Indicator className="cap-fill" /></Progress.Track>
        <span className="cap-pct"><NumberFlow value={label} suffix="%" /></span>
      </Progress.Root>
      <p className="cap-slow" data-show={slow || undefined}>{slow ? "The server is waking up. This can take up to a minute." : " "}</p>
      <button className="cap-cancel" type="button" onClick={onCancel}>Cancel</button>
    </section>
  );
}
