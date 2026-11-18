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
