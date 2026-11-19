import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {sameDeviceStatus,sameSteamSupplement} from "../src/systemStatusSnapshot.ts";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

const initial={
  battery:{percent:72,charging:false,plugged:false},
  wifi:{enabled:true,connected:true,signal:85},
  bluetooth:{enabled:true},
};

test("Identical device-status polls retain React state identity",()=>{
  assert.equal(sameDeviceStatus(initial,initial),true);
  assert.equal(sameDeviceStatus(initial,{
    battery:{...initial.battery},
    wifi:{...initial.wifi},
    bluetooth:{...initial.bluetooth},
  }),true);
  assert.equal(sameDeviceStatus({battery:null,wifi:null,bluetooth:null},{
    battery:null,wifi:null,bluetooth:null,
  }),true);
});

test("Every visible device-status field invalidates the previous snapshot",()=>{
  const changed=[
    {...initial,battery:{...initial.battery,percent:73}},
    {...initial,battery:{...initial.battery,charging:true}},
    {...initial,battery:{...initial.battery,plugged:true}},
    {...initial,battery:null},
    {...initial,wifi:{...initial.wifi,enabled:false}},
    {...initial,wifi:{...initial.wifi,connected:false}},
    {...initial,wifi:{...initial.wifi,signal:84}},
    {...initial,wifi:null},
    {...initial,bluetooth:{enabled:false}},
    {...initial,bluetooth:null},
  ];
  for(const next of changed)assert.equal(sameDeviceStatus(initial,next),false);
});

test("Avatar and unread notification changes still update Steam indicators",()=>{
  const a={unread:2,avatar:"https://avatars.steamstatic.com/a_medium.jpg"};
  assert.equal(sameSteamSupplement(a,{...a}),true);
  assert.equal(sameSteamSupplement(a,{...a,unread:3}),false);
  assert.equal(sameSteamSupplement(a,{...a,avatar:null}),false);
  assert.equal(sameSteamSupplement({unread:null,avatar:null},{unread:null,avatar:null}),true);
});

test("Clock updates do not trigger Dashboard re-render; SteamOS timers stay unchanged",()=>{
  const dashboard=read("src/Dashboard.tsx");
  const status=read("src/SystemStatusBar.tsx");
  assert.doesNotMatch(dashboard,/\[time,setTime\]|<SystemStatusBar\s+time=/);
  assert.match(status,/const \[time,setTime\]=useState<Date>\(\(\)=>new Date\(\)\)/);
  assert.match(status,/window\.setInterval\(\(\)=>setTime\(new Date\(\)\),15000\)/);
  assert.match(status,/window\.setInterval\(refresh,12000\)/);
  assert.match(status,/window\.setInterval\(refresh,15000\)/);
  assert.match(status,/window\.setInterval\(refreshLiveClock,2000\)/);
  assert.match(status,/sameDeviceStatus\(previous,normalized\)/);
  assert.match(status,/sameSteamSupplement\(previous,next\)/);
  assert.match(dashboard,/const refresh=window\.setInterval\(\(\)=>\{/);
  assert.match(dashboard,/\},15000\);\s*return \(\)=>\{window\.clearInterval\(refresh\);\}/);
  assert.match(dashboard,/libraryTabSignature\(/);
  assert.match(dashboard,/onMenuButton=\{\(e:GamepadEvent\)=>\{/);
});
