import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const view=read("src/LibrarySearchToolbar.tsx");
const css=read("src/theme.ts");
const source=css.slice(css.indexOf("/* v0.5.9-test.3"));
const dash=read("src/Dashboard.tsx");

test("Single native Steam keyboard TextField stretches across the row",()=>{
  assert.match(view,/<div ref=\{inputRef\} className="gl-library-search-field">/);
  assert.match(view,/<div className="gl-library-search-native">\s*<TextField label="Search game titles"/);
  assert.match(view,/onChange=\{event=>onQuery\(event\.target\.value\)\}/);
  assert.match(view,/querySelector\("input"\)\?\.focus\(\)/);
  assert.match(source,/\.gl-root \.gl-library-search-native :is\(div:has\(input\),input\) \{/);
  assert.match(source,/width:100%!important;min-width:0!important;max-width:none!important/);
});

test("Search input has no large surrounding fake box or giant focus rectangle",()=>{
  const field=source.match(/\.gl-root \.gl-library-search-field \{([^}]+)\}/)?.[1];
  assert.ok(field,"search field must have its own style");
  assert.match(field,/border:0;border-radius:0;padding:0;background:transparent/);
  assert.doesNotMatch(field,/linear-gradient|padding:2px 12px/);
  const wrapperFocus=source.match(/\.gl-root \.gl-library-search-field:focus-within \{([^}]+)\}/)?.[1];
  assert.match(wrapperFocus,/outline:0;box-shadow:none/);
  assert.match(source,/\.gl-root \.gl-library-search-native input:focus \{/);
  assert.match(source,/border-radius:11px!important/);
});

test("Filter buttons use consistent non-clipped focus instead of scroll clipping",()=>{
  const chips=source.match(/\.gl-root \.gl-library-search-chips \{([^}]+)\}/)?.[1];
  assert.ok(chips,"chips rule is missing");
  assert.match(chips,/flex-wrap:wrap/);
  assert.match(chips,/overflow:visible/);
  assert.doesNotMatch(chips,/overflow-x:auto|flex-wrap:nowrap/);
  assert.match(source,/\.gl-root \.gl-library-search-chip:is\(\.gl-focused,\.gpfocus,:focus-visible\)/);
  assert.match(source,/\.gl-root \.gl-library-search-clear:is\(\.gl-focused,\.gpfocus,:focus-visible\)/);
  assert.match(source,/\.gl-root \.gl-search-page \.gl-grid-back:is\(\.gl-focused,\.gpfocus,:focus-visible\)/);
  assert.match(source,/box-shadow:inset 0 0 0 1px #f0faff/);
});

test("Source/Installed state, Clear, controller focus, Search rail unchanged",()=>{
  assert.match(view,/onActivate=\{\(\)=>\{onQuery\(""\);focusInput\(\);\}\}/);
  assert.match(view,/onSource\(option\.id\)/);
  assert.match(view,/onInstalled\(option\.id\)/);
  assert.match(view,/onFocusResults\(\)/);
  assert.match(view,/onFocusRail\(\)/);
  assert.match(dash,/\{ id: "search", label: "Search", icon: MdSearch, go: openLocalSearch \}/);
  assert.match(dash,/activate=\{\(\)=>openGameDetails\(game\)\}/);
  assert.match(read("system-theme/settings-gamepad-focus.css"),/background:#163a5e !important/);
});
