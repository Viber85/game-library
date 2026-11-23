import {inspectGogLaunch,registerGogShortcut,finalizeGogShortcut,
  getInstalledGogProtonTools,
  type GogLaunchInfo} from "./gogLaunchRequests";
import {canonicalSteamAppId,requestSteamLaunch,type SteamAppStore} from "./launchGame";

type CompatTool={strToolName:string;strDisplayName:string};
type SteamApps={
  AddShortcut?:(title:string,exe:string,dir:string,launchOptions:string)=>Promise<number>;
  SetShortcutName?:(appId:number,name:string)=>void;
  SetShortcutExe?:(appId:number,exe:string)=>void;
  SetShortcutStartDir?:(appId:number,dir:string)=>void;
  SetShortcutLaunchOptions?:(appId:number,options:string)=>void;
  GetAvailableCompatTools?:(appId:number)=>Promise<CompatTool[]>;
  SpecifyCompatTool?:(appId:number,tool:string)=>void;
  RunGame?:(...args:[string,string,number,number])=>void;
};
type SteamSettings={
  GetGlobalCompatTools?:()=>Promise<CompatTool[]>;
};
type SteamWindow=Window&{
  SteamClient?:{Apps?:SteamApps;Settings?:SteamSettings};
  appStore?:SteamAppStore&{GetAppOverviewByAppID?:(id:number)=>unknown};
};
const steam=()=>window as SteamWindow;
// Keep a Steam-created shortcut ID through a failed backend registration in
// the current Game Mode session, so Retry cannot create duplicate shortcuts.
const pendingGogShortcuts=new Map<string,{appId:number;exe:string}>();
const validShortcutId=(appId:number)=>
  Number.isInteger(appId)&&appId>=0x80000000&&appId<=0xffffffff;
const safeTool=(tool:CompatTool)=>typeof tool?.strToolName==="string"&&
  /^[A-Za-z0-9_.-]{1,100}$/.test(tool.strToolName)&&
  tool.strToolName.toLowerCase().includes("proton");

/** Choose a Steam-reported Proton tool, not a guessed filesystem name. */
export function preferredProtonTool(tools:CompatTool[]):string|null{
  if(!Array.isArray(tools))return null;
  const proton=tools.filter(safeTool);
  return proton.find(t=>t.strToolName==="proton_experimental")?.strToolName??
    proton[0]?.strToolName??null;
}

const unquote=(value:string)=>value.replace(/^"|"$/g,"");
const sleep=(ms:number)=>new Promise<void>(resolve=>window.setTimeout(resolve,ms));

/** Steam returns a 32-bit ID before its in-memory shortcut overview is ready. */
async function waitForShortcutOverview(appId:number):Promise<void>{
  const store=steam().appStore;
  if(typeof store?.GetAppOverviewByAppID!=="function"){
    await sleep(250);
    return;
  }
  for(let i=0;i<40;i++){
    if(store.GetAppOverviewByAppID(appId)||store.GetAppOverviewByAppID(appId|0))
      return;
    await sleep(100);
  }
  console.warn("[game-library] Steam shortcut overview not yet available",appId);
}

/** Some Game Mode builds require empty startDir and options in AddShortcut,
 * even though SetShortcutStartDir and SetShortcutLaunchOptions work later.
 * Do not mutate shortcuts.vdf while Steam is running. */
async function createShortcut(apps:SteamApps,title:string,exe:string):Promise<number>{
  if(typeof apps.AddShortcut!=="function")
    throw new Error("SteamClient.Apps.AddShortcut is unavailable in this Game Mode. Steam cannot create a shortcut through this interface.");
  for(const candidate of [exe,'"'+unquote(exe)+'"']){
    let raw:number;
    try{
      raw=await apps.AddShortcut(title,candidate,"","");
    }catch(error){
      console.warn("[game-library] AddShortcut failed",error);
      continue;
    }
    const id=canonicalSteamAppId(raw);
    if(id!==null&&validShortcutId(id))return id;
  }
  throw new Error("Steam rejected the non-Steam shortcut. Restart Steam normally and retry; no GOG files were changed.");
}

/** Per-app API can be absent or return [] for a new shortcut. Global Steam
 * compatibility tools are the supported Game Mode fallback. */
