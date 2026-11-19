import {callable} from "@decky/api";
import {createInflightGate} from "./inflightRequests";

export type HltbTimes={
  main:number|null;extras:number|null;completionist:number|null;
  name:string;url:string|null;source:string;
};
export type HltbReply={
  status:"ok"|"unavailable"|"error";data?:HltbTimes|null;
  cached?:boolean;reason?:string;stale?:boolean;expires_in?:number;
};
export type ProtonTier="platinum"|"gold"|"silver"|"bronze"|"borked"|null;
export type ProtonRating={
  status:"ok"|"unavailable"|"error";tier:ProtonTier;
  appid?:number;matched_title?:string|null;cached?:boolean;reason?:string;
};
const hltbRpc=callable<[number,string],HltbReply>("hltb_times");
const protonRpc=callable<[number,string,boolean],ProtonRating>("protondb_for_game");
const shared=createInflightGate();

export function requestHltbTimes(id:number,title:string):Promise<HltbReply>{
  return shared(["hltb",id,title],()=>hltbRpc(id,title));
}

export function requestProtonRating(id:number,title:string,nonSteam:boolean):Promise<ProtonRating>{
  return shared(["proton",id,title,nonSteam],()=>protonRpc(id,title,nonSteam));
}
