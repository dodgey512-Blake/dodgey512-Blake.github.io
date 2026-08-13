import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("exports the V0.8 MVP and retains the historical V0.5 component canvas", async () => {
  const [home, designSystem, svg] = await Promise.all([
    read("../out/index.html"),
    read("../out/design-system/index.html"),
    read("../out/weather-design-system-v0.5.svg"),
  ]);
  assert.match(home, /Weather V0\.8/);
  assert.match(home, /Decide with the weather/);
  assert.match(designSystem, /V0\.5 Component Canvas/);
  assert.match(svg, /Weather V0\.5 design system canvas/);
});

test("implements the complete MVP decision loop and constrained scope", async () => {
  const [page, weather, scene] = await Promise.all([
    read("../app/page.tsx"),
    read("../app/weather.ts"),
    read("../app/WeatherScene.tsx"),
  ]);
  for (const screen of ["welcome", "location", "home", "forecast", "alert", "outfit", "plan", "editor", "analysis", "confirm", "change", "feedback", "settings"]) {
    assert.match(page, new RegExp(`data-screen=\\"${screen}\\"`));
  }
  for (const event of ["weather_loaded", "run_plan_created", "recommendation_decided", "run_feedback_submitted", "ootd_feedback"]) assert.match(page, new RegExp(event));
  assert.match(page, /does not claim to write Calendar, Watch or another service/);
  assert.match(page, /Scenario preview/);
  assert.match(page, /No account\. No cloud profile/);
  assert.match(weather, /api\.weather\.gov\/points/);
  assert.match(weather, /api\.weather\.gov\/alerts\/active/);
  assert.match(weather, /state: "fallback"/);
  assert.match(scene, /M8 1C8 1 1\.5 9\.2 1\.5 13\.6a6\.5 6\.5 0 0 0 13 0C14\.5 9\.2 8 1 8 1Z/);
  assert.doesNotMatch(page, /scrollIntoView/);
});

test("keeps fixed mobile regions, legible controls and reduced motion", async () => {
  const [css, pkg] = await Promise.all([read("../app/globals.css"), read("../package.json")]);
  assert.match(css, /\.fixed-screen \{ grid-template-rows: auto minmax\(0, 1fr\) auto/);
  assert.match(css, /\.app-screen \{ display: grid; grid-template-rows: minmax\(0, 1fr\) auto/);
  assert.match(css, /\.bottom-nav small \{ font-size: 13px/);
  assert.match(css, /min-height: 44px/);
  assert.match(css, /@keyframes droplet-fall/);
  assert.match(css, /@keyframes lightning-flash/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(pkg, /weather-personal-v08-mvp-demo/);
  assert.doesNotMatch(pkg, /weatherapi|openweathermap|tomorrow\.io/i);
});
