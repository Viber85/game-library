/**
 * Opens Steam's *actual* Library game context menu, including options added
 * by other plugins such as SteamGridDB and HLTB.
 *
 * The component exports are identified using the same minified source markers
 * used by SteamGridDB/decky-steamgriddb and verified in
 * MichaelScottsman/LiquidAss-Frame/device/rt/41-home.js.
 *
 * No fake controller events, global menu patches, hard-coded DOM selectors or
 * hand-written imitations of native Steam actions.
 */
import {findModuleByExport,showContextMenu} from "@decky/ui";
import {createElement,type ComponentType} from "react";

type Fn=(...args:any[])=>any;
type NativeMenuExports={render:ComponentType<any>;options:()=>Record<string,unknown>};
let cached:NativeMenuExports|null=null;

function sourceOf(fn:unknown):string{
  try{return typeof fn==="function"?Function.prototype.toString.call(fn):"";}
  catch{return "";}
}

/** Return null instead of guessing between multiple SteamUI versions. */
export function findNativeGameMenu():NativeMenuExports|null{
  if(cached)return cached;
  try{
    const module=findModuleByExport((exported:unknown)=>{
      const text=sourceOf(exported);
      return text.includes("bFitToWindow")&&text.includes("LibraryContextMenu");
    }) as Record<string,unknown>|undefined;
    if(!module||typeof module!=="object")return null;
    const values=Object.values(module);
    const options=values.filter(fn=>{
      const s=sourceOf(fn);
      return s.includes("bFitToWindow")&&s.includes("LibraryContextMenu");
    }) as Fn[];
    const renderers=values.filter(fn=>{
      const s=sourceOf(fn);
      return s.includes("navigator:")&&s.includes("instance:")&&s.length<400;
    }) as Fn[];
    if(options.length!==1||renderers.length!==1)return null;
    cached={render:renderers[0] as ComponentType<any>,
      options:options[0] as ()=>Record<string,unknown>};
    return cached;
  }catch(error){
    console.warn("[game-library] Steam native game menu discovery failed",error);
    return null;
  }
}

export function showNativeGameOptions(gameId:number,anchor:EventTarget|null):boolean{
  if(!Number.isSafeInteger(gameId)||gameId<=0||gameId>0xffffffff)return false;
  try{
    const menu=findNativeGameMenu();
    const overview=(window as any).appStore?.GetAppOverviewByAppID?.(gameId);
    if(!menu||!overview||Number(overview.appid)!==gameId||
       typeof showContextMenu!=="function")return false;
    const ownerWindow=anchor instanceof Node?anchor.ownerDocument?.defaultView:window;
    const element=createElement(menu.render,{
      overview,
      client:"mostavailable",
      launchSource:1000, // Steam's own library capsule launch source.
      bInGamepadUI:true,
      ownerWindow:ownerWindow??window
    });
    const opts=menu.options();
    if(!opts||typeof opts!=="object")return false;
    const target=anchor instanceof Element?anchor:window.document.activeElement;
    if(!target)return false;
    const handle=showContextMenu(element,target,opts);
    return !!handle;
  }catch(error){
    console.warn("[game-library] Steam native game menu could not open",error);
    return false;
  }
}
