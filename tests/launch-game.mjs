import assert from "node:assert/strict";
import test from "node:test";
import {
  canonicalSteamAppId, isNonSteamAppId,
  shortcutRunGameId, steamRunGameArgs, requestSteamLaunch,
  STEAM_2FT_LIBRARY_DETAILS,
} from "../src/launchGame.ts";

const shortcutId=0xC0000033;
const gameId=((BigInt(shortcutId)<<32n)|0x02000000n).toString();
const wrongGameId=((BigInt(0xC0000099)<<32n)|0x02000000n).toString();
const appStore = (stored) => ({m_mapApps:new Map([[(shortcutId|0),{gameid:stored}]])});

test("Steam game uses normal 32-bit appid and default launch option",()=>{
  assert.deepEqual(steamRunGameArgs(367520),["367520","",-1,100]);
  assert.equal(STEAM_2FT_LIBRARY_DETAILS,100);
  assert.equal(isNonSteamAppId(367520),false);
});

test("non-Steam uses the correct *64-bit gameID* string",()=>{
  assert.equal(shortcutRunGameId(shortcutId),gameId);
  assert.equal(shortcutRunGameId(shortcutId|0),gameId);
  assert.deepEqual(steamRunGameArgs(shortcutId),[gameId,"",-1,100]);
  assert.equal(shortcutRunGameId(-2147483648),
    ((2147483648n<<32n)|0x02000000n).toString());
});

test("Steam appStore signed-key stored gameID is used when matching",()=>{
  assert.equal(shortcutRunGameId(shortcutId,appStore(gameId)),gameId);
});
test("invalid or foreign appStore gameID is ignored",()=>{
  assert.equal(shortcutRunGameId(shortcutId,appStore(wrongGameId)),gameId);
  assert.equal(shortcutRunGameId(shortcutId,appStore("not-a-gameid")),gameId);
  assert.equal(shortcutRunGameId(shortcutId,appStore("12345")),gameId);
});

test("invalid appids never launch",()=>{
  for(const id of [0,NaN,Infinity,-2147483649,4294967296,1.25])
    assert.equal(steamRunGameArgs(id),null);
});

test("Steam RunGame receives 64-bit shortcut gameID, not shortcut appID",()=>{
  const calls=[];
  const steam={Apps:{RunGame:(...args)=>calls.push(args)}};
  assert.equal(requestSteamLaunch(steam,shortcutId,appStore(gameId)),true);
  assert.deepEqual(calls,[[gameId,"",-1,100]]);
  assert.equal(requestSteamLaunch({},shortcutId),false);
  assert.equal(requestSteamLaunch(steam,0),false);
  assert.equal(calls.length,1);
});
