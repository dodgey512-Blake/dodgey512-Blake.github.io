import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("exports the Weather V0.5 product and both design-system assets", async () => {
  const [home, designSystem, svg] = await Promise.all([
    readFile(new URL("../out/index.html", import.meta.url), "utf8"),
    readFile(new URL("../out/design-system/index.html", import.meta.url), "utf8"),
    readFile(new URL("../out/weather-design-system-v0.5.svg", import.meta.url), "utf8"),
  ]);
  assert.match(home, /Weather V0\.5/);
  assert.match(home, /Know the sky\./);
  assert.match(home, /Build my weather/);
  assert.match(designSystem, /V0\.5 Component Canvas/);
  assert.match(svg, /Weather V0\.5 design system canvas/);
  assert.match(svg, /@keyframes rain/);
});

test("keeps one fixed app shell and implements three product weather-motion states", async () => {
  const [page, css, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);
  for (const screen of ["welcome", "setup", "home", "planner", "storm", "run", "feedback", "modules", "profile"]) {
    assert.match(page, new RegExp(`data-screen=\\"${screen}\\"`));
  }
  assert.match(page, /weather-demo-v05/);
  assert.match(page, /lucide-react/);
  assert.match(page, /design-system/);
  assert.match(page, /data-weather-motion/);
  assert.match(page, /weather-topbar/);
  assert.match(page, /rain-ripples/);
  assert.match(page, /lightning-bolt/);
  assert.match(page, /Steady rain · Southwest wind 9 mph/);
  assert.match(page, /Thunder risk · Gusts reach 24 mph/);
  assert.doesNotMatch(page, /scrollIntoView/);
  assert.match(css, /grid-template-rows: auto minmax\(0, 1fr\) auto/);
  assert.match(css, /--type-body: 16px/);
  assert.match(css, /--tap-target: 44px/);
  assert.match(css, /\.bottom-nav \{[\s\S]*position: relative/);
  assert.match(css, /@keyframes lightningFlash/);
  assert.match(css, /@keyframes windSweep/);
  assert.match(css, /@keyframes rainRipple/);
  assert.match(css, /@keyframes lightningPath/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.doesNotMatch(packageJson, /vinext|wrangler|react-loading-skeleton/);
});
