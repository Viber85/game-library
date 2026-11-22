import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("Cancel opens the same Steam Uninstall confirmation used by native Manage menu",()=>{
  const helper=read("src/nativeSteamUninstallDialog.ts");
  const details=read("src/SteamGameDetails.tsx");
  assert.match(helper,/findModuleByExport\(isNativeSteamUninstallDialog\)/);
  assert.match(helper,/source\.includes\("rgApps"\)/);
  assert.match(helper,/source\.includes\("bConfirmPassword"\)/);
  assert.match(helper,/source\.includes\("bNeverPopOut"\)/);
  assert.match(helper,/dialog\(\[appId\],ownerWindow,false\)/);
  assert.match(details,/if\(nativeDownload\.downloadNature==="initial"\)\{/);
  assert.match(details,/showNativeSteamUninstallDialog\(game\.id,ownerWindow\)/);
  assert.match(details,/rootRef\.current\?\.ownerDocument\.defaultView\?\?window/);
  assert.match(details,/return;\s*\}\s*\/\/ Existing game updates never trigger game uninstall/);
  const start=details.indexOf("  const confirmCancelDownload=()=>");
  const end=details.indexOf("  const showCommunity=()=>",start);
  const cancel=details.slice(start,end);
  assert.ok(start>=0&&end>start);
  assert.doesNotMatch(cancel,/void cancelDownload\("initial"\)/);
  assert.doesNotMatch(cancel,/strOKButtonText="Uninstall game"/);
  assert.match(cancel,/showModal\(<ConfirmModal/); // update-only
});

test("Steam modal has no premature uninstall, and unknown Steam build can use native context menu",()=>{
  const helper=read("src/nativeSteamUninstallDialog.ts");
  const details=read("src/SteamGameDetails.tsx");
  assert.doesNotMatch(helper,/\bOpenUninstallWizard\!\(/);
  assert.match(helper,/appId>=0x80000000/);
  assert.match(helper,/if\(matches\.length!==1\)return null/);
  assert.match(details,/Steam's Uninstall confirmation could not be opened directly/);
  assert.match(details,/showNativeGameOptions\(game\.id,anchor\)/);
  assert.match(details,/awaitingSteamUninstall\|\|nativeDownload\.transfer/);
});
