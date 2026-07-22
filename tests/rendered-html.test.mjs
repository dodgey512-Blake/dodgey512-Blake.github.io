import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("exports the Weather V0.4 product and design-system routes", async () => {
  const [home, designSystem, svg] = await Promise.all([
    readFile(new URL("../out/index.html", import.meta.url), "utf8"),
    readFile(new URL("../out/design-system/index.html", import.meta.url), "utf8"),
    readFile(new URL("../out/weather-design-system-v0.4.svg", import.meta.url), "utf8"),
  ]);
  assert.match(home, /Weather V0\.4/);
  assert.match(home, /Know the sky\./);
  assert.match(home, /Build my weather/);
  assert.match(designSystem, /V0\.4 Component Canvas/);
  assert.match(svg, /Weather V0\.4 design system canvas/);
  assert.match(svg, /@keyframes rain/);
});

test("keeps one fixed app shell, readable type and complete interaction flow", async () => {
  const [page, css, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);
  for (const screen of ["welcome", "setup", "home", "planner", "storm", "run", "feedback", "modules", "profile"]) {
    assert.match(page, new RegExp(`data-screen=\\"${screen}\\"`));
  }
  assert.match(page, /weather-demo-v04/);
  assert.match(page, /lucide-react/);
  assert.match(page, /design-system/);
  assert.doesNotMatch(page, /scrollIntoView/);
  assert.match(css, /grid-template-rows: auto minmax\(0, 1fr\) auto/);
  assert.match(css, /--type-body: 16px/);
  assert.match(css, /--tap-target: 44px/);
  assert.match(css, /\.bottom-nav \{[\s\S]*position: relative/);
  assert.match(css, /@keyframes lightningFlash/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.doesNotMatch(packageJson, /vinext|wrangler|react-loading-skeleton/);
});
