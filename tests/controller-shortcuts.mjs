import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const source=readFileSync(new URL("../src/Dashboard.tsx",import.meta.url),"utf8");
const card=source.slice(source.indexOf("function GameCard("),
  source.indexOf("/** Use the same Steam artwork lookup"));
const sortMenu=source.slice(source.indexOf("  const showSortMenu="),
  source.indexOf("  const focusSortItem="));

test("Y/OPTIONS opens Sort on a game card, never game details",()=>{
  assert.match(card,/onOptionsButton=\{\(e:GamepadEvent\)=>\{consume\(e\);onSort\(\);\}\}/);
  assert.match(card,/onOptionsActionDescription="Sort games"/);
  assert.doesNotMatch(card,/onOptionsButton=\{\(\) => openDetails\(game\)\}/);
});

test("Select/View shortcut is removed; START owns the native Steam context menu",()=>{
  assert.doesNotMatch(card,/GamepadButton\.SELECT/);
  assert.doesNotMatch(card,/actionDescriptionMap=\{\{\[GamepadButton\.SELECT\]/);
  assert.match(card,/onMenuButton=\{\(e:GamepadEvent\)=>\{/);
  assert.match(card,/showNativeGameOptions\(game\.id,e\.currentTarget\)/);
  assert.match(card,/onMenuActionDescription="Game options"/);
});

test("Both Home carousel and Midnight full grid pass the Sort callback",()=>{
  assert.equal((source.match(/onSort=\{showSortMenu\}/g)||[]).length,2);
  assert.match(source,/onOptionsButton=\{\(e:GamepadEvent\)=>\{consume\(e\);showSortMenu\(\);\}\}/);
});

test("Sort A/B restores the card that launched it instead of jumping to the filter pill",()=>{
  assert.match(sortMenu,/sortReturnFocus\.current=document\.activeElement instanceof HTMLElement/);
  assert.match(sortMenu,/if\(original\?\.isConnected\)original\.focus\(\);/);
  assert.match(sortMenu,/else sortRef\.current\?\.focus\(\);/);
  assert.match(source,/onCancelButton=\{closeSortMenu\}/);
  assert.match(source,/onActivate=\{\(\)=>chooseSort\(option\.id\)\}/);
  assert.match(source,/Y: Sort · Start: Game options/);
});

test("Original A Play/Details, B Back, L1/R1 and grid movement unchanged",()=>{
  assert.match(card,/onActivate=\{activate \?\? \(\(\) => play\(game\)\)\}/);
  assert.match(card,/onCancelButton=\{onCancel\}/);
  assert.match(source,/activate=\{\(\)=>openDetails\(game\)\}/);
  assert.match(source,/GamepadButton\.BUMPER_LEFT/);
  assert.match(source,/GamepadButton\.BUMPER_RIGHT/);
  assert.match(source,/onMove=\{button=>moveInGrid\(index,button\)\}/);
});
