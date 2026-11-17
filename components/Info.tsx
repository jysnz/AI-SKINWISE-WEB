"use client";
import { Accordion } from "@base-ui/react/accordion";
import { motion } from "motion/react";
import { FAQ } from "@/lib/content";

const ease = [0.22, 1, 0.36, 1] as const;
const reveal = { initial: { opacity: 0, y: 16 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: "-50px" }, transition: { duration: .5, ease } };

export function AccordionList({ items, defaultOpen = [] }: { items: { id: string; title: string; body: React.ReactNode }[]; defaultOpen?: string[] }) {
  return <Accordion.Root className="acc" multiple defaultValue={defaultOpen}>
    {items.map((it) => <Accordion.Item key={it.id} value={it.id} className="acc-item">
      <Accordion.Header className="acc-h"><Accordion.Trigger className="acc-trigger">{it.title}<span className="acc-icon" aria-hidden="true" /></Accordion.Trigger></Accordion.Header>
      <Accordion.Panel className="acc-panel"><div className="acc-body">{it.body}</div></Accordion.Panel>
    </Accordion.Item>)}
  </Accordion.Root>;
}

export default function Info() {
  const steps = [
    { title: "Choose clear photos", text: "Upload 1–3 JPG, PNG, or WEBP photos in good light. Each photo can be up to 10 MB.", tag: "YOUR INPUT" },
    { title: "Prepare each image", text: "The server validates each photo, converts it to RGB, resizes it to 224 × 224 pixels, and normalizes the image values.", tag: "IMAGE PREPARATION" },
    { title: "Compare visual patterns", text: "The model scores 11 classes for each photo. When you add multiple photos, their class scores are averaged.", tag: "AI CLASSIFICATION" },
    { title: "Review the estimate", text: "See the top visual match and its confidence. The model does not use symptoms or body location and does not provide treatment advice.", tag: "RESULT" },
  ];
  return <section id="how" className="how-section">
    <motion.div className="section-heading" {...reveal}>
      <span className="section-eyebrow">HOW YOUR SKIN CHECK WORKS</span>
      <h2>From your photo to clear next steps.</h2>
      <p>Here is what happens to your photos, and what the visual model does not assess.</p>
    </motion.div>
    <div className="how-grid">
      {steps.map((step, i) => <motion.article key={step.title} {...reveal} transition={{ ...reveal.transition, delay: i * .06 }}>
        <div className="how-step-top"><span className="how-number">0{i + 1}</span><span className="how-tag">{step.tag}</span></div>
        <h3>{step.title}</h3><p>{step.text}</p>
      </motion.article>)}
    </div>
    <p className="how-disclaimer">A confidence score below 80% is marked low confidence. This is a visual estimate, not a diagnosis or treatment recommendation.</p>
  </section>;
}

export function Faq() {
  return <section id="faq" className="faq-section">
    <motion.div className="faq-intro" {...reveal}>
      <span className="section-eyebrow">GOOD QUESTIONS</span>
      <h2>A little more<br />peace of mind.</h2>
      <p>A few things to know before you begin your skin check.</p>
    </motion.div>
    <motion.div className="faq-content" {...reveal}>
      <AccordionList items={[
        { id: "f0", title: "Can AI-SKINWISE diagnose my condition?", body: <p>No. It provides educational screening insights, not a medical diagnosis. Consult a healthcare professional to confirm the cause and discuss treatment.</p> },
        { id: "f1", title: "What makes a good photo?", body: <p>Use natural light, keep the affected area in focus, and avoid filters. Take a few photos from slightly different angles if needed.</p> },
        { id: "f2", title: "What information does the model use?", body: <p>It analyzes the photos only. It does not use symptoms or body location, and it does not provide treatment advice.</p> },
        { id: "f3", title: "What if my condition is not listed?", body: <p>The model only compares against the conditions shown here. A result cannot rule out other causes, so contact a healthcare professional if you are concerned.</p> },
        { id: "f4", title: "What should I know before uploading a photo?", body: <p>Only upload a photo you are comfortable sharing for analysis. Seek urgent medical care for rapidly spreading redness, severe pain, fever, or a rash near the eyes.</p> },
      ]} defaultOpen={["f0"]} />
    </motion.div>
  </section>;
}
