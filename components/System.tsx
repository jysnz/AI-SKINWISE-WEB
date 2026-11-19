"use client";
import { useState } from "react";
import clsx from "clsx";
import { motion } from "motion/react";

// Every line below was checked against the code in C:\Projects\AI-SKINWISE (user app, derma app, server).
// Do not add counts or claims that are not in the code, see AGENT.md.
//
// SCREENSHOTS: each phone shows the active step's `img`, or the lane's own screen (PATIENT_SCREEN / CLINIC_SCREEN below)
// when that step has none. To add one, drop the portrait image (about 1080 x 2300, status bar cropped) in
// public/screens/system/ and add `img: "/screens/system/<name>.jpg"` to the step. No screenshot at all = blank phone.
type Step = { t: string; d: string; img?: string };

const PATIENT: Step[] = [
  { t: "Create an account", d: "Sign up with an email code or Google. Log in with email and password, or Google. Reset a forgotten password with an email code." },
  { t: "Scan the concern", d: "Take or choose a photo, then add the affected area and symptoms. The server checks them against the photo." },
  { t: "Read the result", d: "See the likely condition and its confidence. If the model is not confident enough, the app asks for a clearer photo instead of guessing. Results stay in your history." },
  { t: "Find a clinic", d: "Search for clinics, read their details and browse the services each one offers.", img: "/screens/system/patient-find-clinic.jpg" },
  { t: "Request a booking", d: "Choose Onsite or Online and attach your scan report when you start from a result. Follow it as Awaiting approval, Approved, Completed, Rejected or Cancelled." },
  { t: "Pay", d: "Once the clinic confirms and sets the fee, pay by GCash, card or Maya through PayMongo. A paid visit can be cancelled with a refund request." },
  { t: "Consult", d: "Online visits open a Google Meet link after payment. Chat with the clinic any time and share photos, videos and files." },
  { t: "After the visit", d: "Open your prescription, follow-up plan and payment receipt in the app." },
  { t: "Shop", d: "Order products from a clinic. Check out with cash or online payment, then track the order." },
];

const CLINIC: Step[] = [
  { t: "Register or join", d: "Register a new clinic, or join an existing one as staff. Verify with an email code." },
  { t: "Set up the clinic", d: "Add the profile and photo, weekly hours, and the services you offer with their coverage." },
  { t: "Manage staff", d: "Add staff and give each a role, so everyone sees only what their role needs." },
  { t: "Review requests", d: "Open each booking request with the patient's scan report. Assign a dermatologist, confirm and set the fee, or reject. Handle reschedules and see it all on the month calendar." },
  { t: "Get paid", d: "Follow payments in Transactions. Once a patient pays, the visit is ready and online visits get their Meet link." },
  { t: "See patients", d: "Add walk-ins, open patient cases and records, and answer chats in an inbox with Primary and Requests tabs." },
  { t: "Treat and follow up", d: "Write signed PDF prescriptions, schedule follow-ups with an optional fee and complete the visit." },
  { t: "Decide on refunds", d: "Approve or reject the refund requests patients make for paid visits." },
  { t: "Run the shop", d: "List products with their stock, then track each order." },
  { t: "Review the numbers", d: "Read patient reviews and export PDF analytics and statements." },
];

const SERVER = [
  { t: "Skin analysis", d: "Runs the AI model on each photo and cross-checks symptoms and body area." },
  { t: "Accounts", d: "Sends email codes and registers clinics and their staff." },
  { t: "Payments", d: "Creates PayMongo checkouts and confirms each payment." },
  { t: "Refunds", d: "Carries a patient's refund request and the clinic's decision." },
  { t: "Meet links", d: "Creates the Google Meet link for online visits." },
];

const ease = [0.22, 1, 0.36, 1] as const;

// Screens are the real apps with the phone status bar cropped off. A step without its own screenshot keeps showing the lane's `fallback`.
const PATIENT_SCREEN = { src: "/screens/system/patient-find-clinic.jpg", alt: "Patient app: clinics near you on a map, with partnered clinics below" };
const CLINIC_SCREEN = { src: "/screens/system/clinic-dashboard.jpg", alt: "Clinic admin app: home with balance, Schedule, Services, Clients, Walk-in, Products, Staffs, Reviews and today's appointments" };

function Phone({ src, alt, label }: { src?: string; alt: string; label: string }) {
  return (
    <div className="sys-phone" role={src ? undefined : "img"} aria-label={src ? undefined : label + " screen, screenshot coming soon"}>
      <div className="sys-screen">
        {src && <img key={src} src={src} alt={alt} width={1080} height={2300} draggable={false} />}
      </div>
    </div>
  );
}

function Lane({ side, tag, title, sub, steps, screen, start = 0 }: { side: "patient" | "clinic"; tag: string; title: string; sub: string; steps: Step[]; screen: { src: string; alt: string }; start?: number }) {
  const [active, setActive] = useState(start);
  const own = steps[active].img;
  return (
    <motion.div className={"sys-lane " + side} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.65, ease }}>
      <div className="sys-phone-wrap"><Phone src={own ?? screen.src} alt={own ? screen.alt : screen.alt} label={tag} /></div>
      <header>
        <span className="sys-tag">{tag}</span>
        <h3>{title}</h3>
        <p>{sub}</p>
      </header>
      <ol>
        {steps.map((s, i) => (
          <li key={s.t}>
            <button type="button" className={clsx("sys-step", i === active && "on")} aria-current={i === active ? "step" : undefined}
              onMouseEnter={() => setActive(i)} onFocus={() => setActive(i)} onClick={() => setActive(i)}>
              <span className="sys-n" aria-hidden="true">{i + 1}</span>
              <strong>{s.t}</strong>
              <span className="sys-d">{s.d}</span>
            </button>
          </li>
        ))}
      </ol>
    </motion.div>
  );
}

export default function System() {
  return (
    <section id="system" className="system-section" aria-labelledby="system-title">
      <div className="section-heading system-heading">
        <h2 id="system-title">One system, from first photo to follow-up.</h2>
        <p>Patients use the SkinWise app. Clinics and their staff run everything from the clinic admin app. A shared server connects the two.</p>
      </div>

      <div className="sys-lanes">
        <Lane side="patient" tag="Patient app" title="Start here as a patient" sub="Check a skin concern, then get care when you want it." steps={PATIENT} screen={PATIENT_SCREEN} start={3} />
        <Lane side="clinic" tag="Clinic admin" title="Then the clinic takes over" sub="For clinics, dermatologists and their staff." steps={CLINIC} screen={CLINIC_SCREEN} />
      </div>

      <motion.div className="sys-server" initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }} transition={{ duration: 0.6, ease }}>
        <h3>Behind both apps</h3>
        <ul>
          {SERVER.map((s) => <li key={s.t}><strong>{s.t}</strong><span>{s.d}</span></li>)}
        </ul>
      </motion.div>
    </section>
  );
}
