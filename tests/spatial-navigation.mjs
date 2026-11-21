import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {directionalNeighbor,focusSpatially} from "../src/spatialFocus.ts";

const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const rect=(left,top,width=90,height=40)=>({
  left,top,right:left+width,bottom:top+height,
});
const wrapped=[
  rect(0,0),rect(100,0),rect(200,0),rect(300,0),
  rect(0,65,150),rect(160,65,150),
  rect(0,130,380,44),
  rect(0,205,120),rect(130,205,120),rect(260,205,120),
];

test("Horizontal D-pad follows the same row of wrapped Tab Manager buttons",()=>{
  for(let i=1;i<4;i++){
    assert.equal(directionalNeighbor(wrapped,i,"left"),i-1);
    assert.equal(directionalNeighbor(wrapped,i-1,"right"),i);
  }
  assert.equal(directionalNeighbor(wrapped,0,"left"),null);
  assert.equal(directionalNeighbor(wrapped,3,"right"),null,
    "Right must not jump to a different row of controls");
  assert.equal(directionalNeighbor(wrapped,7,"right"),8);
  assert.equal(directionalNeighbor(wrapped,8,"right"),9);
  assert.equal(directionalNeighbor(wrapped,9,"right"),null);
});

test("Vertical D-pad selects the next real row, not a remote column",()=>{
  assert.equal(directionalNeighbor(wrapped,3,"down"),5);
  assert.equal(directionalNeighbor(wrapped,4,"down"),6);
  assert.equal(directionalNeighbor(wrapped,6,"down"),8);
  assert.equal(directionalNeighbor(wrapped,7,"up"),6);
  assert.equal(directionalNeighbor(wrapped,6,"up"),5);
  assert.equal(directionalNeighbor(wrapped,0,"up"),null);
  assert.equal(directionalNeighbor(wrapped,9,"down"),null);
});

test("Two-column Smart condition grids move left/right and up/down predictably",()=>{
  const grid=[
    rect(0,0,130),rect(140,0,130),
    rect(0,55,130),rect(140,55,130),
    rect(0,110,130),rect(140,110,130),
  ];
  assert.equal(directionalNeighbor(grid,0,"right"),1);
  assert.equal(directionalNeighbor(grid,1,"left"),0);
  assert.equal(directionalNeighbor(grid,0,"down"),2);
  assert.equal(directionalNeighbor(grid,1,"down"),3);
  assert.equal(directionalNeighbor(grid,5,"up"),3);
  assert.equal(directionalNeighbor(grid,4,"right"),5);
  assert.equal(directionalNeighbor(grid,5,"right"),null);
});

test("Spatial focus moves only visible enabled controls and scrolls focused item",()=>{
  let focused=-1,scrolled=-1;
  const elements=wrapped.slice(0,4).map((bounds,index)=>({
    getClientRects:()=>index===2?[]:[bounds],
    getBoundingClientRect:()=>bounds,
    hasAttribute:()=>false,
    getAttribute:()=>null,
    closest:()=>null,
    contains:()=>false,
    focus:()=>{focused=index;},
    scrollIntoView:()=>{scrolled=index;},
  }));
  const region={querySelectorAll:(selector)=>{
    assert.equal(selector,".test-button");
    return elements;
  }};
  assert.equal(focusSpatially(region,elements[1],"right",".test-button"),true);
  assert.equal(focused,3,"Invisible button must be skipped");
  assert.equal(scrolled,3);
  assert.equal(focusSpatially(region,elements[3],"right",".test-button"),false);
  assert.equal(focused,3,"No focus jumps at the screen edge");
});

test("All custom manager screens have explicit four-way controller handlers",()=>{
  const manager=read("src/TabManager.tsx");
  const smart=read("src/SmartTabEditor.tsx");
  const settings=read("src/PluginSettingsPage.tsx");
  const appearance=read("src/AppearancePage.tsx");
  const search=read("src/LibrarySearchToolbar.tsx");
  const collections=read("src/CollectionsPage.tsx");
  const dashboard=read("src/Dashboard.tsx");
  for(const source of [manager,smart]){
    assert.match(source,/b===GamepadButton\.DIR_LEFT\?"left"/);
    assert.match(source,/b===GamepadButton\.DIR_RIGHT\?"right"/);
    assert.match(source,/b===GamepadButton\.DIR_UP\?"up"/);
    assert.match(source,/b===GamepadButton\.DIR_DOWN\?"down"/);
    assert.match(source,/focusSpatially\(/);
  }
  assert.match(manager,/onButtonDown=\{editorDpad\}/);
  assert.match(manager,/onButtonDown=\{pickerDpad\}/);
  assert.match(smart,/onButtonDown=\{directional\}/);
  assert.match(settings,/b===GamepadButton\.DIR_RIGHT&&index>0/);
  assert.match(settings,/flow-children="column" onCancelButton=\{closeTool\}/);
  assert.match(appearance,/options\.current\[Math\.min\(optionIndex\+1,1\)\]/);
  assert.match(search,/onButtonDown=\{handleClear\}/);
  assert.match(search,/onKeyDownCapture=\{searchTextArrows\}/);
  assert.match(collections,/onKeyDownCapture=\{pickerInputKeys\}/);
  assert.match(dashboard,/homeActionRefs\.current\[1\]\?\.focus\(\)/);
  assert.match(dashboard,/b===GamepadButton\.DIR_DOWN\)/);
});

test("Text input preserves left/right caret movement and only Up/Down exits",()=>{
  for(const file of ["src/TabManager.tsx","src/LibrarySearchToolbar.tsx",
    "src/CollectionsPage.tsx"]){
    const content=read(file);
    assert.match(content,/event\.key!=="ArrowUp"/);
    assert.match(content,/event\.key!=="ArrowDown"/);
    assert.match(content,/event\.target instanceof HTMLInputElement/);
  }
  assert.match(read("src/PluginSettingsPage.tsx"),
    /!\(e\.target instanceof HTMLInputElement\)/);
});
