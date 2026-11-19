import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const dashboard=read("src/Dashboard.tsx");
const artwork=read("src/SelectedGameArtwork.tsx");
const visuals=read("src/RunningGameVisuals.tsx");
const notice=read("src/SortProgressNotice.tsx");
const running=read("src/useRunningGameState.ts");

test("Dashboard owns ALL controller navigation; visual components are isolated",()=>{
  for(const type of ["HeroBackdrop","GameLogo","RunningGameIcon","RunningGameLabel","SortProgressNotice"])
    assert.doesNotMatch(dashboard,new RegExp("function "+type+"\\("));
  assert.match(dashboard,/import \{HeroBackdrop,GameLogo\} from "\.\/SelectedGameArtwork"/);
  assert.match(dashboard,/import \{RunningGameIcon,RunningGameLabel\} from "\.\/RunningGameVisuals"/);
  assert.match(dashboard,/import \{SortProgressNotice\} from "\.\/SortProgressNotice"/);
  assert.match(dashboard,/import \{useRunningGameState\} from "\.\/useRunningGameState"/);
  assert.match(dashboard,/function GameCard\(/);
  assert.match(dashboard,/onMenuButton=\{\(e:GamepadEvent\)=>\{/);
  assert.match(dashboard,/onOptionsButton=\{\(e:GamepadEvent\)=>\{consume\(e\);onSort\(\);\}\}/);
  assert.match(dashboard,/focusRail\(railIndex\)/);
  assert.match(dashboard,/onMove=\{button=>moveInGrid\(index,button\)\}/);
  assert.match(dashboard,/resumeRunningGame\(runningGame,\(window as any\)\.SteamUIStore/);
});

test("hero/logo artwork selection and SteamGridDB fallbacks stay unchanged",()=>{
  assert.match(dashboard,/<HeroBackdrop key=\{selected\.id\} game=\{selected\}\/>/);
  assert.match(dashboard,/<GameLogo key=\{"logo-"\+selected\.id\} game=\{selected\}\/>/);
  assert.equal((artwork.match(/requestSelectedGameDetails\(game\.id\)/g)||[]).length,2);
  assert.match(artwork,/const choices = \[\.\.\.steamHeroes,\.\.\.\(remoteHero\?\[remoteHero\]:\[\]\),/);
  assert.match(artwork,/\.\.\.\(lookupFinished\?lastResort:\[\]\)/);
  assert.match(artwork,/if\(game\.nonSteam \|\| src \|\| lookupFinished\)return/);
  assert.match(artwork,/onError=\{\(\) => setImageIndex\(n => n\+1\)\}/);
  assert.match(artwork,/onError=\{\(\)=>setSourceIndex\(n=>n\+1\)\}/);
});

test("running game state retains 1.6s check, no-op equality and cleanup",()=>{
  assert.match(dashboard,/const \{runningGame,setRunningGame\}=useRunningGameState\(\)/);
  assert.match(running,/readRunningGame\(\(window as any\)\.SteamUIStore/);
  assert.match(running,/previous\?\.id===next\?\.id&&previous\?\.title===next\?\.title/);
  assert.match(running,/setInterval\(refresh,1600\)/);
  assert.match(running,/clearInterval\(check\)/);
  assert.match(running,/removeEventListener\("focus",refresh\)/);
  assert.match(dashboard,/if\(!ok\)setRunningGame\(null\)/);
});

test("running game marquee never changes geometry or controller behavior",()=>{
  assert.match(dashboard,/<RunningGameIcon key=\{runningGame\?\.id\}/);
  assert.match(dashboard,/<RunningGameLabel title=\{action\.label\} expanded=\{railExpanded\}/);
  assert.match(visuals,/pixels>3\?pixels:0/);
  assert.match(visuals,/resize\?\.disconnect\(\)/);
  assert.match(visuals,/window\.cancelAnimationFrame\(frame\)/);
  assert.match(visuals,/posterCandidates\(game\)/);
});

test("sort progress, statuses and no-game layouts are unchanged",()=>{
  assert.match(notice,/HOWLONGTOBEAT · MAIN \+ EXTRAS/);
  assert.match(notice,/Sorting as data loads · Games without data appear last/);
  assert.match(dashboard,/gl-sort-progress-slot gl-sort-progress-grid/);
  assert.match(dashboard,/gl-sort-progress-slot gl-sort-progress-home/);
  assert.match(dashboard,/className="gl-full-grid-scroll"/);
  assert.match(dashboard,/className="gl-footer"/);
});

test("native theme and Settings D-pad fixes are not touched by this refactor",()=>{
  const color=read("system-theme/shared.css");
  const focus=read("system-theme/settings-gamepad-focus.css");
  assert.match(color,/--glm-accent: #4ac1ff/);
  assert.match(focus,/background:#163a5e !important/);
  assert.match(focus,/:focus/);
});
