"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, useScroll, useSpring, useMotionValueEvent } from "motion/react";
import clsx from "clsx";
import { NAV } from "@/lib/content";
import { useScrollSpy } from "@/lib/hooks";

const ids = NAV.map((n) => n.id);

export default function Header() {
  const path = usePathname();
  // Lets tests and the video renderer know the page is interactive.
  useEffect(() => { document.documentElement.dataset.hydrated = "1"; }, []);
  const home = path === "/";
  const { scrollY, scrollYProgress } = useScroll();
  const prog = useSpring(scrollYProgress, { stiffness: 140, damping: 28, restDelta: 0.001 });
  const [scrolled, setScrolled] = useState(false);
  useMotionValueEvent(scrollY, "change", (v) => setScrolled(v > 8));
  const active = useScrollSpy(home ? ids : []);
  return (
    <header className={clsx("topbar", scrolled && "scrolled")}>
      {home && <motion.i className="scroll-prog" style={{ scaleX: prog }} aria-hidden="true" />}
      <div className="wrap topbar-in">
        <Link className="brand" href="/"><img src="/assets/app_logo.png" alt="" width={30} height={30} /><span>AI-SKINWISE</span></Link>
        {home && (
          <nav className="nav" aria-label="Sections">
            {NAV.map((n) => (
              <a key={n.id} href={"#" + n.id} className={clsx(active === n.id && "active")} aria-current={active === n.id ? "location" : undefined}>{n.label}</a>
            ))}
          </nav>
        )}
        <div className="top-actions">
          {home ? <Link className="pill sm" href="/scan">Start a skin check <span aria-hidden="true">↗</span></Link> : <Link className="nav-back" href="/">Home</Link>}
        </div>
      </div>
    </header>
  );
}
