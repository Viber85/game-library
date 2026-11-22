import {executeInTab,fetchNoCors} from "@decky/api";
import {identifySteamTabs,fallbackMainTitlesPresent} from "./themeTabs";
import {openControllerFromClient,controllerEditorScript,type SteamClientLike} from "./steamControllerEditorCore";

type BrowserExecutor=(tabTitle:string,isIFrame:boolean,code:string)=>Promise<{success:boolean;result:unknown}>;

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

  // First try the native Steam URL handler in Game Mode. A real SteamOS
  // Decky plugin uses this to open the *full* Controller Settings screen,
  // rather than ShowControllerConfigurator's separate popup.
  const client=deps?.client===undefined?
    (globalThis as unknown as {SteamClient?:SteamClientLike}).SteamClient:
    deps.client;
  if(openControllerFromClient(appId,client))return true;

  // Decky can run in a different JS context to Steam. If the URL handler
  // isn't exposed there, execute the same validated steam:// URL from an
  // actually enumerated Steam CEF target, with SharedJSContext first.
  const getTabs=deps?.getTabs??(async()=>{
    const response=await fetchNoCors("http://localhost:8080/json");
    if(!response.ok)return [];
    return response.json();
  });
  let listed:unknown;
  try{listed=await Promise.race([
    getTabs(),new Promise<unknown>(resolve=>setTimeout(()=>resolve([]),1800))
  ]);}catch{listed=[];}

  const recognized=identifySteamTabs(listed).filter(tab=>tab.scope==="main")
    .map(tab=>tab.title);
  for(const title of fallbackMainTitlesPresent(listed))
    if(!recognized.includes(title))recognized.push(title);
  const candidates=[
    ...recognized.filter(title=>title==="SharedJSContext"),
    ...recognized.filter(title=>title!=="SharedJSContext"),
  ];
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
    }catch{/* Try another enumerated Steam CEF target, not a game Settings route. */}
  }
  return false;
}
