import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {withRequestTimeout} from "../src/requestDeadline.ts";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("Update request deadline preserves resolved and rejected result",async()=>{
  assert.equal(await withRequestTimeout(Promise.resolve("ok"),10),"ok");
  await assert.rejects(
    withRequestTimeout(Promise.reject(new Error("provider error")),10),
    /provider error/
  );
});

test("Update deadline preserves the original timeout error",async()=>{
  const never=new Promise(()=>{});
  await assert.rejects(withRequestTimeout(never,8),/Request timed out/);
});

test("Settled GitHub checks release their timer rather than retaining it",()=>{
  const helper=read("src/requestDeadline.ts");
  const updates=read("src/UpdatesPanel.tsx");
  assert.match(helper,/Promise\.race\(\[request,deadline\]\)\.finally\(\(\)=>\{/);
  assert.match(helper,/if\(timer!==undefined\)clearTimeout\(timer\)/);
  assert.match(helper,/request:Promise<T>,timeoutMs=12000/);
  assert.match(updates,/withRequestTimeout as limited/);
  assert.match(updates,/await limited\(validateReleases\(http\.body\)\)/);
  assert.match(updates,/await limited\(checkUpdates\(\)\)/);
});

test("Game Mode long-lived observers still clean up at mount/unmount",()=>{
  const auto=read("src/autoTabSource.ts");
  const running=read("src/useRunningGameState.ts");
  const bar=read("src/SystemStatusBar.tsx");
  const entry=read("src/index.tsx");
  const runtime=read("src/builtinThemeRuntime.ts");
  const artwork=read("src/SelectedGameArtwork.tsx");
  const runningArt=read("src/RunningGameVisuals.tsx");
  assert.match(auto,/stopAutoTabSource\(\)/);
  assert.match(auto,/window\.clearInterval\(interval\)/);
  assert.match(auto,/window\.clearTimeout\(followUp\)/);
  assert.match(auto,/sync\.stop\(\)/);
  assert.match(running,/window\.clearInterval\(check\)/);
  assert.match(running,/window\.removeEventListener\("focus",refresh\)/);
  assert.match(bar,/window\.clearInterval\(deviceTimer\)/);
  assert.match(bar,/window\.clearInterval\(steamTimer\)/);
  assert.match(bar,/window\.clearInterval\(clock\)/);
  assert.match(bar,/document\.removeEventListener\("visibilitychange",refreshLiveClock\)/);
  assert.match(artwork,/return \(\)=>\{live=false;\}/);
  assert.match(runningArt,/resize\?\.disconnect\(\)/);
  assert.match(runningArt,/window\.cancelAnimationFrame\(frame\)/);
  assert.match(entry,/onDismount\(\) \{/);
  assert.match(entry,/stopAutoTabSource\(\)/);
  assert.match(entry,/stopBuiltInThemeRuntime\(\)/);
  assert.match(entry,/routerHook\.removeRoute\(LIBRARY_ROUTE\)/);
  assert.match(runtime,/stopTimer\(\)/);
});

test("0.6.10 validates SteamOS Space Required native fetch and accurate presentation",()=>{
  const pkg=JSON.parse(read("package.json"));
  const dash=read("src/Dashboard.tsx");
  const css=read("system-theme/settings-gamepad-focus.css");
  const theme=read("src/builtinThemeRuntime.ts");
  assert.equal(pkg.version,"0.6.11-test.39");
  assert.match(dash,/function GameCard\(/);
  assert.match(dash,/onMenuButton=\{\(e:GamepadEvent\)=>\{/);
  assert.match(dash,/if\(mode==="grid"\)\{moveInGrid\(index,button\);return;\}/);
  assert.match(dash,/const \{runningGame,setRunningGame\}=useRunningGameState\(\)/);
  assert.match(css,/background:#163a5e !important/);
  assert.match(theme,/const STYLE_REVISION = "90"/);
  assert.doesNotMatch(dash,/\bMdStar\b/);
});
