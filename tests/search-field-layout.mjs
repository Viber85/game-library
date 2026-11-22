import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const view=read("src/LibrarySearchToolbar.tsx");
const css=read("src/theme.ts");
const source=css.slice(css.indexOf("/* v0.5.9-test.3"));
const dash=read("src/Dashboard.tsx");

test("Steam TextField keeps the visible editable input and accessible label",()=>{
  assert.match(view,/<div ref=\{inputRef\} className="gl-library-search-field"\s+onKeyDownCapture=\{searchTextArrows\}>/);
  assert.ok(view.includes('<div className="gl-library-search-native">'));
  assert.ok(view.includes('<TextField aria-label="Search game titles"'));
  assert.ok(view.includes('style={{width:"100%",minWidth:0}}'));
  assert.ok(view.includes('onChange={event=>onQuery(event.target.value)}'));
  assert.ok(view.includes('querySelector("input")?.focus()'));
  assert.ok(!view.includes('<TextField label="Search game titles"'));
});

test("Search field has a visible 48px border and no hidden native descendants",()=>{
  assert.ok(source.includes(".gl-root .gl-library-search-native > *"));
  assert.ok(source.includes(".gl-root .gl-library-search-native input {"));
  assert.ok(source.includes("width:100%!important;min-width:0!important;max-width:none!important"));
  assert.ok(source.includes("-webkit-text-fill-color:#f1faff!important"));
  assert.ok(source.includes("visibility:visible!important"));
  const fieldStart=source.indexOf(".gl-root .gl-library-search-field {");
  const field=source.slice(fieldStart,source.indexOf("}",fieldStart));
  assert.ok(field.includes("min-height:48px"));
  assert.ok(field.includes("background:#0b2b4a"));
  const ownCss=source.slice(0,source.indexOf(".gl-root .gl-library-search-clear"));
  for(const unsafe of ["clip-path", "position:absolute", ":has(", "display:none", "visibility:hidden", "[class*="]){
    assert.ok(!ownCss.includes(unsafe),"Unsafe field rule: "+unsafe);
  }
  assert.ok(source.includes(".gl-root .gl-library-search-field:focus-within {"));
  assert.ok(!source.includes(".gl-root .gl-library-search-native input:focus {"));
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
  assert.match(dash,/openGameDetails\(entry.steam\)/);
  assert.match(read("system-theme/settings-gamepad-focus.css"),/background:#163a5e !important/);
});
