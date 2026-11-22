import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {nextGamepadControl} from "../src/nativeGamepadFocusCore.ts";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const bounds=(left,top,width=120,height=44)=>({
  left,top,right:left+width,bottom:top+height,width,height
});
function node(rect){
  return {
    rect,disabled:false,
    getBoundingClientRect(){return this.rect;},
    getClientRects(){return [this.rect];},
    hasAttribute(){return false;},
    getAttribute(){return null;},
    closest(){return null;},
    contains(other){return this===other;}
  };
}

test("GOG details has actual native SteamOS gamepad focus, not only DOM focus",()=>{
  const page=read("src/SharedLibraryDetails.tsx");
  assert.match(page,/ref=\{rootRef\} className="gl-game-details gl-gog-steam-details/);
  assert.match(page,/const focusRefs=useRef<Record<string,HTMLDivElement\|null>>\(\{\}\)/);
  assert.match(page,/const focusRef=\(id:string\)=>/);
  assert.match(page,/const onMove=\(id:string\)=>\(event:GamepadEvent\)=>/);
  assert.match(page,/directionFromButton\(event\.detail\?\.button\)/);
  assert.match(page,/nextGamepadControl\(rootRef\.current,current,direction,/);
  assert.match(page,/focusNativeMenuControl\(next,event\.detail!\.button!\)/);
  assert.match(page,/else if\(direction==="left"\)onFocusRail\?\.\(\)/);
  assert.match(page,/stop\(event\);\s*if\(next\)/);
  assert.match(page,/onGamepadFocus:\(\)=>\{if\(id!=="back"\)changedFocus\.current=true;\}/);
});

test("GOG Back and all four tabs use the same focus-and-button handlers",()=>{
  const page=read("src/SharedLibraryDetails.tsx");
  assert.match(page,/<Focusable \{\.\.\.onAction\("back"\)\}/);
  assert.match(page,/TABS\.map\(item=><Focusable key=\{item\.id\} \{\.\.\.onAction\("tab-"\+item\.id\)\}/);
  for(const tab of ["activity","your-stuff","community","game-info"]){
    assert.match(page,new RegExp('id:"'+tab+'"'));
  }
  assert.match(page,/onCancelButton:onBack/);
  assert.match(page,/onActivate=\{onBack\}/);
  assert.match(page,/onActivate=\{\(\)=>setTab\(item\.id\)\}/);
});

test("GOG Details takes and retries native focus; Dashboard captures direction events",()=>{
  const page=read("src/SharedLibraryDetails.tsx");
  const dashboard=read("src/Dashboard.tsx");
  const bridge=read("src/nativeMenuGamepad.ts");
  assert.match(page,/window\.requestAnimationFrame\(focusBack\)/);
  assert.match(page,/window\.setTimeout\(focusBack,140\)/);
  assert.match(page,/focusNativeMenuControl\(target,GamepadButton\.DIR_DOWN\)/);
  assert.match(dashboard,/useNativeMenuGamepad\(steamDetailsGame\|\|gogDetailsId\?"details":nativeMenuKind,nativeMenuRoot\)/);
  assert.match(dashboard,/onFocusRail=\{\(\)=>focusRail\(railIndex\)\}/);
  assert.match(dashboard,/if\(steamDetailsGame\|\|gogDetailsId\)focusDetailsFromRail\(\)/);
  assert.match(dashboard,/steamDetailsGame\|\|gogDetailsId\?focusDetailsFromRail\(\):goToGame\(\)/);
  assert.match(dashboard,/const focusDetailsFromRail=\(\)=>\{/);
  assert.match(dashboard,/focusNativeMenuControl\(back,GamepadButton\.DIR_RIGHT\)/);
  assert.match(bridge,/details:"\.gl-game-details \.gl-details-focus"/);
  assert.match(bridge,/addEventListener\("vgp_ondirection",onDirection,true\)/);
});

test("geometric native controller navigation traverses tabs in all four directions",()=>{
  const controls=[
    node(bounds(70,50,145,38)),     // Back
    node(bounds(75,220,115,40)),    // Activity
    node(bounds(200,220,115,40)),   // Your Stuff
    node(bounds(325,220,115,40)),   // Community
    node(bounds(450,220,115,40))    // Game Info
  ];
  const scope={querySelectorAll:()=>controls};
  const go=(i,d)=>nextGamepadControl(scope,controls[i],d,".gl-game-details .gl-details-focus");
  assert.equal(go(0,"down"),controls[1]);  // Back -> first tab
  assert.equal(go(1,"right"),controls[2]);
  assert.equal(go(2,"right"),controls[3]);
  assert.equal(go(3,"right"),controls[4]);
  assert.equal(go(4,"left"),controls[3]);
  assert.equal(go(2,"left"),controls[1]);
  assert.equal(go(1,"up"),controls[0]);    // Back, not hidden grid
  assert.equal(go(1,"left"),null);         // rail hand-off
});
