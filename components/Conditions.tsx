"use client";
import { motion } from "motion/react";
import { CONDITIONS } from "@/lib/content";

const CATEGORY: Record<string, string> = {
  "Acne": "Inflammatory", "Athlete's Foot": "Fungal", Cellulitis: "Bacterial", Chickenpox: "Viral",
  "Cutaneous Larva Migrans": "Parasitic", Impetigo: "Bacterial", "Nail Fungus": "Fungal", Ringworm: "Fungal", Shingles: "Viral",
};
const DESCRIPTIONS: Record<string, string> = {
  "Acne": "Breakouts, blackheads, and inflamed spots.", "Athlete's Foot": "Itchy, peeling skin, often between the toes.",
  Cellulitis: "Red, swollen skin that may feel warm or painful.", Chickenpox: "An itchy rash with fluid-filled blisters.",
  "Cutaneous Larva Migrans": "Itchy, winding tracks beneath the skin.", Impetigo: "Sores or blisters that can form a golden crust.",
  "Nail Fungus": "Discolored, thickened, or brittle nails.", Ringworm: "A ring-shaped rash that may be itchy or scaly.", Shingles: "A painful, blistering rash, often on one side.",
};

export default function Conditions() {
  const conditions = CONDITIONS.filter((item) => item.n !== "Normal skin");
  return <motion.section id="conditions" className="conditions-section" aria-labelledby="conditions-title" initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: .5, ease: [0.22, 1, 0.36, 1] }}>
    <div className="conditions-heading">
      <div><span className="section-eyebrow">WHAT AI-SKINWISE COVERS</span><h2 id="conditions-title">Nine conditions. One place to start.</h2><p>Explore the skin, foot, and nail concerns included in our AI-powered screening.</p></div>
      <span className="conditions-count">09 CONDITIONS</span>
    </div>
    <div className="conditions-grid">
      {conditions.map((condition, i) => <article className="condition-tile" key={condition.n}>
        <div className="condition-tile-top"><span>{String(i + 1).padStart(2, "0")}</span><i>{CATEGORY[condition.n]}</i></div>
        <h3>{condition.n}</h3><p>{DESCRIPTIONS[condition.n] ?? condition.d}</p>
      </article>)}
    </div>
    <p className="conditions-note">Symptoms can overlap. A photo alone cannot confirm a condition or rule out other causes.</p>
  </motion.section>;
}
