"use client";
import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "motion/react";
import { useReducedMotion } from "@/lib/hooks";
import NumberFlow from "@number-flow/react";

/** Paired phone preview shows the photo scan and the guidance screen together. */
export default function DemoPanel() {
  const [pct, setPct] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.25 });
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) { setPct(72); return; }
    if (!inView) return;
    let seconds = 0;
    const id = setInterval(() => {
      seconds += 0.25;
      if (seconds > 5) seconds = 0;
      setPct(Math.round(8 + 84 * (1 - Math.exp(-seconds / 3))));
    }, 250);
    return () => clearInterval(id);
  }, [inView, reduced]);

  return (
    <div className="device-pair" ref={ref} role="img" aria-label="Two phone previews: one scans a skin photo and the other shows an example result with guidance">
      <motion.div className="device-wrap device-wrap--scan" aria-hidden="true"
        initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
        <div className="device">
          <div className="device-screen">
            <span className="device-notch" />
            <div className="device-status"><span>9:41</span><span>•••</span></div>
            <div className="device-appbar"><span className="device-back">‹</span><strong>Skin check</strong><span className="device-menu">···</span></div>
            <div className="device-content">
              <div className="device-photo">
                <div className="device-skin" />
                <span className="device-corner dc-tl" /><span className="device-corner dc-tr" />
                <span className="device-corner dc-bl" /><span className="device-corner dc-br" />
                <motion.i className="device-scanline" animate={reduced ? { opacity: 0 } : { top: ["8%", "92%"], opacity: [0, 1, 1, 0] }} transition={reduced ? undefined : { duration: 2.2, repeat: Infinity, ease: "easeInOut" }} />
                <span className="device-photo-caption">Photo preview</span>
              </div>
              <div className="device-context"><span>Body area</span><b>Arm</b><i>Itchy</i></div>
              <div className="device-analysis">
                <div className="device-analysis-title"><i /> Analyzing photo</div>
                <div className="device-progress"><i style={{ width: pct + "%" }} /></div>
                <div className="device-progress-meta"><span>Photo and symptoms</span><b><NumberFlow value={pct} suffix="%" /></b></div>
              </div>
            </div>
            <div className="device-home"><i /></div>
          </div>
        </div>
      </motion.div>

      <motion.div className="device-wrap device-wrap--result" aria-hidden="true"
        initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.75, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}>
        <div className="device">
          <div className="device-screen">
            <span className="device-notch" />
            <div className="device-status"><span>9:41</span><span>•••</span></div>
            <div className="device-appbar"><span className="device-back">‹</span><strong>Scan guidance</strong><span className="device-menu">···</span></div>
            <div className="device-content device-result-content">
              <div className="device-result-photo"><div className="device-skin-mini" /><span>Example scan</span></div>
              <p className="device-result-label">Example result</p>
              <h3>Possible match</h3>
              <div className="device-match"><span>Ringworm</span><b>87%</b></div>
              <p className="device-result-note">An estimate from a photo and symptoms. This is not a diagnosis.</p>
              <div className="device-guidance"><i />
                <div><b>Next step</b><span>Read about common signs and when to contact a dermatologist.</span></div>
              </div>
              <div className="device-button">View guidance</div>
            </div>
            <div className="device-home"><i /></div>
          </div>
        </div>
      </motion.div>
      <p className="device-pair-note">A scan, from photo to guidance</p>
    </div>
  );
}