export async function availableGogProtonTools(
  appId:number,
  apps:SteamApps,
  settings:SteamSettings|undefined
):Promise<CompatTool[]>{
  if(typeof apps.GetAvailableCompatTools==="function"){
    try{
      const perApp=await apps.GetAvailableCompatTools(appId);
      if(Array.isArray(perApp)&&perApp.some(safeTool))return perApp;
    }catch(error){
      console.warn("[game-library] per-app compat tools unavailable",error);
    }
  }
  if(typeof settings?.GetGlobalCompatTools==="function"){
    try{
      const globalTools=await settings.GetGlobalCompatTools();
      if(Array.isArray(globalTools)&&globalTools.some(safeTool))return globalTools;
    }catch(error){
      console.warn("[game-library] Steam global compat tools unavailable",error);
    }
  }
  // October 2026 Steam clients can expose SpecifyCompatTool but neither
  // enumeration API. Query locally *installed* verified Steam depots / custom
  // compatibilitytool.vdf IDs through Decky, without writing Steam config.
  try{
    const installed=await getInstalledGogProtonTools();
    if(installed.ok&&Array.isArray(installed.tools))
      return installed.tools.filter(safeTool);
  }catch(error){
    console.warn("[game-library] local Proton discovery unavailable",error);
  }
  return [];
}

/** Create via Steam's live API, register by returned ID, then configure Proton.
 * A partially successful attempt is recorded to prevent duplicate shortcuts.
 * No fallback directly writes Steam's in-memory shortcuts.vdf. */
export async function configureGogPlay(
  account:string,product:string,title:string,exeRelative:string
):Promise<GogLaunchInfo>{
  const state=await inspectGogLaunch(account,product);
  if(!state.ok||!state.install_dir)
    throw new Error(state.reason||"Completed GOG installation not found.");
  const exe=state.candidates.find(v=>v.relative===exeRelative);
  if(!exe)throw new Error("Please select a verified game executable.");

  const client=steam().SteamClient;
  const apps=client?.Apps;
  if(!apps)
    throw new Error("SteamClient.Apps is unavailable in this Game Mode. Reopen Game Library after restarting Steam.");
  const old=state.shortcut;
  if(old&&old.relative!==exeRelative)
    throw new Error("A different executable is already configured. Change it through Steam Properties.");

  const executable=state.install_dir+"/"+exe.relative;
  const workingDirectory=executable.slice(0,executable.lastIndexOf("/"));
  const key=account+":"+product;
  const pending=pendingGogShortcuts.get(key);
  let appId=old?.app_id;
  if(appId===undefined){
    if(pending&&pending.exe!==executable)
      throw new Error("Steam shortcut for a different executable was created in this session. Restart Steam and check non-Steam shortcuts before changing the executable.");
    appId=pending?.appId??await createShortcut(apps,title,executable);
    pendingGogShortcuts.set(key,{appId,exe:executable});
    await waitForShortcutOverview(appId);
    // Some Steam builds ignore the remaining AddShortcut arguments; update
    // fields separately after Steam has registered the shortcut.
    try{apps.SetShortcutName?.(appId,title);}
    catch(error){console.warn("[game-library] unable to set shortcut name",error);}
    try{apps.SetShortcutExe?.(appId,'"'+unquote(executable)+'"');}
    catch(error){console.warn("[game-library] unable to set shortcut executable",error);}
    try{apps.SetShortcutStartDir?.(appId,workingDirectory);}
    catch(error){console.warn("[game-library] unable to set shortcut start directory",error);}
    try{apps.SetShortcutLaunchOptions?.(appId,"");}
    catch(error){console.warn("[game-library] unable to set shortcut options",error);}
    const registered=await registerGogShortcut(
      account,product,state.install_dir,exe.relative,appId);
    if(!registered.ok)
      throw new Error((registered.reason||"Steam shortcut could not be registered.")+
        " The Steam shortcut was created; retry Set up Play without restarting Game Library to reuse it.");
    pendingGogShortcuts.delete(key);
  }
  if(!validShortcutId(appId))throw new Error("Stored Steam shortcut ID is invalid.");
  if(old?.ready)return state;

  if(typeof apps.SpecifyCompatTool!=="function")
    throw new Error("Steam shortcut created, but SteamClient.Apps.SpecifyCompatTool is unavailable. Set Proton in Steam Properties → Compatibility. Game Library has not marked the game ready.");
  const tools=await availableGogProtonTools(appId,apps,client?.Settings);
  const tool=preferredProtonTool(tools);
  if(!tool)
    throw new Error("Steam shortcut created, but no installed Proton tool could be found. Check Steam Settings → Compatibility and confirm Proton is installed. The shortcut is saved; retry Set up Play after installing Proton.");
  try{
    await Promise.resolve(apps.SpecifyCompatTool(appId,tool));
  }catch(error){
    console.warn("[game-library] Proton compatibility assignment failed",error);
    throw new Error("Steam created the shortcut but rejected Proton configuration. Choose Proton in Steam Properties → Compatibility, then retry.");
  }
  const result=await finalizeGogShortcut(account,product,appId,tool);
  if(!result.ok)throw new Error(result.reason||"Could not save Proton configuration.");
  return inspectGogLaunch(account,product);
}

export function playGogShortcut(appId:number):boolean{
  if(!validShortcutId(appId))return false;
  const {SteamClient,appStore}=steam();
  return requestSteamLaunch(SteamClient??null,appId,appStore);
}
