import {callable} from "@decky/api";

export type GogExeCandidate={
  relative:string;label:string;recommended:boolean;score:number;
};
export type GogSteamShortcut={
  app_id:number;relative:string;tool:string|null;ready:boolean;
};
export type GogLaunchInfo={
  ok:boolean;reason?:string;
  status:"not-installed"|"downloaded"|"registered"|"ready";
  install_dir?:string;candidates:GogExeCandidate[];
  shortcut?:GogSteamShortcut|null;
};
export type InstalledGogProtonTool={
  strToolName:string;strDisplayName:string;source:"valve"|"custom";
};
export type InstalledGogProtonReply={
  ok:boolean;reason?:string;tools:InstalledGogProtonTool[];
};
type Reply={ok:boolean;reason?:string;ready?:boolean;app_id?:number};
const getTools=callable<[],InstalledGogProtonReply>("get_gog_proton_tools");
export const getInstalledGogProtonTools=()=>getTools();

const inspect=callable<[string,string],GogLaunchInfo>("inspect_gog_launch");
const register=callable<[string,string,string,string,number],Reply>("register_gog_shortcut");
const finalize=callable<[string,string,number,string],Reply>("finalize_gog_shortcut");

export const inspectGogLaunch=(account:string,product:string)=>inspect(account,product);
export const registerGogShortcut=(
  account:string,product:string,installDir:string,exeRelative:string,appId:number
)=>register(account,product,installDir,exeRelative,appId);
export const finalizeGogShortcut=(account:string,product:string,appId:number,tool:string)=>
  finalize(account,product,appId,tool);
