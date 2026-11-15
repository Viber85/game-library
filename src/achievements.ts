/** Steam achievement data for the currently selected title.
 *
 * Native Steam API response (decky-frontend-lib):
 * SteamClient.Apps.GetMyAchievementsForApp(String(appid))
 * -> {result, data: {rgAchievements: [{bAchieved, strImage, rtUnlocked, ...}]}}.
 * The app overview does not reliably include achievements counts.
 */
export type SteamAchievement = {
  bAchieved?:boolean;
  strImage?:string;
  strID?:string;
  strName?:string;
  rtUnlocked?:number;
};
export type AchievementResult = {
  status:"ok"|"none"|"unavailable";
  achieved:number;
  total:number;
  progress:number;
};
export type AchievementSource = {
  Apps?:{GetMyAchievementsForApp?:(id:string)=>Promise<unknown>};
};
type DetailSource={GetAppDetails?:(id:number)=>any;RequestAppDetails?:(id:number)=>Promise<any>};

export function parseAchievementResponse(source:unknown):AchievementResult|null{
  const response=source as {data?:{rgAchievements?:SteamAchievement[]}}|null;
  const list=response?.data?.rgAchievements;
  if(!Array.isArray(list))return null;
  if(list.length===0)return {status:"none",achieved:0,total:0,progress:0};
  const achieved=list.filter(v=>v?.bAchieved===true).length;
  const total=list.length;
  return {status:"ok",achieved,total,progress:Math.round(achieved/total*100)};
}

export function parseAchievementDetails(value:unknown):AchievementResult|null{
  const achievements=(value as any)?.achievements;
  const unlocked=achievements?.nAchieved;
  const total=achievements?.nTotal;
  if(!Number.isInteger(unlocked)||!Number.isInteger(total) ||
     total<0||total>100000 || unlocked<0||unlocked>total)return null;
  return {status:total===0?"none":"ok",achieved:unlocked,total,
    progress:total>0?Math.round(unlocked/total*100):0};
}

/** Do not fabricate achievement counts when Steam is unavailable. */
export async function loadAchievements(
  appId:number,
  client?:AchievementSource|null,
  details?:DetailSource|null,
):Promise<AchievementResult>{
  if(!Number.isInteger(appId)||appId<=0||appId>=0x80000000)
    return {status:"unavailable",achieved:0,total:0,progress:0};

  let fromDetails:AchievementResult|null=null;
  const readDetails=()=>{
    try {return parseAchievementDetails(details?.GetAppDetails?.(appId));}
    catch {return null;}
  };
  fromDetails=readDetails();
  try {
    const fetcher=client?.Apps?.GetMyAchievementsForApp;
    if(typeof fetcher==="function") {
      const response=await fetcher.call(client?.Apps,String(appId));
      const parsed=parseAchievementResponse(response);
      // A zero-length backend list can mean the client has not loaded the
      // achievements yet, so prefer native app details if it has actual data.
      if(parsed?.status==="ok")return parsed;
      if(parsed?.status==="none" && !fromDetails)return parsed;
    }
  }catch(error){
    console.warn("[game-library] Steam achievements request unavailable",error);
  }
  if(fromDetails)return fromDetails;

  // The selected game's details may be fetched lazily on Game Mode.
  try {
    if(typeof details?.RequestAppDetails==="function") {
      await details.RequestAppDetails(appId);
      const after=readDetails();
      if(after)return after;
    }
  }catch{ /* no cached details */ }
  return {status:"unavailable",achieved:0,total:0,progress:0};
}
