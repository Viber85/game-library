import assert from "node:assert/strict";
import test from "node:test";
import {defaultSortForTab,sortForTab} from "../src/homeSort.ts";

const all={id:"AllGames",title:"All Games"};
const installed={id:"Installed",title:"Installed"};
const favorites={id:"Favorites",title:"Favorites"};

test("Installed starts with Recently Played while all other tabs remain alphabetical",()=>{
  assert.equal(defaultSortForTab(all),"alphabetical");
  assert.equal(defaultSortForTab(installed),"recent");
  assert.equal(defaultSortForTab(favorites),"alphabetical");
  assert.equal(defaultSortForTab({id:"steam-installed",title:"Installed"}),"recent");
  assert.equal(defaultSortForTab({id:"CUSTOM",title:"Installed Games"}),"alphabetical");
  assert.equal(defaultSortForTab({id:"nonsteam",title:"Non-Steam"}),"alphabetical");
});

test("Manual sort stays per tab and does not override another tab's default",()=>{
  const overrides={Installed:"alphabetical",Favorites:"recent"};
  assert.equal(sortForTab(installed,overrides),"alphabetical");
  assert.equal(sortForTab(favorites,overrides),"recent");
  assert.equal(sortForTab(all,overrides),"alphabetical");
  assert.equal(sortForTab({id:"Custom",title:"Installed"},{}),"recent");
  assert.equal(sortForTab({id:"Custom",title:"Installed"},{Custom:"alphabetical"}),"alphabetical");
});

test("Dashboard keeps per-tab sort controls connected to the actual game order",async()=>{
  const {readFileSync}=await import("node:fs");
  const dashboard=readFileSync(new URL("../src/Dashboard.tsx",import.meta.url),"utf8");
  assert.match(dashboard,/sortForTab\(tab,tabSorts\)/);
  assert.match(dashboard,/setTabSorts\(previous=>\(\{\.\.\.previous,/);
  assert.match(dashboard,/b\.lastPlayed - a\.lastPlayed/);
  assert.match(dashboard,/a\.title\.localeCompare\(b\.title\)/);
  assert.doesNotMatch(dashboard,/useState<Sort>\("alphabetical"\)/,
    "A single global A-Z initial state would wrongly reset Installed to alphabetical");
});

test("Home clock reads the live SteamOS account preference instead of forcing browser 12h",async()=>{
  const {readFileSync}=await import("node:fs");
  const status=readFileSync(new URL("../src/SystemStatusBar.tsx",import.meta.url),"utf8");
  assert.match(status,/get_steam_clock_format/);
  assert.match(status,/getActiveUserId\(\)/);
  assert.match(status,/setSavedClock\(response\.hour24\)/);
  assert.match(status,/readLiveSteamClockPreference\(globalThis\)/);
  assert.match(status,/liveClock\?\?savedClock/);
  assert.match(status,/hourCycle:"h23"/);
  assert.match(status,/hour12:true/);
  assert.match(status,/window\.setInterval\(refresh,15000\)/);
});
