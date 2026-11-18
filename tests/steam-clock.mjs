import assert from "node:assert/strict";
import test from "node:test";
import {readLiveSteamClockPreference} from "../src/steamClock.ts";

test("Current SteamOS settingsStore directly supplies the clock format",()=>{
  for(const [value,want] of [[1,true],[0,false],[true,true],[false,false]]){
    assert.equal(readLiveSteamClockPreference({
      settingsStore:{m_FriendSettings:{b24HourClock:value}},
    }),want);
  }
});
test("Live Steam setting overrides stale Friends chat setting",()=>{
  assert.equal(readLiveSteamClockPreference({
    settingsStore:{m_FriendSettings:{b24HourClock:1}},
    friendStore:{m_ChatStore:{m_SettingsStore:{
      m_FriendsSettings:{b24HourClock:0}
    }}}
  }),true);
  assert.equal(readLiveSteamClockPreference({
    settingsStore:{m_FriendSettings:{b24HourClock:0}},
    friendStore:{m_ChatStore:{m_SettingsStore:{
      m_FriendsSettings:{b24HourClock:1}
    }}}
  }),false);
});
test("Older Steam client friendStore settings supported without making assumptions",()=>{
  assert.equal(readLiveSteamClockPreference({
    friendStore:{m_ChatStore:{m_SettingsStore:{
      m_FriendsSettings:{b24HourClock:1}
    }}}
  }),true);
  assert.equal(readLiveSteamClockPreference({
    friendStore:{m_ChatStore:{m_SettingsStore:{
      FriendsSettings:{b24HourClock:0}
    }}}
  }),false);
});
test("Unknown Steam preference remains unknown, never guessed as 12h or 24h",()=>{
  for(const obj of [null,undefined,{},{
    settingsStore:{m_FriendSettings:{b24HourClock:"1"}}
  },{settingsStore:{m_FriendSettings:{b24HourClock:2}}}]){
    assert.equal(readLiveSteamClockPreference(obj),null);
  }
});
test("Home clock reads current Steam store before stale disk fallback",async()=>{
  const {readFileSync}=await import("node:fs");
  const status=readFileSync(new URL("../src/SystemStatusBar.tsx",import.meta.url),"utf8");
  assert.match(status,/readLiveSteamClockPreference\(globalThis\)/);
  assert.match(status,/liveClock\?\?savedClock/);
  assert.match(status,/window\.setInterval\(refreshLiveClock,2000\)/);
});
