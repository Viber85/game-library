import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";

const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const css=read("system-theme/settings-gamepad-focus.css");
const rules=css.replace(/\/\*[\s\S]*?\*\//g,"");
const backend=read("main.py");
const native=read("system-theme/settings.css");
const decky=read("system-theme/decky-settings.css");

test("Unified controller focus selector targets the ACTUAL left settings rail in both UIs",()=>{
  assert.match(css,/\.BasicUI \.Panel:has\(> \.PageListColumn\)/);
  assert.match(css,/\.BasicUI \.PageListColumn :is\(/);
  for(const token of [".Panel",".Focusable",".gpfocus",".gpfocuswithin",
    ":focus-visible",":focus-within",'[aria-selected="true"]',
    '[aria-current="page"]',"::before","::after"]){
    assert.ok(css.includes(token),"Missing Steam gamepad focus token "+token);
  }
  assert.ok(css.includes("background:#081425 !important;"),
    "Sidebar remains the existing deep navy");
  assert.ok(css.includes("background:#163a5e !important;"),
    "Focused/selected tab must remain the same Midnight blue in both Settings");
  assert.ok(css.includes("background:transparent !important;"),
    "Native brighter focus pseudo elements must not repaint on top");
  assert.ok(native.includes("background:#205180 !important;"),
    "Original native Settings blue is still present but must be overridden by final stylesheet");
  assert.ok(decky.includes("html:has(.BasicUI .PageListColumn):has(.BasicUI .DialogControlsSection)"),
    "The verified Decky v18 layout must not be modified by this shared fix");
});

test("No right-pane, route, watcher or timer prerequisite for gamepad focus",()=>{
  assert.doesNotMatch(rules,/DialogControlsSection|DialogContent|data-glm-|\/decky\/settings|setTimeout|setInterval|MutationObserver/);
  assert.doesNotMatch(rules,/:hover|:active\b/,"Touch and hover paths stay unmodified");
  assert.doesNotMatch(rules,/\.BasicUI \.Panel\s*\{/,
    "Never change global Steam or game artwork Panels");
  for(const [,selector,declarations] of rules.matchAll(/([^{}]+)\{([^{}]*)\}/g)){
    assert.match(selector,/(?:\.BasicUI \.PageListColumn|\.BasicUI \.Panel:has\(> \.PageListColumn\))/,
      "Every style must be strictly inside a native Settings navigation rail");
    assert.doesNotMatch(declarations,/\b(?:width|height|margin|padding|display|position|overflow|transform|pointer-events|z-index|opacity)\s*:/,
      "No controller geometry, hitbox or icon changes");
  }
  assert.doesNotMatch(rules,/#GamepadUI_Full_Root|#QuickAccess-Menu|#MainNavMenuContainer|:root\s*\{/);
});

test("Controller-specific focus and pseudo layers stay instant when React swaps right pane",()=>{
  assert.match(css,/transition-duration:0ms !important;/);
  assert.match(css,/animation-duration:0ms !important;/);
  assert.match(css,/transition:none !important;/);
  assert.match(css,/animation:none !important;/);
  assert.match(css,/:has\(> :is\(/,"Parent selected row covers focused descendants");
  for(const token of ["::before","::after"])
    assert.ok(css.includes(token),"Suppress Valve gamepad highlight "+token);
});

test("Shared Settings focus patch is preloaded AFTER Decky in main only, never QAM overlay",()=>{
  const main=backend.slice(backend.indexOf('"main": ('),backend.indexOf('"overlay": ('));
  const overlay=backend.slice(backend.indexOf('"overlay": ('),backend.indexOf("    result = {}"));
  assert.ok(main.includes('"settings-gamepad-focus.css"'));
  assert.ok(main.indexOf('"settings-gamepad-focus.css"')>
    main.indexOf('"decky-settings.css"'),"Shared focus override must win the cascade");
  assert.ok(!overlay.includes('"settings-gamepad-focus.css"'),
    "Never change Steam QAM/game-running overlay focus");
});
