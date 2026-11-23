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

test("GOG Back remains the focusable control after removing tab navigation",()=>{
  const page=read("src/SharedLibraryDetails.tsx");
  assert.match(page,/<Focusable \{\.\.\.onAction\("back"\)\}/);
  assert.match(page,/onCancelButton:onBack/);
  assert.match(page,/onActivate=\{onBack\}/);
  assert.doesNotMatch(page,/gl-details-tabs|onAction\("tab-|TABS\.map/);
});test("GOG Details takes and retries native focus; Dashboard captures direction events",()=>{
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

test("GOG single native Back control safely handles all directions and rail handoff",()=>{
  const back=node(bounds(70,50,145,38));
  const scope={querySelectorAll:()=>[back]};
  for(const direction of ["up","down","left","right"]){
    assert.equal(nextGamepadControl(scope,back,direction,
      ".gl-game-details .gl-details-focus"),null);
  }
  assert.match(read("src/SharedLibraryDetails.tsx"),/else if\(direction==="left"\)onFocusRail\?\.\(\)/);
});

test("GOG install opens a Decky modal and progress cancel retains native focus",()=>{
  const page=read("src/SharedLibraryDetails.tsx");
  const modal=read("src/GogInstallModal.tsx");
  for(const id of ["install","install-cancel"]){
    assert.ok(page.includes('onAction("'+id+'")'),id+" uses native focus");
  }
  assert.match(page,/showModal\(<GogInstallModal/);
  assert.match(page,/onButtonDown:onMove\(id\)/);
  assert.match(page,/onCancelButton:onBack/);
  assert.match(modal,/<ModalRoot onCancel=\{dismiss\}/);
  assert.match(modal,/preferredFocus=\{index===0\}/);
  assert.match(modal,/onCancelButton=\{dismiss\}/);
  assert.doesNotMatch(page,/SteamClient\.Installs/);
});
