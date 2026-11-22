import {findModuleChild} from "@decky/ui";
import {
  requestNativeSteamInstallWizard,
  type NativeInstallStore,type NativeInstallClient,type InstallWizardResult
} from "./nativeSteamInstallCore";

let cachedInstallStore:NativeInstallStore|null=null;

/** Locate the same install-actions store Steam's own game button uses.
 * Detection is intentionally strict; only cache a confirmed match.
 * Based on Steam UI's InstallApp(e) implementation and the Xbox Dashboard
 * Decky plugin which calls that store to display the install dialog.
 */
function findSteamInstallActions():NativeInstallStore|null{
  if(cachedInstallStore)return cachedInstallStore;
  try{
    const found=findModuleChild((module:unknown)=>{
      if(!module||typeof module!=="object")return undefined;
      for(const value of Object.values(module)){
        if(value&&typeof value==="object"&&
          "m_unAppIDExpectedInstall" in value&&
          typeof (value as NativeInstallStore).InstallApp==="function")
          return value;
      }
      return undefined;
    }) as NativeInstallStore|null|undefined;
    if(found&&typeof found.InstallApp==="function"){
      cachedInstallStore=found;
      return found;
    }
  }catch(error){
    console.warn("[game-library] Steam install store not available",error);
  }
  return null;
}

/** Requests the Steam install wizard; does not start the download or mark
 * the game Installed. Steam remains responsible for selecting a library,
 * checking entitlement/disk space, and user confirmation.
 */
export function openSteamInstallWizard(appId:number,nonSteam:boolean):InstallWizardResult{
  // Avoid expensive module scans on invalid/shortcut AppIDs.
  if(!Number.isSafeInteger(appId)||appId<=0||appId>=0x80000000)
    return requestNativeSteamInstallWizard(appId,nonSteam,null,null);
  const host=window as unknown as {SteamClient?:NativeInstallClient};
  return requestNativeSteamInstallWizard(
    appId,nonSteam,findSteamInstallActions(),host.SteamClient
  );
}
