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


test("reference glass topbar keeps Steam status bar native and shows active tab",()=>{
  assert.match(ui,/<header className="gl-header gl-library-topbar" aria-label="Game Library">/);
  assert.match(ui,/<span className="gl-topbar-title">Game Library<\/span>/);
  assert.match(ui,/<span className="gl-topbar-current" title=\{tab\.title\} aria-live="polite">\{tab\.title\}<\/span>/);
  assert.match(css,/\.gl-main > \.gl-header\.gl-library-topbar\s*\{[\s\S]*?display:flex/);
  assert.match(css,/\.gl-main > \.gl-header\.gl-library-topbar\s*\{[\s\S]*?backdrop-filter:blur\(13px\)/);
  assert.match(css,/\.gl-topbar-current\s*\{[\s\S]*?font-size:clamp\(20px,2\.1vw,27px\)/);
  assert.match(css,/\.gl-filterbar \.gl-pill\.gl-active\s*\{/);
  assert.doesNotMatch(ui,/Selected from your Steam library/);
  assert.doesNotMatch(ui,/<span className="gl-time">/);
  assert.doesNotMatch(ui,/MdSearch/);
  assert.match(ui,/className="gl-pill"/);
  assert.match(ui,/const cycleTab = \(direction: number\)/);
});
