import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const modal=read("src/GogInstallModal.tsx");
const game=read("src/SharedLibraryDetails.tsx");
const styles=read("src/theme.ts");
const backend=read("gog_install.py");
const rpc=read("src/gogInstallRequests.ts");
const main=read("main.py");

test("GOG location picker is a separate native Game Mode modal",()=>{
  assert.match(game,/showModal\(<GogInstallModal/);
  assert.match(modal,/<ModalRoot onCancel=\{dismiss\}/);
  assert.match(modal,/className="gl-gog-install-dialog"/);
  assert.match(modal,/preferredFocus=\{index===0\}/);
  assert.match(modal,/Storage location/);
  assert.match(modal,/Continue existing download/);
  assert.match(modal,/Start fresh/);
  assert.doesNotMatch(game,/gl-gog-install-chooser|gl-gog-install-locations/);
  assert.doesNotMatch(game,/SteamClient|openSteamInstallWizard/);
});

test("GOG download track uses Steam-like horizontal progress markup and a 6px fixed height",()=>{
  const a=game.indexOf('className="gl-details-download gl-gog-install-progress"');
  const b=game.indexOf('gl-details-install-help',a);
  const progress=game.slice(a,b);
  assert.match(progress,/gl-details-download-header/);
  assert.match(progress,/gl-details-download-main/);
  assert.match(progress,/gl-details-download-track/);
  assert.match(progress,/gl-details-download-controls/);
  assert.match(progress,/gl-details-download-metrics/);
  assert.match(progress,/onAction\("install-cancel"\)/);
  assert.match(styles,/\.gl-root \.gl-gog-steam-details \.gl-gog-install-progress \.gl-details-download-track\{[\s\S]*?height:6px!important;min-height:6px!important;/);
});

test("recovery modes are explicit, validated and never remove partial game data",()=>{
  assert.match(rpc,/type GogInstallMode="new"\|"resume"\|"adopt"\|"fresh"/);
  assert.match(main,/async def start_gog_install\(self, account_id: str, product_id: str, location: str,/);
  assert.match(backend,/def _existing_status\(game, account, product\):/);
  assert.match(backend,/def _mark_download\(game, account, product, user\):/);
  assert.match(backend,/if mode == "adopt" and existing != "untracked":/);
  assert.match(backend,/if mode == "resume" and existing != "resumable":/);
  assert.match(backend,/\.game-library-restarts/);
  assert.match(backend,/GOGDL_CONFIG_PATH/);
  assert.doesNotMatch(backend,/shutil\.rmtree|os\.remove\(|shell=True|rm -rf/);
});
