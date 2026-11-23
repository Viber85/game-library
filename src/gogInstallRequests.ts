import {callable} from "@decky/api";

export type GogStorageLocation={
  key:string;label:string;path:string;free_bytes:number;
  existing?:"empty"|"resumable"|"untracked"|"complete"|"blocked";
};
export type GogInstallPreflight={
  ok:boolean;reason?:string;product_id?:string;folder?:string;
  platform?:string;size_bytes?:number|null;
  locations?:GogStorageLocation[];
};
export type GogInstallState={
  status:"idle"|"starting"|"downloading"|"paused"|"downloaded"|"cancelled"|"error";
  percent?:number|null;written_bytes?:number|null;
  total_bytes?:number|null;speed_mib?:number|null;reason?:string;
  location?:string;cancel_requested?:boolean;
};
export type GogInstallMode="new"|"resume"|"adopt"|"fresh";
type GogInstallReply={ok:boolean;reason?:string;status?:string;location?:string;operation?:string};
const check=callable<[string,string],GogInstallPreflight>("preflight_gog_install");
const install=callable<[string,string,string,GogInstallMode],GogInstallReply>("start_gog_install");
const status=callable<[string,string],GogInstallState>("get_gog_install_status");
const cancel=callable<[string,string],GogInstallReply>("cancel_gog_install");
const pause=callable<[string,string],GogInstallReply>("pause_gog_install");
const resume=callable<[string,string],GogInstallReply>("resume_gog_install");

export const preflightGogInstall=(account:string,product:string)=>
  check(account,product);
export const startGogInstall=(account:string,product:string,location:string,mode:GogInstallMode)=>
  install(account,product,location,mode);
export const getGogInstallStatus=(account:string,product:string)=>
  status(account,product);
export const cancelGogInstall=(account:string,product:string)=>
  cancel(account,product);
export const pauseGogInstall=(account:string,product:string)=>
  pause(account,product);
export const resumeGogInstall=(account:string,product:string)=>
  resume(account,product);
