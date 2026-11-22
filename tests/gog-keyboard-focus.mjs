import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {stabilizeGogKeyboardFocus} from "../src/gogKeyboardFocus.ts";

const microtask=()=>Promise.resolve();

test("Steam per-keystroke false/true does not blur the GOG email input",async()=>{
  const received=[];
  const bridge={SetFocus(value){received.push(value);}};
  const before=bridge.SetFocus;
  const guard=stabilizeGogKeyboardFocus(bridge);
  assert.equal(guard.installed,true);
  for(const ch of "mail@example.com"){
    // Exact focus sequence Steam performs after each onscreen keyboard key.
    bridge.SetFocus(false);
    bridge.SetFocus(true);
  }
  await microtask();
  assert.equal(received.includes(false),false,
    "GOG must not see a blur between typed characters");
  assert.equal(received.filter(Boolean).length,"mail@example.com".length);
  guard.dispose();
  assert.equal(bridge.SetFocus,before,"Steam native focus method must be restored");
});

test("Legitimate focus loss still reaches Steam on next microtask",async()=>{
  const calls=[];
  const view={SetFocus(value){calls.push(value);}};
  const guard=stabilizeGogKeyboardFocus(view);
  assert.equal(guard.installed,true);
  view.SetFocus(false);
  assert.deepEqual(calls,[]);
  await microtask();
  assert.deepEqual(calls,[false]);
  view.SetFocus(true);
  assert.deepEqual(calls,[false,true]);
  guard.dispose();
});

test("Canceling login with a pending real blur does not lose Steam focus change",async()=>{
  const calls=[];
  const view={SetFocus(value){calls.push(value);}};
  const original=view.SetFocus;
  const guard=stabilizeGogKeyboardFocus(view);
  view.SetFocus(false);
  guard.dispose();
  await microtask();
  assert.deepEqual(calls,[false]);
  assert.equal(view.SetFocus,original);
  guard.dispose();
  assert.deepEqual(calls,[false]);
});

test("Does not permanently overwrite an inherited Steam native bridge method",async()=>{
  const calls=[];
  const proto={SetFocus(value){calls.push(value);}};
  const view=Object.create(proto);
  assert.equal(Object.hasOwn(view,"SetFocus"),false);
  const guard=stabilizeGogKeyboardFocus(view);
  assert.equal(guard.installed,true);
  view.SetFocus(false);view.SetFocus(true);
  await microtask();
  assert.deepEqual(calls,[true]);
  guard.dispose();
  assert.equal(Object.hasOwn(view,"SetFocus"),false);
  assert.equal(view.SetFocus,proto.SetFocus);
});

test("Unpatchable or missing native bridge fails safely and leaves it untouched",()=>{
  const native=()=>{};
  const obj={};
  Object.defineProperty(obj,"SetFocus",
    {value:native,writable:false,configurable:false});
  const guard=stabilizeGogKeyboardFocus(obj);
  assert.equal(guard.installed,false);
  guard.dispose();
  assert.equal(obj.SetFocus,native);
  assert.equal(stabilizeGogKeyboardFocus({}).installed,false);
});

test("Only GOG sign-in uses temporary Steam focus guard, and no credentials are inspected",()=>{
  const login=readFileSync(new URL("../src/gogNativeLogin.ts",import.meta.url),"utf8");
  const src=readFileSync(new URL("../src/gogKeyboardFocus.ts",import.meta.url),"utf8");
  assert.match(login,/keyboardFocusGuard=stabilizeGogKeyboardFocus\(view\)/);
  assert.match(login,/keyboardFocusGuard\?\.dispose\(\)/);
  assert.doesNotMatch(src,/Unifideck|unifideck|document\.cookie|password\.value|querySelector|localStorage|fetch\(/);
});
