import { callable } from "@decky/api";
import {
  setBuiltinTheme, setCompactDetailsMode, type ThemeBundle, type ThemeId,
} from "./builtinThemeRuntime";

type Settings = {
  theme_id:ThemeId;
  compact_details:boolean;
  available:Array<{id:string;name:string}>;
};
type BundleResponse = ThemeBundle & {ok:boolean;error?:string};
const read = callable<[],Settings>("get_theme_settings");
const write = callable<[ThemeId],boolean>("set_theme_settings");
const writeCompact = callable<[boolean],boolean>("set_compact_details");
const bundle = callable<[string],BundleResponse>("get_builtin_theme");

let cssCache:ThemeBundle|null=null;

async function loadCss():Promise<ThemeBundle> {
  if(cssCache)return cssCache;
  const result=await bundle("midnight");
  if(!result.ok || !result.css?.main || !result.css?.overlay)
    throw new Error("Bundled Midnight CSS is missing: "+(result.error??"No data"));
  cssCache={id:"midnight",name:result.name,css:result.css,
    compact_css:result.compact_css};
  return cssCache;
}

/** Called automatically at Decky plugin start and after every Steam reboot. */
export async function loadDefaultTheme():Promise<void>{
  let mode:ThemeId="midnight";
  try{
    const setting=await read();
    mode=setting.theme_id==="off"?"off":"midnight";
    await setCompactDetailsMode(setting.compact_details===true);
  }catch(error){
    console.warn("[game-library] Cannot read theme preference, defaulting to Midnight",error);
  }
  if(mode==="off"){
    await setBuiltinTheme("off");
    return;
  }
  await setBuiltinTheme("midnight",await loadCss());
}

/** Only user interaction changes persistent theme preferences. */
export async function selectBuiltinTheme(id:ThemeId):Promise<void> {
  const resolved=id==="midnight"?await loadCss():undefined;
  if(!await write(id))throw new Error("Unable to save the theme setting");
  await setBuiltinTheme(id,resolved);
}

/** Persist and apply independent compact Game Details layout choice.
 * Off returns to the exact native Steam layout with its existing buttons. */
export async function selectCompactDetails(enabled:boolean):Promise<void>{
  const selected=await loadCss();
  if(enabled&&!selected.compact_css)
    throw new Error("Compact Game Details CSS missing from installation");
  if(!await writeCompact(enabled))
    throw new Error("Unable to save Compact Game Details preference");
  await setCompactDetailsMode(enabled);
}
