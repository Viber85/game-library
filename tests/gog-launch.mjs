import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const backend=read("gog_launch.py");
const main=read("main.py");
const ui=read("src/SharedLibraryDetails.tsx");
const modal=read("src/GogLaunchModal.tsx");
const bridge=read("src/gogSteamShortcut.ts");
const rpc=read("src/gogLaunchRequests.ts");
const pkg=read("scripts/package.sh");

test("GOG completed files are discovered from plugin-owned account/product markers",()=>{
  assert.match(backend,/def _installs\(installer, account, product\)/);
  assert.match(backend,/_existing_status\(path, account, product\) != "complete"/);
  assert.match(backend,/\.game-library-restarts/);
  assert.match(backend,/if path\.is_symlink\(\) or not path\.is_file\(\)/);
  assert.match(backend,/def _safe_dir\(root, path\):/);
  assert.match(backend,/if path\.is_symlink\(\) or not path\.is_file\(\)/);
  assert.doesNotMatch(backend,/shortcuts\.vdf|shutil\.rmtree|os\.remove\(|shell=True/);
});

test("Steam-only non-Steam shortcut APIs create a shortcut with a verified Proton tool",()=>{
  assert.match(bridge,/Apps\.AddShortcut|apps\.AddShortcut\(/);
  assert.match(bridge,/GetAvailableCompatTools/);
  assert.match(bridge,/SpecifyCompatTool/);
  assert.match(bridge,/preferredProtonTool/);
  assert.match(bridge,/canonicalSteamAppId/);
  assert.match(bridge,/registerGogShortcut/);
  assert.match(bridge,/finalizeGogShortcut/);
  assert.match(bridge,/requestSteamLaunch/);
  assert.doesNotMatch(bridge,/shortcuts\.vdf.*write|SteamClient\.Installs/);
});

test("GOG Game Details shows Setup only for completed downloads and Play only when registered",()=>{
  assert.match(ui,/inspectGogLaunch\(gogAccountId,game\.storeId\)/);
  assert.match(ui,/gogReady=game\.store==="gog"&&launchInfo\?\.status==="ready"/);
  assert.match(ui,/gogDownloaded=game\.store==="gog"&&/);
  assert.match(ui,/gogReady\?"Play":gogDownloaded\?"Set up Play":"Install"/);
  assert.match(ui,/onActivate=\{gogReady\?playGogGame:/);
  assert.match(ui,/showModal\(<GogLaunchModal/);
  assert.match(ui,/playGogShortcut\(launchInfo\.shortcut\.app_id\)/);
  assert.match(ui,/onAction\("install"\)/);
  assert.match(modal,/<ModalRoot onCancel=/);
  assert.match(modal,/Choose|Select|executables/);
  assert.match(modal,/Configure with Proton/);
});

test("backend only registers shortcuts for known paths and completed marker",()=>{
  assert.match(main,/async def inspect_gog_launch/);
  assert.match(main,/async def register_gog_shortcut/);
  assert.match(main,/async def finalize_gog_shortcut/);
  assert.match(backend,/if relative not in \[x\["relative"\] for x in state\["candidates"\]\]:/);
  assert.match(backend,/if old\["app_id"\] != app_id or old\["relative"\] != relative:/);
  assert.match(backend,/def _read_launch\(installer, root, account, product, candidates\):/);
  assert.match(rpc,/registerGogShortcut/);
  assert.match(rpc,/inspectGogLaunch/);
  assert.match(pkg,/cp gog\.py gog_phone\.py qrcodegen\.py gog_install\.py gog_launch\.py/);
});

test("Steam Game Mode shortcuts are created with empty initial options then updated",()=>{
  assert.match(bridge,/apps\.AddShortcut\(title,candidate,"",""\)/);
  assert.match(bridge,/SetShortcutName\?\.\(appId,title\)/);
  assert.match(bridge,/SetShortcutExe\?\.\(appId,'"'\+unquote\(executable\)\+'"'\)/);
  assert.match(bridge,/SetShortcutStartDir\?\.\(appId,workingDirectory\)/);
  assert.match(bridge,/waitForShortcutOverview\(appId\)/);
  assert.match(bridge,/canonicalSteamAppId\(raw\)/);
  assert.doesNotMatch(bridge,/AddShortcut\(title,executable,workingDirectory/);
});

test("unavailable per-app Proton API falls back to Steam global compatibility tools",()=>{
  assert.match(bridge,/availableGogProtonTools/);
  assert.match(bridge,/apps\.GetAvailableCompatTools\(appId\)/);
  assert.match(bridge,/settings\.GetGlobalCompatTools\(\)/);
  assert.match(bridge,/client\?\.Settings/);
  assert.match(bridge,/preferredProtonTool\(tools\)/);
  assert.doesNotMatch(bridge,/typeof apps\?\.GetAvailableCompatTools!=="function"/);
  assert.match(bridge,/SteamClient\.Apps\.SpecifyCompatTool is unavailable/);
  assert.match(bridge,/SteamClient\.Apps\.AddShortcut is unavailable/);
});

test("failed Proton configuration records shortcut rather than duplicating it",()=>{
  const registered=bridge.indexOf('await registerGogShortcut(');
  const compat=bridge.indexOf('await availableGogProtonTools(');
  const finalize=bridge.indexOf('await finalizeGogShortcut(');
  assert.ok(registered>0&&compat>registered&&finalize>compat);
  assert.match(bridge,/if\(old\?\.ready\)return state/);
  assert.match(bridge,/Steam shortcut created, but no Proton tool/);
});

test("completed GOG shortcuts live in private per-user metadata, not on SD games",()=>{
  assert.match(backend,/def _registry_path\(installer, root, account, product\):/);
  assert.match(backend,/gog-launch/);
  assert.match(backend,/def _ensure_registry_parent\(parent, home, user\):/);
  assert.match(backend,/def _write_launch\(installer, install_dir, account, product, payload\):/);
  assert.match(backend,/temp\.replace\(path\)/);
  assert.match(backend,/root \/ _LAUNCH_MARKER/);
  assert.match(backend,/except OSError as e:/);
  assert.doesNotMatch(backend,/_write_launch\(Path\(install_dir\) \/ _LAUNCH_MARKER/);
});

test("failed shortcut metadata registration does not duplicate Steam shortcut in this session",()=>{
  assert.match(bridge,/pendingGogShortcuts=new Map/);
  assert.match(bridge,/pendingGogShortcuts\.set\(key,\{appId,exe:executable\}\)/);
  assert.match(bridge,/pending\?\.appId\?\?await createShortcut/);
  assert.match(bridge,/pendingGogShortcuts\.delete\(key\)/);
  assert.match(bridge,/retry Set up Play without restarting Game Library/);
});
