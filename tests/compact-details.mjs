import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import {readFileSync} from "node:fs";
import {COMPACT_DETAILS_REMOVE_SCRIPT} from "../src/compactDetailsDom.ts";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("rollback ships cleanup only: experimental native Details installer is gone",()=>{
  const decorator=read("src/compactDetailsDom.ts");
  const runtime=read("src/builtinThemeRuntime.ts");
  const backend=read("main.py");
  const panel=read("src/BuiltinThemePanel.tsx");
  const controller=read("src/themeController.ts");
  assert.doesNotMatch(decorator,/export const COMPACT_DETAILS_INSTALL_SCRIPT/);
  assert.doesNotMatch(runtime,/COMPACT_DETAILS_INSTALL_SCRIPT|compactHintsInjection|nativeCompactHintsFromCss/);
  assert.match(runtime,/const source=theme\.css\[tab\.scope\]/);
  assert.doesNotMatch(runtime,/theme\.compact_css|\+\s*\(tab\.scope==="main"&&compactDetails/);
  assert.match(runtime,/executeInTab\(title,false,COMPACT_DETAILS_REMOVE_SCRIPT\)/);
  assert.doesNotMatch(panel,/Compact Game Details · Test|selectCompactDetails|changeCompact/);
  assert.match(controller,/await setCompactDetailsMode\(false\)/);
  assert.match(backend,/if type\(enabled\) is not bool or enabled:/);
  assert.doesNotMatch(backend,/compact\.read_text\(encoding="utf-8"\)/);
});

test("legacy CEF observer and residual Steam style attributes are fully removed",()=>{
  const removed=[];
  const nodes=new Map();
  const attrs=[
    "data-glm-native-compact-hero","data-glm-native-compact-playbar",
    "data-glm-native-compact-playsection","data-glm-native-compact-playbutton",
    "data-glm-native-compact-title","data-glm-native-compact-sections",
    "data-glm-native-compact-surface","data-glm-native-compact-painted"
  ];
  for(const key of attrs)nodes.set(key,{
    removeAttribute:(attr)=>{assert.equal(attr,key);removed.push(attr);}
  });
  const rootRemoved=[];
  const root={
    removeAttribute:key=>rootRemoved.push(key),
    style:{removeProperty:key=>rootRemoved.push(key)}
  };
  const stopped=[];
  const window={
    __gameLibraryCompactDetails11:{stop:()=>stopped.push(11)},
    __gameLibraryCompactDetails12:{stop:()=>stopped.push(12)},
    __gameLibraryCompactDetails14:{stop:()=>stopped.push(14)},
    __gameLibraryNativeCompactHints14:{hero:"stale"}
  };
  const document={
    documentElement:root,
    querySelectorAll:selector=>{
      const name=selector.slice(1,-1);
      return nodes.has(name)?[nodes.get(name)]:[];
    },
  };
  const actual=vm.runInNewContext(COMPACT_DETAILS_REMOVE_SCRIPT,{document,window});
  assert.equal(actual,true);
  assert.deepEqual(stopped,[11,12,14]);
  assert.deepEqual(removed,attrs);
  assert.ok(rootRemoved.includes("data-glm-compact-details"));
  assert.ok(rootRemoved.includes("data-glm-compact-poster"));
  assert.ok(rootRemoved.includes("--glm-compact-poster-url"));
  assert.equal(window.__gameLibraryCompactDetails14,undefined);
  assert.equal(window.__gameLibraryNativeCompactHints14,undefined);
});

test("legacy Compact preference cannot reapply the removed native CSS",()=>{
  const runtime=read("src/builtinThemeRuntime.ts");
  const panel=read("src/BuiltinThemePanel.tsx");
  const controller=read("src/themeController.ts");
  assert.match(runtime,/if\(enabled\)throw new Error\("Experimental Compact Game Details was retired"\)/);
  assert.match(controller,/if\(enabled\)throw new Error\("Compact Game Details has been retired"\)/);
  assert.doesNotMatch(panel,/checked=\{current\.compactDetails\}/);
  assert.match(runtime,/const STYLE_REVISION = "90"/);
  // Original pre-Compact Midnight CSS may still style Steam game details.
  assert.match(read("system-theme/game-details-midnight.css"),/appdetailsplaysection_PlayBar/);
});
