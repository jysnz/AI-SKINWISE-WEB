"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, MotionConfig } from "motion/react";
import Info, { Faq } from "./Info";
import Conditions from "./Conditions";
import System from "./System";
import { useReveal } from "@/lib/hooks";

const ease = [0.22, 1, 0.36, 1] as const;
const Arrow = () => <span aria-hidden="true">↗</span>;

function ScanPreview() {
  return (
    <div className="skin-preview" aria-label="Illustrative skin scan preview">
      <img className="skin-halo" src="/figma/blue-halo.svg" alt="" />
      <div className="preview-devices">
        <motion.div className="preview-device-slot float a" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.5, ease }}>
          <div className="preview-phone"><div className="phone-live-screen">
            <img src="/screens/scan-details.jpg" alt="AI-SKINWISE app: photo ready, with affected area and symptoms selected" width={1080} height={2270} draggable={false} />
          </div></div>
        </motion.div>
        <motion.div className="preview-device-slot float b" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.68, ease }}>
          <div className="preview-phone"><div className="phone-live-screen">
            <img src="/screens/scan-result.jpg" alt="AI-SKINWISE app: possible condition result with a reminder to consult a dermatologist" width={1080} height={2270} draggable={false} />
          </div></div>
        </motion.div>
      </div>
      <span className="scan-sweep" aria-hidden="true" />
    </div>
  );
}

/** On phones a "Start a skin check" bar slides up once the hero is scrolled past, and steps aside at the final call to action. */
function StickyStart() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const hero = document.querySelector(".skinwise-hero"), end = document.querySelector(".skinwise-final-cta");
    if (!hero || !end) return;
    const seen = { hero: true, end: false };
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) { if (e.target === hero) seen.hero = e.isIntersecting; else seen.end = e.isIntersecting; }
      setShow(!seen.hero && !seen.end);
    }, { threshold: 0.05 });
    io.observe(hero); io.observe(end);
    return () => io.disconnect();
  }, []);
  return (
    <AnimatePresence>
      {show && (
        <motion.div className="sticky-start" initial={{ y: 90, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 90, opacity: 0 }} transition={{ type: "spring", stiffness: 380, damping: 34 }}>
          <Link href="/scan" className="skin-button">Start a skin check <Arrow /></Link>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const strip = { hidden: {}, shown: { transition: { staggerChildren: 0.1 } } };
const stripItem = { hidden: { opacity: 0, y: 18 }, shown: { opacity: 1, y: 0, transition: { duration: 0.6, ease } } };

const rise = (i: number) => ({
  hidden: { opacity: 0, y: 22 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.7, delay: 0.06 * i, ease } },
});

export default function Landing() {
  // The hero waits for the intro curtain to start lifting, then rises in a short stagger.
  const state = useReveal() ? "shown" : "hidden";
  return (
    <MotionConfig reducedMotion="user">
      <main className="skinwise-page" id="top">
        <section className="skinwise-hero">
          <motion.div className="skinwise-hero-copy" initial="hidden" animate={state}>
            <motion.span variants={rise(0)} className="hero-kicker"><i /> AI-POWERED SKIN INSIGHTS</motion.span>
            <motion.h1 variants={rise(1)}>Your skin.<br />A little more<br />understood.</motion.h1>
            <motion.p variants={rise(2)}>Noticed something new? Get an AI-powered first look at your skin concern and understand what to do next.</motion.p>
            <motion.div variants={rise(3)} className="hero-actions">
              <Link href="/scan" className="skin-button">Start a skin check <Arrow /></Link>
              <a href="#how" className="skin-button secondary">See how it works</a>
            </motion.div>
            <motion.small variants={rise(4)}>A first step, not a diagnosis. Always consult a healthcare professional.</motion.small>
          </motion.div>
          <motion.div className="skinwise-hero-art" initial={{ opacity: 0, y: 28, scale: 0.98 }} animate={state === "shown" ? { opacity: 1, y: 0, scale: 1 } : undefined} transition={{ duration: 0.9, delay: 0.18, ease }}>
            <ScanPreview />
          </motion.div>
        </section>

        <motion.section className="care-strip" aria-label="Our approach" variants={strip} initial="hidden" whileInView="shown" viewport={{ once: true, margin: "-40px" }}>
          <motion.div variants={stripItem}><strong><b>01</b> A simpler starting point</strong><span>Photos and symptoms. Clearer next steps.</span></motion.div>
          <motion.div variants={stripItem}><strong><b>02</b> Nine conditions covered</strong><span>Focused insights, not guesswork.</span></motion.div>
          <motion.div variants={stripItem}><strong><b>03</b> Your health comes first</strong><span>Guidance with its limits made clear.</span></motion.div>
        </motion.section>

        <div className="skinwise-content">
          <Info />
          <System />
          <Conditions />
          <section className="responsible-section" aria-labelledby="responsible-title">
            <div className="responsible-card">
              <div className="responsible-main">
                <span className="section-eyebrow">BUILT AROUND YOUR WELLBEING</span>
                <h2 id="responsible-title">Helpful insight.<br />Human care, always.</h2>
                <p>AI-SKINWISE helps you understand possibilities, not diagnose disease. A qualified professional is your partner in getting the right care.</p>
              </div>
              <div className="responsible-limits">
                <h3>Know the limits</h3>
                <p>Lighting, photo quality, and skin tone can affect AI results. Conditions outside our coverage may not be recognized.</p>
                <aside><strong>DON’T WAIT FOR AN AI RESULT</strong><p>Seek urgent medical care for rapidly spreading redness, severe pain, fever, or a rash near the eyes.</p></aside>
              </div>
            </div>
          </section>
          <Faq />
        </div>

        <motion.section className="skinwise-final-cta" initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.7, ease }}>
          <div><span className="section-eyebrow">YOUR NEXT STEP STARTS HERE</span><h2>Less wondering.<br />More understanding.</h2><p>Take a closer look at your skin, with a little help from AI-SKINWISE.</p></div>
          <Link href="/scan" className="skin-button">Start a skin check <Arrow /></Link>
        </motion.section>
        <footer className="skinwise-footer">
          <a className="footer-brand" href="#top">AI-SKINWISE</a>
          <p>A thoughtful first step for skin concerns.</p>
          <span>AI-SKINWISE provides general information, not a medical diagnosis.</span>
        </footer>
      </main>
      <StickyStart />
    </MotionConfig>
  );
}
