/**
 * Opens Steam's EXACT native Uninstall confirmation modal (not the
 * SteamClient.Installs.OpenUninstallWizard command).
 *
 * The Steam UI modal entrypoint accepts (appIds, ownerWindow, confirmPassword).
 * Its Uninstall button invokes OpenUninstallWizard(appIds, true), while its
 * Cancel button closes without touching files. This is the same modal shown
 * through Steam's Library context menu > Manage > Uninstall.
 */
import {findModuleByExport} from "@decky/ui";

type NativeDialog=(appIds:number[],ownerWindow:Window,bConfirmPassword:boolean)=>unknown;
let cachedDialog:NativeDialog|null=null;

export function isNativeSteamUninstallDialog(value:unknown):value is NativeDialog{
  if(typeof value!=="function")return false;
  let source="";
  try{source=Function.prototype.toString.call(value);}catch{return false;}
  // These keys are present in Steam's native modal wrapper, not in the
  // low-level client uninstall command or unrelated removal dialogs.
  return source.includes("rgApps")&&
    source.includes("bConfirmPassword")&&source.includes("bNeverPopOut");
}

function findNativeSteamUninstallDialog():NativeDialog|null{
  if(cachedDialog)return cachedDialog;
  try{
    const module=findModuleByExport(isNativeSteamUninstallDialog) as
      Record<string,unknown>|null|undefined;
    if(!module||typeof module!=="object")return null;
    const matches=Object.values(module).filter(isNativeSteamUninstallDialog);
    if(matches.length!==1)return null;
    cachedDialog=matches[0];
    return cachedDialog;
  }catch(error){
    console.warn("[game-library] Steam native Uninstall modal discovery failed",error);
    return null;
  }
}

export function showNativeSteamUninstallDialog(
  appId:number,ownerWindow:Window
):boolean{
  if(!Number.isSafeInteger(appId)||appId<=0||appId>=0x80000000)return false;
  const dialog=findNativeSteamUninstallDialog();
  if(!dialog)return false;
  try{
    dialog([appId],ownerWindow,false);
    return true;
  }catch(error){
    console.warn("[game-library] Steam native Uninstall modal could not open",error);
    return false;
  }
}
