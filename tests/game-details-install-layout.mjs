import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const steam=read("src/SteamGameDetails.tsx");
const gog=read("src/SharedLibraryDetails.tsx");
const css=read("src/theme.ts");

test("both providers use the approved summary-actions-progress-HLTB sequence",()=>{
  for(const [name,source] of [["Steam",steam],["GOG",gog]]){
    const poster=source.indexOf('className="gl-details-intro"');
    const summary=source.indexOf('className="gl-details-summary"',poster);
    const actions=source.indexOf('className="gl-details-action-row"',summary);
    const reserved=source.indexOf('className="gl-details-progress-slot"',actions);
    const strip=source.indexOf('className="gl-details-hltb gl-details-hltb-strip"',reserved);
    const footer=source.indexOf('className="gl-details-footer"',strip);
    assert.ok(0<poster&&poster<summary&&summary<actions&&actions<reserved&&reserved<strip&&strip<footer,
      name+" has ordered cover / summary / actions / progress / HLTB / footer");
    assert.equal((source.slice(summary,actions).match(/gl-details-meta-cell/g)||[]).length,
      name==="Steam"?2:3,"metadata cards are before Install, not beneath the poster");
    assert.doesNotMatch(source,/gl-details-tabs|View in Steam|<h2>Community/);
    assert.equal((source.slice(strip,footer).match(/gl-details-hltb-cell/g)||[]).length,
      4,name+" HLTB has four cards across one row");
  }
});

test("Steam retains the existing native download controls within the always-mounted slot",()=>{
  const a=steam.indexOf('className="gl-details-progress-slot"');
  const b=steam.indexOf('className="gl-details-hltb gl-details-hltb-strip"',a);
  const progress=steam.slice(a,b);
  assert.match(progress,/installMode==="transfer"&&nativeDownload\.transfer/);
  assert.match(progress,/role="progressbar"/);
  assert.match(progress,/onAction\("download-toggle"\)/);
  assert.match(progress,/onAction\("download-cancel"\)/);
  assert.match(progress,/formatDownloadBytes/);
  assert.match(progress,/formatDownloadTime/);
  assert.match(steam,/openSteamInstallWizard\(game\.id,game\.nonSteam\)/);
  assert.match(steam,/requestSteamUninstallLink\(game\.id,game\.nonSteam,client\.SteamClient\)/);
});

test("GOG shows independent unavailable fields without borrowing Steam download APIs",()=>{
  const summary=gog.slice(gog.indexOf('className="gl-details-summary"'),
    gog.indexOf('className="gl-details-action-row"'));
  assert.match(summary,/SPACE REQUIRED/);
  assert.match(summary,/LAST PLAYED/);
  assert.match(summary,/ACHIEVEMENTS/);
  assert.match(summary,/Unavailable/);
  assert.match(gog,/gl-gog-install-pending/);
  assert.match(gog,/onAction\("install"\)/);
  assert.match(gog,/gl-gog-install-progress/);
  assert.match(gog,/gl-details-download-main/);
  assert.doesNotMatch(gog,/useSteamGameDownload|nativeDownload|openSteamInstallWizard|requestSteamUninstallLink/);
});

test("layout reserves a fixed-height scrollable progress slot and four-column HLTB row",()=>{
  assert.match(css,/\.gl-root \.gl-game-details \.gl-details-progress-slot\{[\s\S]*?height:124px;[\s\S]*?overflow-y:auto/);
  assert.match(css,/\.gl-root \.gl-game-details \.gl-details-hltb\.gl-details-hltb-strip\{[\s\S]*?grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
  assert.match(css,/\.gl-root \.gl-game-details \.gl-details-summary\{[\s\S]*?grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(css,/\.gl-root \.gl-game-details \.gl-details-intro\{[\s\S]*?grid-template-columns:clamp\(190px,21vw,265px\)/);
});

test("both Game Details pages anchor their complete content below the unchanged top bar",()=>{
  for(const source of [steam,gog]){
    const header=source.indexOf('className="gl-details-top"');
    const wrapper=source.indexOf('className="gl-details-content-block"');
    const intro=source.indexOf('className="gl-details-intro"',wrapper);
    const strip=source.indexOf('className="gl-details-hltb gl-details-hltb-strip"',intro);
    const footer=source.indexOf('className="gl-details-footer"',strip);
    assert.ok(0<header&&header<wrapper&&wrapper<intro&&intro<strip&&strip<footer);
    assert.match(source.slice(strip,footer),/<\/div>/);
  }
  assert.match(css,/\.gl-root \.gl-game-details \.gl-details-content-block\{[\s\S]*?margin-top:auto/);
  assert.match(css,/\.gl-root \.gl-game-details \.gl-details-content-block \.gl-details-intro\{\s*margin-top:0/);
  assert.match(css,/\.gl-root \.gl-game-details \.gl-details-footer\{[\s\S]*?margin-top:0/);
});

test("Steam install is separate from the right-aligned HLTB, Store and icon actions",()=>{
  const row=steam.slice(steam.indexOf('className="gl-details-action-row"'),
    steam.indexOf('className="gl-details-progress-slot"'));
  const primary=row.indexOf('onAction("primary")');
  const group=row.indexOf('className="gl-details-action-tools"');
  assert.ok(primary>0&&group>primary);
  for(const id of ["hltb","steam","controller","settings"]){
    assert.ok(row.indexOf('onAction("'+id+'")')>group,id+" remains in the right group");
  }
  assert.match(row,/onActivate=\{isNativeSteam\?onOpenStore:onNativeDetails\}/);
  assert.match(row,/onActivate=\{openGameOptions\}/);
  assert.match(row,/onActivate=\{openController\}/);
  assert.match(css,/\.gl-root \.gl-game-details \.gl-details-action-tools\{[\s\S]*?justify-content:flex-end/);
  assert.match(css,/margin-left:auto/);
  assert.match(css,/\.gl-root \.gl-game-details \.gl-details-action-row \.gl-details-primary\{[\s\S]*?min-height:55px/);
  assert.match(css,/\.gl-root \.gl-game-details \.gl-details-action-tools \.gl-details-icon-button\{[\s\S]*?width:50px/);
});

test("Steam and GOG hero has twice the previous height but preserves content positions",()=>{
  const expected=css.match(/\.gl-root \.gl-game-details \.gl-details-hero\{\s*height:clamp\(([^)]+)\)/);
  assert.ok(expected,"game-specific hero height must be defined");
  assert.equal(expected[1],"440px,62vh,660px");
  assert.match(css,/\.gl-root \.gl-game-details \.gl-details-content-block\{[\s\S]*?margin-top:auto/);
  assert.match(css,/\.gl-root \.gl-game-details \.gl-details-hero\{[\s\S]*?height:clamp\(440px,62vh,660px\)/);
  assert.match(css,/\.gl-root \.gl-details-hero-shade\{/);
  assert.doesNotMatch(steam,/style=\{\{.*height.*hero/);
  assert.doesNotMatch(gog,/style=\{\{.*height.*hero/);
});
