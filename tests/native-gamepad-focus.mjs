import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {nextGamepadControl,takeNativeGamepadFocus,
  matchingGamepadControls} from "../src/nativeGamepadFocusCore.ts";

const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const rect=(left,top,width=100,height=35)=>({
  left,top,right:left+width,bottom:top+height,
  width,height,
});
function fakeElement(document,bounds){
  const element={
    ownerDocument:document,
    bounds,
    hidden:false,disabled:false,children:[],
    getClientRects(){return this.hidden?[]:[this.bounds];},
    getBoundingClientRect(){return this.bounds;},
    hasAttribute(key){return key==="disabled"&&this.disabled;},
    getAttribute(key){return key==="aria-disabled"&&this.disabled?"true":null;},
    closest(){return null;},
    contains(other){return this.children.includes(other);},
    focus(){throw Error("DOM focus must not be used for native gamepad movement");},
  };
  return element;
}
function navNode(Element,child=[],focus=null){
  return {
    Element,
    GetChildren:()=>[child,0],
    ...(focus?{BTakeFocus:focus}:{}),
  };
}

test("native Steam BTakeFocus (not DOM.focus) receives gamepad source and direction",()=>{
  const doc={};
  const rootElement=fakeElement(doc,rect(0,0,1000,500));
  const left=fakeElement(doc,rect(100,100));
  const right=fakeElement(doc,rect(210,100));
  const calls=[];
  const root=navNode(rootElement,[
    navNode(left,[],(source,direction)=>{calls.push(["left",source,direction]);return true;}),
    navNode(right,[],(source,direction)=>{calls.push(["right",source,direction]);return true;}),
  ]);
  assert.equal(takeNativeGamepadFocus([{Root:root}],right,6),true);
  assert.deepEqual(calls,[["right",0,6]]);
  assert.equal(takeNativeGamepadFocus([{Root:root}],left,5),true);
  assert.deepEqual(calls[1],["left",0,5]);
});

test("native focus ignores wrong document, missing targets and broken navigation nodes",()=>{
  const doc={},otherDoc={};
  const root=fakeElement(doc,rect(0,0,900,600));
  const target=fakeElement(doc,rect(150,100));
  const wrong=fakeElement(otherDoc,rect(150,100));
  assert.equal(takeNativeGamepadFocus([{Root:navNode(wrong,[],
    ()=>{throw Error("foreign document must not receive input")})}],target,6),false);
  assert.equal(takeNativeGamepadFocus([{Root:navNode(root,[])}],target,6),false);
  const malformed=navNode(root);
  malformed.GetChildren=()=>{throw Error("Steam tree transiently unavailable")};
  assert.equal(takeNativeGamepadFocus([{Root:malformed}],target,6),false);
});

test("nearest control geometry excludes hidden and disabled menu buttons",()=>{
  const doc={};
  const left=fakeElement(doc,rect(0,0,120));
  const middle=fakeElement(doc,rect(130,0,120));middle.hidden=true;
  const right=fakeElement(doc,rect(260,0,120));
  const disabled=fakeElement(doc,rect(390,0,120));disabled.disabled=true;
  const scope={querySelectorAll:()=>[left,middle,right,disabled]};
  assert.deepEqual(matchingGamepadControls(scope,".gl-tab-manager-action"),[left,right]);
  assert.equal(nextGamepadControl(scope,left,"right",".gl-tab-manager-action"),right);
  assert.equal(nextGamepadControl(scope,right,"left",".gl-tab-manager-action"),left);
  assert.equal(nextGamepadControl(scope,right,"right",".gl-tab-manager-action"),null);
});

test("native focus capture installs only in non-Home/Library/Search menus",()=>{
  const bridge=read("src/nativeMenuGamepad.ts");
  const dashboard=read("src/Dashboard.tsx");
  const diagnostics=read("src/LibraryDiagnostics.tsx");
  assert.match(bridge,/getGamepadNavigationTrees\(\)/);
  assert.match(bridge,/vgp_ondirection/);
  assert.match(bridge,/addEventListener\("vgp_ondirection",onDirection,true\)/);
  assert.match(bridge,/removeEventListener\("vgp_ondirection",onDirection,true\)/);
  assert.match(bridge,/takeNativeGamepadFocus\(trees,next,event\.detail!\.button!\)/);
  assert.match(bridge,/event\.stopImmediatePropagation\(\)/);
  assert.match(bridge,/target\.closest\("\.gl-sidebar \.gl-rail-item"\)/);
  assert.match(bridge,/source instanceof HTMLInputElement/);
  assert.match(dashboard,/const nativeMenuKind=initialMode==="tabs"\?"tabs":/);
  assert.match(dashboard,/initialMode==="settings"\?"settings":/);
  assert.match(dashboard,/initialMode==="appearance"\?"appearance":/);
  assert.match(dashboard,/initialMode==="collections"\?"collections":null/);
  assert.match(dashboard,/useNativeMenuGamepad\(nativeMenuKind,nativeMenuRoot\)/);
  assert.doesNotMatch(dashboard,/initialMode==="home"\?"home":/);
  assert.match(diagnostics,/useNativeMenuGamepad\("diagnostics",menuRoot\)/);
});

test("Native destinations include every requested custom-menu family",()=>{
  const src=read("src/nativeMenuGamepad.ts");
  for(const selector of [
    ".gl-tab-manager-row", ".gl-tab-manager-action",
    ".gl-tab-smart-rule-picker", ".gl-tab-smart-option",
    ".gl-tab-picker-game", ".gl-plugin-setting-row",
    ".gl-appearance-theme-option", ".gl-collections-card",
    ".gl-collections-group",".gl-collections-picker-row",".ld-button",
  ])assert.ok(src.includes(selector), "Missing native menu focus target: "+selector);
});
