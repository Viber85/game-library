import { callable } from "@decky/api";
import {
  setBuiltinTheme, type ThemeBundle, type ThemeId,
} from "./builtinThemeRuntime";

type Settings = {
  theme_id:ThemeId;
  available:Array<{id:string;name:string}>;
};
type BundleResponse = ThemeBundle & {ok:boolean;error?:string};
const read = callable<[],Settings>("get_theme_settings");
const write = callable<[ThemeId],boolean>("set_theme_settings");
const bundle = callable<[string],BundleResponse>("get_builtin_theme");

let cssCache:ThemeBundle|null=null;

async function loadCss():Promise<ThemeBundle> {
  if(cssCache)return cssCache;
  const result=await bundle("midnight");
  if(!result.ok || !result.css?.main || !result.css?.overlay)
    throw new Error("Bundled Midnight CSS is missing: "+(result.error??"No data"));
  cssCache={id:"midnight",name:result.name,css:result.css};
  return cssCache;
}

/** Called automatically at Decky plugin start and after every Steam reboot. */
export async function loadDefaultTheme():Promise<void>{
  let mode:ThemeId="midnight";
  try{
    const setting=await read();
    mode=setting.theme_id==="off"?"off":"midnight";
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
