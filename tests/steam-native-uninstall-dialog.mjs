import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync,existsSync} from "node:fs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("Cancel of new installs uses verified native Steam context menu without injecting a modal",()=>{
  const details=read("src/SteamGameDetails.tsx");
  const start=details.indexOf("  const confirmCancelDownload=()=>");
  const end=details.indexOf("  const showCommunity=()=>",start);
  assert.ok(start>=0&&end>start);
  const cancel=details.slice(start,end);
  assert.match(cancel,/if\(nativeDownload\.downloadNature==="initial"\)/);
  assert.match(cancel,/showNativeGameOptions\(game\.id,anchor\)/);
  assert.match(cancel,/focusRefs\.current\["download-cancel"\]/);
  assert.match(cancel,/Select Manage → Uninstall/);
  assert.doesNotMatch(cancel,/showNativeSteamUninstallDialog/);
  assert.doesNotMatch(cancel,/OpenUninstallWizard/);
  assert.doesNotMatch(cancel,/void cancelDownload\("initial"\)/);
  assert.doesNotMatch(details,/import .*nativeSteamUninstallDialog/);
  assert.equal(existsSync(new URL("../src/nativeSteamUninstallDialog.ts",import.meta.url)),false);
});

test("The game context menu is Steam's already-tested native UI implementation",()=>{
  const details=read("src/SteamGameDetails.tsx");
  const native=read("src/nativeGameContextMenu.tsx");
  assert.match(details,/import \{showNativeGameOptions\} from "\.\/nativeGameContextMenu"/);
  assert.match(native,/findModuleByExport/);
  assert.match(native,/showContextMenu\(element,target,opts\)/);
  assert.match(native,/LibraryContextMenu/);
});

test("Existing game update Cancel remains queue-only and never uninstalls",()=>{
  const details=read("src/SteamGameDetails.tsx");
  const start=details.indexOf("  const confirmCancelDownload=()=>");
  const end=details.indexOf("  const showCommunity=()=>",start);
  const cancel=details.slice(start,end);
  assert.match(cancel,/strTitle="Remove Steam download from queue\?"/);
  assert.match(cancel,/onOK=\{\(\)=>\{void cancelDownload\(nativeDownload\.downloadNature\);\}\}/);
  assert.match(details,/if\(!awaitingSteamUninstall\|\|nativeDownload\.transfer/);
  assert.match(details,/inspectPrefixCleanup\(game\.id\)/);
});
