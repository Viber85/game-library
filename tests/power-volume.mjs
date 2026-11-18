import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {expandThemeClassAliases} from "../src/themeClassAliases.ts";

const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const volume=read("system-theme/volume.css").replace(/\/\*[\s\S]*?\*\//g,"");
const power=read("system-theme/power-menu.css").replace(/\/\*[\s\S]*?\*\//g,"");
const bundle=read("main.py");
const compiler=read("src/themeCssCompiler.ts");

test("volume paints ONLY the audio pop-in, not the game underneath",()=>{
  assert.match(volume,/:is\(\.audio_VolumePopin_2iUUM,\[class\*="audio_VolumePopin_"\]\)/);
  assert.match(volume,/\.audio_VolumeSliderLabel_262HY/);
  assert.match(volume,/--left-track-color:#4ac1ff !important;/);
  assert.match(volume,/\.gamepadslider_SliderTrackActive_2o57v/);
  assert.match(volume,/0 0 20px rgba\(3,157,255,\.42\)/);
  assert.doesNotMatch(volume,/(?:#GamepadUI_Full_Root|\.BasicUI|\.ModalOverlayBackground|\bbody\b|\bhtml\b)\s*\{/);
  assert.doesNotMatch(volume,/\b(?:width|height|padding|margin|position|display|visibility|opacity|transform|animation|transition|overflow|z-index|pointer-events)\s*:/,
    "Volume pop-in geometry, fades and input handlers are native");
});

test("Power context-menu actions retain native geometry and one cyan focus ring",()=>{
  assert.match(power,/gamepadcontextmenu_contextMenuContents_sIgB-/);
  assert.match(power,/gamepadcontextmenu_BasicContextMenuHeader_2Jp8B/);
  assert.match(power,/gamepadcontextmenu_contextMenuItem_1sdvo/);
  // Verified on native Steam Game Mode: the Power popup is a main-window
  // BasicUIContextMenu modal with role=menuitem and generic class names.
  assert.match(power,/\.BasicUIContextMenu/);
  assert.match(power,/gamepaddialog_BasicContextMenuModal_/);
  assert.match(power,/\[role="menu"\]/);
  assert.match(power,/\[role="menuitem"\]/);
  assert.match(power,/\.contextMenuItem/);
  assert.match(power,/\[class\*="Focused_"\]/);
  assert.match(power,/box-shadow:inset 0 0 0 2px #63cfff,/);
  assert.ok(power.indexOf(".BasicUIContextMenu")>power.indexOf("gamepadcontextmenu_Focused_X813r"),
    "Main-window Power focus override must follow old overlay-only selectors");
  assert.match(power,/gamepadcontextmenu_Focused_X813r/);
  assert.match(power,/basiccontextmenu_Focused_3t3Zg/);
  assert.match(power,/box-shadow:inset 0 0 0 2px #63cfff,/);
  assert.match(power,/0 0 12px rgba\(3,157,255,\.55\)/);
  assert.doesNotMatch(power,/:hover/,"No false focus on idle hover");
  assert.doesNotMatch(power,/(?:#GamepadUI_Full_Root|\.BasicUI|\.ModalOverlayBackground|\bbody\b|\bhtml\b)\s*\{/);
  assert.doesNotMatch(power,/\b(?:width|height|padding|margin|position|display|visibility|opacity|transform|animation|transition|overflow|z-index|pointer-events)\s*:/,
    "Power menu layout, visibility, commands and controller navigation are native");
  assert.doesNotMatch(power,/content\s*:|::before|::after/,
    "No pseudo elements that could hide original Power labels");
});

test("Power and Volume CSS are compiled in the correct native Steam scopes",()=>{
  const main=bundle.slice(bundle.indexOf('"main": ('),bundle.indexOf('"overlay": ('));
  const overlay=bundle.slice(bundle.indexOf('"overlay": ('),bundle.indexOf('    result = {}'));
  assert.match(main,/"volume.css"/);
  assert.match(main,/"power-menu.css"/,
    "Power is a main-window context menu, even when opened during gameplay");
  assert.match(overlay,/"volume.css"/);
  assert.match(overlay,/"power-menu.css"/);
  assert.ok(main.indexOf('"dialogs.css"')<main.indexOf('"power-menu.css"'),
    "The main-window Power menu must override generic context menu rules");
  assert.ok(overlay.indexOf('"dialogs.css"')<overlay.indexOf('"power-menu.css"'),
    "The overlay fallback must override generic context menu rules");
});

test("Steam's minified volume and context menu class names remain supported",()=>{
  for(const key of ["audio","gamepadcontextmenu","basiccontextmenu"])
    assert.ok(compiler.includes(key+":["),"Missing native CSS alias "+key);
  const aliases={
    audio:{VolumePopin:"_volumePopinHash99",VolumeSliderLabel:"_volumeLabelHash11"},
    gamepadcontextmenu:{contextMenuContents:"_menuContentsHash11",contextMenuItem:"_menuItemHash12",Focused:"_menuFocusedHash22"},
    basiccontextmenu:{contextMenuContents:"_basicContentsHash11",contextMenuItem:"_basicItemHash19"},
  };
  const v=expandThemeClassAliases(volume,aliases);
  const p=expandThemeClassAliases(power,aliases);
  for(const s of ["_volumePopinHash99","_volumeLabelHash11"])
    assert.ok(v.includes('[class~="'+s+'"]'),"Missing volume alias "+s);
  for(const s of ["_menuContentsHash11","_menuItemHash12","_menuFocusedHash22","_basicContentsHash11","_basicItemHash19"])
    assert.ok(p.includes('[class~="'+s+'"]'),"Missing Power menu alias "+s);
});
