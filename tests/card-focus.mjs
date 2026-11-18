import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";

const css=readFileSync(new URL("../src/theme.ts",import.meta.url),"utf8");
const dashboard=readFileSync(new URL("../src/Dashboard.tsx",import.meta.url),"utf8");

const rules=(selector)=>[...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  .filter(([,head])=>head.trim()===selector)
  .map(([,head,body])=>body);
const lastRule=(selector)=>{
  const found=rules(selector);
  assert.ok(found.length>0,"Missing selector: "+selector);
  return found.at(-1);
};

test("game cover has no always-on border/glow when idle or merely selected",()=>{
  assert.doesNotMatch(css,/\.gl-game\.gl-selected\s+\.gl-poster\s*\{/,
    "Selected game may change hero details but must not have a permanent ring");
  assert.doesNotMatch(dashboard,/gl-selected/,
    "The selected cover should not be given a visual focus class");
  const posterRules=rules(".gl-poster");
  assert.ok(posterRules.length>=2,"Both base and Midnight poster styles must be audited");
  for(const body of posterRules){
    assert.match(body,/border:0;/,"Idle poster must have no border");
    assert.match(body,/box-shadow:none;/,"Idle poster must not glow");
  }
  assert.match(dashboard,/className="gl-game"/);
  assert.match(dashboard,/onGamepadFocus=\{onSelect\}/,
    "Focus still updates selected game's artwork and details");
});

test("controller focus gives the poster its existing high contrast ring",()=>{
  const focused=lastRule(".gl-game.gl-focused .gl-poster");
  assert.match(focused,/box-shadow:0 0 0 3px #fff,0 0 22px #03a7ff;/);
  assert.match(css,/\.gl-game\.gl-focused\s*\{\s*transform:translateY\(-2px\)/);
  assert.match(dashboard,/focusClassName="gl-focused"/);
  assert.match(dashboard,/noFocusRing/);
  const posterRules=rules(".gl-poster");
  assert.ok(posterRules.every(x=>!x.includes("!important")),
    "Idle rules must never override a focused card's ring");
});

test("View More tile has no idle/hover glow, only a real focus ring",()=>{
  const tile=rules(".gl-view-more").find(body=>body.includes("background:linear-gradient(145deg,"));
  assert.ok(tile,"The main View More tile background rule must exist");
  assert.match(tile,/border:0;/);
  assert.match(tile,/box-shadow:none;/);
  assert.doesNotMatch(css,/\.gl-view-more\.gl-focused,\.gl-view-more:hover\s*\{/,
    "Hover without controller focus should not activate the glow");
  const focused=lastRule(".gl-view-more.gl-focused");
  assert.match(focused,/box-shadow:0 0 0 3px #e9faff,0 0 22px #26b9ff;/);
  assert.match(dashboard,/className="gl-view-more" noFocusRing focusClassName="gl-focused"/);
});

test("new focus-only styling does not touch Steam UI, settings, hero, grid sizing or tab logic",()=>{
  assert.doesNotMatch(css,/\.gl-game\.gl-selected/);
  assert.match(css,/\.gl-full-grid \.gl-game\s*\{display:block;width:100%;height:220px;/);
  assert.match(css,/\.gl-feature/);
  assert.doesNotMatch(dashboard,/\bselected=\{game\.id\s*===\s*selected\?\.id\}/);
  assert.match(dashboard,/const selected = shown\.find\(\(g\) => g\.id === selectedId\) \?\? shown\[0\]/);
});
