import assert from "node:assert/strict";
import test from "node:test";
import {classifySteamTab,identifySteamTabs} from "../src/themeTabs.ts";

test("main Game Mode and Steam overlay windows receive separate styling",()=>{
  assert.deepEqual(classifySteamTab({title:"Steam Big Picture Mode",url:""}),{
    title:"Steam Big Picture Mode",scope:"main"});
  assert.deepEqual(classifySteamTab({title:"QuickAccess-Menu_204",url:""}),{
    title:"QuickAccess-Menu_204",scope:"overlay"});
  assert.deepEqual(classifySteamTab({title:"MainMenu_602",url:""}),{
    title:"MainMenu_602",scope:"overlay"});
});

test("discover gamepad UI when Steam changes its tab caption",()=>{
  assert.equal(classifySteamTab({title:"Game Mode UI",url:"file:///Valve%20Steam%20Gamepad/default"})?.scope,"main");
});

test("avoid injecting into Steam store, desktop, browser or other apps",()=>{
  const items=[
    {title:"Steam Big Picture Mode",url:"gamepad"},
    {title:"QuickAccess-Menu",url:""},
    {title:"Google",url:"https://example.com"},
    {title:"Steam Store",url:"https://store.steampowered.com"},
    {title:"QuickAccess-Menu",url:""}
  ];
  assert.deepEqual(identifySteamTabs(items),[
    {title:"Steam Big Picture Mode",scope:"main"},
    {title:"QuickAccess-Menu",scope:"overlay"}
  ]);
  assert.equal(classifySteamTab({title:"",url:""}),null);
  assert.equal(classifySteamTab({title:42,url:""}),null);
});
