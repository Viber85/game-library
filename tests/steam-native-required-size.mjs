import assert from "node:assert/strict";
import test from "node:test";
import {
  requiredInstallBytes,readNativeRequiredInstallBytes,
  subscribeNativeRequiredInstallBytes
} from "../src/steamNativeRequiredSize.ts";

test("Steam native required-install bytes accept only safe positive byte quantities",()=>{
  assert.equal(requiredInstallBytes({lDiskSpaceRequiredBytes:45_000_000_000}),45_000_000_000);
  assert.equal(requiredInstallBytes({lDiskSpaceRequiredBytes:"85000000000"}),85_000_000_000);
  assert.equal(requiredInstallBytes({lDiskSpaceRequiredBytes:5n}),5);
  for(const bad of [undefined,null,{},0,-1,NaN,Infinity,-Infinity,
    "85 GB","xyz",true,3_000_000_000_001,Number.MAX_SAFE_INTEGER]){
    const value={lDiskSpaceRequiredBytes:bad};
    assert.equal(requiredInstallBytes(value),null,String(bad));
  }
});

test("Uninstalled Steam details read from native Steam stores without Store HTTP calls",()=>{
  const old=globalThis.window;
  globalThis.window={
    appDetailsStore:{GetAppDetails:id=>id===123?{lDiskSpaceRequiredBytes:45_000_000_000}:null},
    appStore:{GetAppOverviewByAppID:id=>id===222?{lDiskSpaceRequiredBytes:11_000_000_000}:null},
  };
  try{
    assert.equal(readNativeRequiredInstallBytes(123),45_000_000_000);
    assert.equal(readNativeRequiredInstallBytes(222),11_000_000_000);
    assert.equal(readNativeRequiredInstallBytes(333),null);
    assert.equal(readNativeRequiredInstallBytes(0),null);
  }finally{
    if(old===undefined)delete globalThis.window;
    else globalThis.window=old;
  }
});

test("Native app-details changes update only the selected card and unregister on blur",()=>{
  const old=globalThis.window;
  let appId=null,callback,unregistered=0;
  globalThis.window={SteamClient:{Apps:{RegisterForAppDetails(id,cb){
    appId=id;callback=cb;
    return {unregister(){unregistered++;}};
  }}}};
  try{
    const values=[];
    const stop=subscribeNativeRequiredInstallBytes(123,n=>values.push(n));
    assert.equal(appId,123);
    callback({lDiskSpaceRequiredBytes:8_000_000_000});
    callback({lDiskSpaceRequiredBytes:0});
    assert.deepEqual(values,[8_000_000_000]);
    stop();
    assert.equal(unregistered,1);
  }finally{
    if(old===undefined)delete globalThis.window;
    else globalThis.window=old;
  }
});
