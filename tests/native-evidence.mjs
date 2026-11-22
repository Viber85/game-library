import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {selectNativeEvidence} from "../src/nativeEvidence.ts";

const sample=(changes={})=>({
  libraryUIVisible:false,compactHltbFound:true,compactHltbStyled:true,
  compactCssLoaded:true,nativeCompactHeroStyled:true,
  nativeCompactPlayBarStyled:true,
  nativeCompactHeroHeight:218,nativeCompactPlayBarHeight:73,
  nativeCompactPaintCount:2,nativeCompactPaintNeutralized:2,
  ...changes
});
const now=1_800_000;

test("original native game provides coherent LIVE compact, HLTB and painted panels",()=>{
  const real=sample();
  const stale={at:now-2000,probe:sample({nativeCompactPaintCount:12})};
  const chosen=selectNativeEvidence(real,stale,now);
  assert.equal(chosen.source,"live");
  assert.strictEqual(chosen.probe,real);
  assert.equal(chosen.ageSeconds,0);
});

test("opening Game Library cannot overwrite native HLTB and paint with live QAM measurements",()=>{
  const before=sample();
  const overlay=sample({
    libraryUIVisible:true,compactHltbFound:false,compactHltbStyled:false,
    compactCssLoaded:false,nativeCompactPaintCount:5,nativeCompactPaintNeutralized:5
  });
  const chosen=selectNativeEvidence(overlay,{at:now-1700,probe:before},now);
  assert.equal(chosen.source,"before-qam");
  assert.strictEqual(chosen.probe,before);
  assert.equal(chosen.probe.compactHltbFound,true);
  assert.equal(chosen.probe.compactCssLoaded,true);
  assert.equal(chosen.probe.nativeCompactPaintCount,2);
});

test("overlay-only or old evidence must be flagged UNVERIFIED, not 2/2 dark",()=>{
  const overlay=sample({libraryUIVisible:true,compactHltbFound:false});
  assert.equal(selectNativeEvidence(overlay,null,now).source,"unverified");
  assert.equal(selectNativeEvidence(overlay,{at:now-220000,probe:sample()},now).source,"unverified");
  assert.equal(selectNativeEvidence(overlay,{at:now-1000,probe:overlay},now).source,"unverified");
  assert.equal(selectNativeEvidence(overlay,{at:now+5000,probe:sample()},now).source,"unverified");
});

test("Steam snapshot watcher never replaces native game evidence during visible Game Library",()=>{
  const source=readFileSync(new URL("../src/themeProbe.ts",import.meta.url),"utf8");
  const runtime=readFileSync(new URL("../src/builtinThemeRuntime.ts",import.meta.url),"utf8");
  const ui=readFileSync(new URL("../src/BuiltinThemePanel.tsx",import.meta.url),"utf8");
  assert.match(source,/!probe\.libraryUIVisible\s*&&/);
  assert.match(source,/const libraryUIVisible=Array\.from/);
  assert.match(runtime,/selectNativeEvidence\(probe,audit\?\.latestNativeCompact/);
  assert.match(runtime,/hltbFound:nativeRead\.compactHltbFound/);
  assert.match(runtime,/compactCssLoaded:nativeRead\.compactCssLoaded/);
  assert.match(runtime,/nativePaintCount:nativeRead\.nativeCompactPaintCount/);
  assert.match(ui,/Native game evidence:/);
  assert.match(ui,/NOT VERIFIED/);
});
