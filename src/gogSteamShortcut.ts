import {inspectGogLaunch,registerGogShortcut,finalizeGogShortcut,
  type GogLaunchInfo} from "./gogLaunchRequests";
import {canonicalSteamAppId,requestSteamLaunch,type SteamAppStore} from "./launchGame";

type CompatTool={strToolName:string;strDisplayName:string};
type SteamApps={
  AddShortcut?:(title:string,exe:string,dir:string,launchOptions:string)=>Promise<number>;
  SetShortcutExe?:(appId:number,exe:string)=>void;
  SetShortcutStartDir?:(appId:number,dir:string)=>void;
  SetShortcutLaunchOptions?:(appId:number,options:string)=>void;
  GetAvailableCompatTools?:(appId:number)=>Promise<CompatTool[]>;
  SpecifyCompatTool?:(appId:number,tool:string)=>void;
  RunGame?:(...args:[string,string,number,number])=>void;
};
type SteamWindow=Window & {SteamClient?:{Apps?:SteamApps};appStore?:SteamAppStore};
const steam=()=>window as SteamWindow;
const validShortcutId=(appId:number)=>
  Number.isInteger(appId)&&appId>=0x80000000&&appId<=0xffffffff;
const safeTool=(tool:CompatTool)=>typeof tool?.strToolName==="string"&&
  /^[A-Za-z0-9_.-]{1,100}$/.test(tool.strToolName)&&
  tool.strToolName.toLowerCase().includes("proton");

/** Choose an actually available Proton build, never invent a tool name. */
export function preferredProtonTool(tools:CompatTool[]):string|null{
  if(!Array.isArray(tools))return null;
  const proton=tools.filter(safeTool);
  const experimental=proton.find(t=>t.strToolName==="proton_experimental");
  return experimental?.strToolName??proton[0]?.strToolName??null;
}

export async function configureGogPlay(
  account:string,product:string,title:string,exeRelative:string
):Promise<GogLaunchInfo>{
  const state=await inspectGogLaunch(account,product);
  if(!state.ok||!state.install_dir)
    throw new Error(state.reason||"Completed GOG installation not found.");
  const exe=state.candidates.find(v=>v.relative===exeRelative);
  if(!exe)throw new Error("Please select a verified game executable.");
  const apps=steam().SteamClient?.Apps;
  if(typeof apps?.AddShortcut!=="function"||
     typeof apps.GetAvailableCompatTools!=="function"||
     typeof apps.SpecifyCompatTool!=="function")
    throw new Error("Steam shortcut or Proton APIs are unavailable in this Game Mode.");
  const old=state.shortcut;
  if(old&&old.relative!==exeRelative)
    throw new Error("A different executable is already configured. Change it through Steam Properties.");
  const executable=state.install_dir+"/"+exe.relative;
  const workingDirectory=executable.slice(0,executable.lastIndexOf("/"));
  let appId=old?.app_id;
  if(appId===undefined){
    // Steam itself owns shortcuts.vdf. Never edit it while Steam is running.
    const returned=await apps.AddShortcut(title,executable,workingDirectory,"");
    appId=canonicalSteamAppId(returned)??undefined;
    if(appId===undefined||!validShortcutId(appId))
      throw new Error("Steam did not return a valid non-Steam shortcut ID.");
    // Steam may ignore initial start-dir or launch options in AddShortcut.
    apps.SetShortcutExe?.(appId,executable);
    apps.SetShortcutStartDir?.(appId,workingDirectory);
    apps.SetShortcutLaunchOptions?.(appId,"");
    const registered=await registerGogShortcut(
      account,product,state.install_dir,exe.relative,appId);
    if(!registered.ok)
      throw new Error(registered.reason||"Could not record the Steam shortcut.");
  }
  if(!validShortcutId(appId))throw new Error("Stored shortcut ID is invalid.");
  if(old?.ready)return state;
  const available=await apps.GetAvailableCompatTools(appId);
  const tool=preferredProtonTool(available);
  if(!tool)
    throw new Error("Shortcut saved, but Steam has no available Proton tool. Install Proton in Steam and retry setup.");
  apps.SpecifyCompatTool(appId,tool);
  const result=await finalizeGogShortcut(account,product,appId,tool);
  if(!result.ok)throw new Error(result.reason||"Could not save Proton configuration.");
  return inspectGogLaunch(account,product);
}

export function playGogShortcut(appId:number):boolean{
  if(!validShortcutId(appId))return false;
  const {SteamClient,appStore}=steam();
  return requestSteamLaunch(SteamClient??null,appId,appStore);
}
