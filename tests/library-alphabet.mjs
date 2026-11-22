import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {
  LIBRARY_LETTERS,letterForTitle,alphabetLetters,alphabetIndicatorEnabled,
  firstGameByLetter,nextPopulatedLetter,isRightEdgeGame,
  letterAtRailPosition,nearestPopulatedLetter,
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
  assert.match(dash,/games=\{visibleGridGames\} allGames=\{gridShown\}/);
  assert.match(dash,/focusedGameId=\{selectedId\}/);
  assert.match(dash,/railRef=\{alphabetRailRef\}/);
  assert.match(dash,/key=\{tab\.id\+":"\+sort\}/);
  assert.match(dash,/const visibleGridGames = useMemo\(\(\)=>gridShown\.slice\(0,gridLimit\)/);
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
  assert.match(dash,/const target=gridNeighbor\(index,gridShown\.length,columns,direction\)/);
  assert.match(dash,/if\(target!==index\)focusGrid\(target\)/);
  assert.match(dash,/fullGridRefs\.current\[index\]=node/);
  assert.match(dash,/onSort=\{showSortMenu\}/);
  assert.match(dash,/if\(mode==="grid"\)\{moveInGrid\(index,button\);return;\}/);
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
  assert.match(dash,/libraryAlphabetActive&&direction==="right"&&[\s\S]*?isRightEdgeGame\(index,gridShown\.length,columns\)/);
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

test("touch coordinate maps to correct rail letter for both A-Z and Z-A",()=>{
  const asc=alphabetLetters(false),desc=alphabetLetters(true);
  assert.equal(letterAtRailPosition(110,100,270,asc),"A");
  assert.equal(letterAtRailPosition(100,100,270,asc),"#");
  assert.equal(letterAtRailPosition(370,100,270,asc),"Z");
  assert.equal(letterAtRailPosition(40,100,270,asc),"#");
  assert.equal(letterAtRailPosition(999,100,270,asc),"Z");
  assert.equal(letterAtRailPosition(100,100,270,desc),"Z");
  assert.equal(letterAtRailPosition(370,100,270,desc),"#");
  // 10px top/bottom padding: 250px / 25 letters = 10px each.
  assert.equal(letterAtRailPosition(115,100,270,["A","B","C","D","E"],10,10),"A");
  assert.equal(letterAtRailPosition(170,100,270,["A","B","C","D","E"],10,10),"B");
  assert.equal(letterAtRailPosition(100,100,0,asc),null);
  assert.equal(letterAtRailPosition(NaN,100,270,asc),null);
  assert.equal(letterAtRailPosition(110,100,270,[]),null);
});

test("touch selection snaps to nearest available letter, in displayed order",()=>{
  const available=firstGameByLetter([
    {title:"Alpha"},{title:"Hades"},{title:"Zelda"},
  ]);
  const asc=alphabetLetters(false),desc=alphabetLetters(true);
  assert.equal(nearestPopulatedLetter("A",asc,available),"A");
  assert.equal(nearestPopulatedLetter("G",asc,available),"H");
  assert.equal(nearestPopulatedLetter("B",asc,available),"A");
  assert.equal(nearestPopulatedLetter("P",asc,available),"H");
  assert.equal(nearestPopulatedLetter("X",asc,available),"Z");
  assert.equal(nearestPopulatedLetter("G",desc,available),"H");
  assert.equal(nearestPopulatedLetter("Q",desc,available),"H");
  assert.equal(nearestPopulatedLetter("X",desc,available),"Z");
  assert.equal(nearestPopulatedLetter("?",asc,available),null);
  assert.equal(nearestPopulatedLetter("Q",asc,new Map()),null);
});

test("finger gestures preview during drag and commit exactly once on release",()=>{
  assert.match(widget,/onPointerDown=\{onRailPointerDown\}/);
  assert.match(widget,/onPointerMove=\{onRailPointerMove\}/);
  assert.match(widget,/onPointerUp=\{onRailPointerUp\}/);
  assert.match(widget,/onPointerCancel=\{onRailPointerCancel\}/);
  assert.match(widget,/event\.currentTarget\.setPointerCapture\(event\.pointerId\)/);
  assert.match(widget,/event\.currentTarget\.releasePointerCapture\(event\.pointerId\)/);
  assert.match(widget,/const next=letterUnderPointer\(event\)/);
  assert.match(widget,/previewPointerLetter\(next\)/);
  assert.match(widget,/const target=targets\.get\(selected\)/);
  assert.match(widget,/onJumpToGame\(target\)/);
  assert.match(widget,/if\(activePointer\.current\|\|Date\.now\(\)<suppressTouchActivateUntil\.current\)return/);
  assert.match(widget,/suppressTouchActivateUntil\.current=Date\.now\(\)\+650/);
  assert.match(widget,/interrupted swipe must never open an unrelated game/);
  assert.match(css,/\.gl-grid-page\.gl-alphabet-enabled \.gl-alphabet-rail \{\s*width:42px;/);
  assert.match(css,/pointer-events:auto;/);
  assert.match(css,/touch-action:none;/);
  assert.match(css,/\.gl-grid-page\.gl-alphabet-enabled \.gl-alphabet-rail-letter \{\s*pointer-events:none;/);
  assert.match(dash,/onJumpToGame=\{jumpFromAlphabet\}/);
});
