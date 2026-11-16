import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";

const ui=readFileSync(new URL("../src/Dashboard.tsx",import.meta.url),"utf8");
const css=readFileSync(new URL("../src/theme.ts",import.meta.url),"utf8");

test("focus opens navigation and returning to games collapses it",()=>{
  assert.match(ui,/const \[railExpanded, setRailExpanded\] = useState\(false\)/);
  assert.match(ui,/onGamepadFocus=\{\(\) => \{ setRailIndex\(index\); setRailExpanded\(true\); \}\}/);
  assert.match(ui,/const focusRail = \(index: number\) => \{[\s\S]*?setRailExpanded\(true\);[\s\S]*?railRefs\.current\[target\]\?\.focus\(\);/);
  assert.match(ui,/const goToGame = \(index\?: number\) => \{\s*setRailExpanded\(false\);/);
  assert.match(ui,/onFocusCapture=\{event => \{[\s\S]*?sidebarRef\.current\?\.contains\(event\.target as Node\)/);
});

test("rail expansion changes flex layout rather than covering game content",()=>{
  assert.match(css,/--gl-nav-closed-width:\s*76px/);
  assert.match(css,/--gl-nav-open-width:\s*218px/);
  assert.match(css,/\.gl-root\.gl-nav-expanded \.gl-sidebar\s*\{[\s\S]*?flex-basis:var\(--gl-nav-open-width\)/);
  assert.match(css,/transition:[\s\S]*?width var\(--gl-nav-motion\)/);
  assert.doesNotMatch(css,/\.gl-root\.gl-nav-expanded \.gl-sidebar\s*\{[^}]*?position:fixed/);
});

test("labels are inline in the expanded rail, not floating tooltip popups",()=>{
  assert.match(css,/\.gl-root \.gl-rail \.gl-rail-label[\s\S]*?position:static/);
  assert.match(css,/\.gl-root\.gl-nav-expanded \.gl-rail \.gl-rail-label\s*\{[^}]*?opacity:1/);
  assert.match(css,/@media \(prefers-reduced-motion:reduce\)/);
  assert.match(ui,/<span className="gl-rail-label">\{action\.label\}<\/span>/);
});
