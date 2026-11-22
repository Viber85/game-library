import {executeInTab,fetchNoCors} from "@decky/api";
import {identifySteamTabs,fallbackMainTitlesPresent} from "./themeTabs";

type SteamClientLike={Apps?:{ShowControllerConfigurator?:(appid:number)=>void}};
type BrowserExecutor=(tabTitle:string,isIFrame:boolean,code:string)=>Promise<{success:boolean;result:unknown}>;

/** Steam documents this exact function as the controller configurator.
 * Do NOT send the gamepad button to /library/app/:id or the game's
 * Settings page: those are distinct screens, as seen on the MSI Claw.
 */
export function openControllerFromClient(
  appId:number,client:SteamClientLike|null|undefined
):boolean{
  if(!Number.isSafeInteger(appId)||appId<=0||appId>0xffffffff)return false;
  const apps=client?.Apps;
  const open=apps?.ShowControllerConfigurator;
  if(typeof open!=="function")return false;
  try{open.call(apps,appId);return true;}
  catch(error){
    console.warn("[game-library] native controller editor failed",error);
    return false;
  }
}

export function controllerEditorScript(appId:number):string{
  if(!Number.isSafeInteger(appId)||appId<=0||appId>0xffffffff)
    throw new Error("Invalid Steam AppID");
  // All data in this source is a validated integer; no user-supplied strings.
  return `(() => {
    try {
      const apps=globalThis.SteamClient?.Apps;
      if(typeof apps?.ShowControllerConfigurator!=="function")return false;
      apps.ShowControllerConfigurator(${appId});
      return true;
    } catch { return false; }
  })()`;
}

/** On some Decky routes SteamClient is available only in the real Steam CEF
 * tab, not in the plugin's own React window. Use Decky's existing verified
 * executeInTab bridge rather than substituting the wrong Steam game page.
 * The user directly requested this action by pressing the controller icon.
 */
export async function openSteamControllerEditor(
  appId:number,
  deps?:{
    client?:SteamClientLike|null;
    getTabs?:()=>Promise<unknown>;
    execute?:BrowserExecutor;
  }
):Promise<boolean>{
  if(!Number.isSafeInteger(appId)||appId<=0||appId>0xffffffff)return false;
  const client=deps?.client===undefined?
    (globalThis as unknown as {SteamClient?:SteamClientLike}).SteamClient:
    deps.client;
  if(openControllerFromClient(appId,client))return true;

  const getTabs=deps?.getTabs??(async()=>{
    const response=await fetchNoCors("http://localhost:8080/json");
    if(!response.ok)return [];
    return response.json();
  });
  let listed:unknown;
  try{listed=await Promise.race([
    getTabs(),new Promise<unknown>(resolve=>setTimeout(()=>resolve([]),1800))
  ]);}catch{return false;}
  const candidates=identifySteamTabs(listed).filter(tab=>tab.scope==="main")
    .map(tab=>tab.title);
  for(const title of fallbackMainTitlesPresent(listed)){
    if(!candidates.includes(title))candidates.push(title);
  }
  const execute=deps?.execute??executeInTab;
  const script=controllerEditorScript(appId);
  for(const title of candidates.slice(0,7)){
    try{
      const result=await Promise.race([
        execute(title,false,script),
        new Promise<{success:boolean;result:boolean}>(resolve=>
          setTimeout(()=>resolve({success:false,result:false}),1800))
      ]);
      if(result.success&&result.result===true)return true;
    }catch{/* Try the next verified Steam tab; never open game Settings. */}
  }
  return false;
}
