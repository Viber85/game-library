import assert from "node:assert/strict";
import test from "node:test";
import {
  canonicalSteamAppId,
  isNonSteamAppId,
  steamRunGameArgs,
  requestSteamLaunch,
  STEAM_2FT_LIBRARY_DETAILS,
} from "../src/launchGame.ts";

test("normal Steam app uses Steam's default launch option -1", ()=>{
  assert.deepEqual(steamRunGameArgs(367520),["367520","",-1,STEAM_2FT_LIBRARY_DETAILS]);
  assert.equal(STEAM_2FT_LIBRARY_DETAILS,100);
  assert.equal(isNonSteamAppId(367520),false);
});

test("native Linux non-Steam shortcut uses canonical uint32 ID and default option", ()=>{
  assert.deepEqual(steamRunGameArgs(0x80000000),["2147483648","",-1,100]);
  assert.deepEqual(steamRunGameArgs(-2147483648),["2147483648","",-1,100]);
  assert.deepEqual(steamRunGameArgs(-1),["4294967295","",-1,100]);
  assert.equal(isNonSteamAppId(-1),true);
  assert.equal(isNonSteamAppId(0x80000001),true);
});

test("reject invalid app IDs rather than accidentally launching wrong game",()=>{
  for(const id of [0,NaN,Infinity,-2147483649,4294967296,1.25]){
    assert.equal(steamRunGameArgs(id),null);
  }
});

test("Steam RunGame receives the correct 4 parameters exactly once",()=>{
  let received=null;
  let calls=0;
  const steam={Apps:{RunGame:(...args)=>{received=args;calls++;}}};
  assert.equal(requestSteamLaunch(steam,0xC0000033),true);
  assert.deepEqual(received,[String(0xC0000033),"",-1,100]);
  assert.equal(calls,1);
  assert.equal(requestSteamLaunch({},0xC0000033),false);
  assert.equal(requestSteamLaunch(steam,0),false);
  assert.equal(calls,1);
});
