import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {
  LIBRARY_LETTERS,letterForTitle,alphabetLetters,alphabetIndicatorEnabled,
  firstGameByLetter,nextPopulatedLetter,isRightEdgeGame,
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
  assert.match(dash,/games=\{visibleGridGames\} allGames=\{shown\}/);
  assert.match(dash,/focusedGameId=\{selectedId\}/);
  assert.match(dash,/railRef=\{alphabetRailRef\}/);
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
  assert.doesNotMatch(widget,/callable|fetch\(/);
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

test("Interactive rail maps letters to the first game in the whole sorted list",()=>{
  const games=[
    {title:"Alba"},{title:"Atlas"},
    {title:"Hades"},{title:"Hollow Knight"},
    {title:"Spire"},{title:"Zelda"},
  ];
  const map=firstGameByLetter(games);
  assert.deepEqual([...map.entries()],[["A",0],["H",2],["S",4],["Z",5]]);
  assert.equal(map.has("B"),false);
  assert.equal(firstGameByLetter([]).size,0);
  const far=Array.from({length:120},(_,i)=>({title:i<115?"Alien "+i:"Zelda "+i}));
  assert.equal(firstGameByLetter(far).get("Z"),115,
    "Must jump beyond the first 60 mounted posters");
});

test("D-pad up/down skips letters with no games without wrapping",()=>{
  const targets=firstGameByLetter([
    {title:"Alpha"},{title:"Hades"},{title:"Zelda"},
  ]);
  const asc=alphabetLetters(false),desc=alphabetLetters(true);
  assert.equal(nextPopulatedLetter("A",1,asc,targets),"H");
  assert.equal(nextPopulatedLetter("H",-1,asc,targets),"A");
  assert.equal(nextPopulatedLetter("H",1,asc,targets),"Z");
  assert.equal(nextPopulatedLetter("Z",1,asc,targets),"Z");
  assert.equal(nextPopulatedLetter("A",-1,asc,targets),"A");
  assert.equal(nextPopulatedLetter("Z",1,desc,targets),"H");
  assert.equal(nextPopulatedLetter("H",-1,desc,targets),"Z");
  assert.equal(nextPopulatedLetter("A",1,desc,targets),"A");
});

test("Only the right edge of a full or partial row enters the A-Z rail",()=>{
  for(const cols of [4,5,6]){
    const total=cols*3+2;
    assert.equal(isRightEdgeGame(cols-1,total,cols),true);
    assert.equal(isRightEdgeGame(cols*2-1,total,cols),true);
    assert.equal(isRightEdgeGame(total-1,total,cols),true);
    assert.equal(isRightEdgeGame(cols,total,cols),false);
    assert.equal(isRightEdgeGame(total-2,total,cols),false);
    assert.equal(isRightEdgeGame(-1,total,cols),false);
    assert.equal(isRightEdgeGame(total,total,cols),false);
    assert.equal(isRightEdgeGame(0,total,0),false);
  }
});

test("Focusable alphabet supports gamepad right entry, A jump, B/left return, LB/RB tabs and Y sorting",()=>{
  assert.match(dash,/libraryAlphabetActive&&direction==="right"&&[\s\S]*?isRightEdgeGame\(index,shown\.length,columns\)/);
  assert.match(dash,/alphabetReturnGridIndex\.current=index;/);
  assert.match(dash,/alphabetRailRef\.current\?\.focus\(\)/);
  assert.match(dash,/const jumpFromAlphabet=\(index:number\)=>\{/);
  assert.match(dash,/focusGrid\(index\);/);
  assert.match(widget,/<Focusable[\s\S]*?ref=\{railRef\}/);
  assert.match(widget,/onGamepadFocus=\{onRailFocus\}/);
  assert.match(widget,/onActivate=\{jumpToLetter\}/);
  assert.match(widget,/onCancelButton=\{returnToGrid\}/);
  assert.match(widget,/onButtonDown=\{onRailButton\}/);
  assert.match(widget,/onOptionsButton=\{\(e:GamepadEvent\)=>\{/);
  assert.match(widget,/GamepadButton\.DIR_UP\|\|button===GamepadButton\.DIR_DOWN/);
  assert.match(widget,/GamepadButton\.DIR_LEFT/);
  assert.match(widget,/GamepadButton\.BUMPER_LEFT/);
  assert.match(widget,/onChangeTab\(button===GamepadButton\.BUMPER_LEFT\?-1:1\)/);
  assert.match(widget,/targets\.get\(choice\)/);
  assert.match(css,/\.gl-alphabet-rail\.gl-alphabet-focused/);
  assert.match(css,/\.gl-alphabet-rail-letter\.gl-alphabet-unavailable/);
});
