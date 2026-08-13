"use client";

import { ArrowLeft, Download, Maximize2, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import styles from "./design-system.module.css";

export default function DesignSystemPage() {
  const [canvasKey, setCanvasKey] = useState(0);

  return (
    <main className={styles.page}>
      <header className={styles.toolbar}>
        <div className={styles.identity}>
          <Link href="/" aria-label="Back to interactive demo"><ArrowLeft size={20} /></Link>
          <div><span>WEATHER SYSTEM</span><strong>V0.5 Component Canvas</strong></div>
        </div>
        <div className={styles.actions}>
          <button onClick={() => setCanvasKey((value) => value + 1)}><RotateCcw size={17} /> Replay motion</button>
          <a href="/weather-design-system-v0.5.svg" target="_blank" rel="noreferrer"><Maximize2 size={17} /> Open SVG</a>
          <a className={styles.primary} href="/weather-design-system-v0.5.svg" download><Download size={17} /> Download</a>
        </div>
      </header>
      <section className={styles.viewport} aria-label="Scrollable design system canvas">
        <object key={canvasKey} data="/weather-design-system-v0.5.svg" type="image/svg+xml" aria-label="Weather V0.5 animated SVG design system canvas">
          <a href="/weather-design-system-v0.5.svg">Open the SVG component canvas</a>
        </object>
      </section>
      <footer className={styles.note}><span>2400 × 1900 SVG</span><span>Scroll to inspect · Use Open SVG for native zoom</span><span>Motion respects reduced-motion settings</span></footer>
    </main>
  );
}
