import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {
  LIBRARY_LETTERS,letterForTitle,alphabetLetters,alphabetIndicatorEnabled,
} from "../src/libraryAlphabet.ts";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const dash=read("src/Dashboard.tsx");
const widget=read("src/LibraryAlphabetIndicator.tsx");
const css=read("src/theme.ts");

test("Letters are Latin A-Z and #, with Croatian diacritics folded",()=>{
  assert.equal(LIBRARY_LETTERS.length,27);
  assert.equal(new Set(LIBRARY_LETTERS).size,27);
  const examples=new Map([
    ["Hades","H"],["  Čovjek ","C"],["Šuma","S"],
    ["Život","Z"],["Đavolji","D"],["Élite","E"],
    ["3D Mark","#"],["!Action","#"],
  ]);
  for(const [title,letter] of examples)
    assert.equal(letterForTitle(title),letter,title);
  assert.equal(letterForTitle(""),"#");
  assert.equal(letterForTitle("  "), "#");
  assert.equal(letterForTitle("a game"),"A");
});

test("Desc list reverses the passive index, without changing Steam sorting",()=>{
  assert.equal(alphabetLetters(false)[0],"#");
  assert.equal(alphabetLetters(false).at(-1),"Z");
  assert.equal(alphabetLetters(true)[0],"Z");
  assert.equal(alphabetLetters(true).at(-1),"#");
});

test("Phase one is ONLY for dedicated Library full grid sorted A-Z or Z-A",()=>{
  for(const sort of ["alphabetical","alphabetical-desc"]){
    assert.equal(alphabetIndicatorEnabled("library",sort,true),true);
    assert.equal(alphabetIndicatorEnabled("library",sort,false),false);
    for(const mode of ["home","search","collections","appearance"])
      assert.equal(alphabetIndicatorEnabled(mode,sort,true),false);
  }
  for(const sort of ["recent","hltb-short","most-played","size-large"])
    assert.equal(alphabetIndicatorEnabled("library",sort,true),false);
  assert.match(dash,/alphabetIndicatorEnabled\(initialMode,sort,viewAll\)/);
  assert.match(dash,/libraryAlphabetActive&&<LibraryAlphabetIndicator/);
  assert.match(dash,/games=\{visibleGridGames\} focusedGameId=\{selectedId\}/);
  assert.match(dash,/key=\{tab\.id\+":"\+sort\}/);
  assert.match(dash,/const visibleGridGames = useMemo\(\(\)=>shown\.slice\(0,gridLimit\)/);
});

test("Indicator reads focus and scroll, only announcing a changed letter",()=>{
  assert.match(widget,/scroll\.addEventListener\("focusin",onFocus\)/);
  assert.match(widget,/scroll\.addEventListener\("scroll",onScroll,\{passive:true\}\)/);
  assert.match(widget,/getGridColumnCount\(grid\)/);
  assert.match(widget,/if\(current\.current===next\)return/);
  assert.match(widget,/letterForTitle\(games\[index\]\.title\)/);
  assert.match(widget,/window\.setTimeout\(\(\)=>\{/);
  assert.match(widget, /},850\)/);
  assert.match(widget,/window\.requestAnimationFrame\(\(\)=>\{/);
  assert.match(widget,/scroll\.removeEventListener\("focusin",onFocus\)/);
  assert.match(widget,/scroll\.removeEventListener\("scroll",onScroll\)/);
  assert.match(widget,/window\.cancelAnimationFrame\(scrollFrame\.current\)/);
  assert.match(widget,/window\.clearTimeout\(popupTimer\.current\)/);
  assert.doesNotMatch(widget,/onButtonDown|GamepadButton|callable|fetch\(/);
  assert.match(css,/\.gl-root \.gl-grid-page\.gl-alphabet-enabled/);
  assert.match(css,/pointer-events:none;user-select:none/);
  assert.match(css,/prefers-reduced-motion:reduce/);
});

test("Existing Library grid focus, card options and tabs remain unchanged",()=>{
  assert.match(dash,/const target=gridNeighbor\(index,shown\.length,columns,direction\)/);
  assert.match(dash,/if\(target!==index\)focusGrid\(target\)/);
  assert.match(dash,/cardRef=\{el=>\{fullGridRefs\.current\[index\]=el;\}\}/);
  assert.match(dash,/onSort=\{showSortMenu\}/);
  assert.match(dash,/onMove=\{button=>moveInGrid\(index,button\)\}/);
  assert.match(dash,/if\(button===GamepadButton\.BUMPER_LEFT\)\{cycleTab\(-1\);return;\}/);
});
