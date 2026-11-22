/** One-time native Steam Game Mode Home hand-off after Decky loads.
 *
 * The route patch alone doesn't re-render an already mounted /library/home.
 * Navigate to our independent Dashboard route ONCE, but only if Steam is
 * genuinely still at its startup Home and no game or menu is active.
 * Never hijack Settings, a game page, external stores, or user navigation.
 */
export const STEAM_HOME_ROUTE="/library/home";
export const GAME_LIBRARY_HOME_ROUTE="/game-library/dashboard";

export type StartupHomeEvidence={
  enabled:boolean;
  route:string;
  documentUptimeMs:number;
  gameRunning:boolean;
  overlayVisible:boolean;
  userInteracted:boolean;
  homePatchReady:boolean;
};

const MAX_CEF_UPTIME_MS=180_000;

/** Steam usually gives Game Mode a path-based /library/home route.
 * An opaque /routes/index.html shell needs independent visible Home proof.
 */
export function safeStartupHomeRoute(route:string,homeVisible=false):boolean {
  const path=route.split(/[?#]/,1)[0].replace(/\/+$/,"")||"/";
  return path===STEAM_HOME_ROUTE ||
    path==="/routes/library/home" ||
    (homeVisible&&(path==="/"||path==="/routes/index.html"));
}

export function shouldOpenStartupHome(
  evidence:StartupHomeEvidence,
  homeVisible=false,
):boolean{
  return evidence.enabled&&evidence.homePatchReady&&
    Number.isFinite(evidence.documentUptimeMs)&&evidence.documentUptimeMs>=0&&
    evidence.documentUptimeMs<=MAX_CEF_UPTIME_MS&&
    !evidence.gameRunning&&!evidence.overlayVisible&&!evidence.userInteracted&&
    safeStartupHomeRoute(evidence.route,homeVisible);
}

/** One delayed attempt, not polling or a persistent route interceptor.
 * The dependency injection makes every safety condition testable without
 * requiring Steam, a native app or a real DOM in CI.
 */
export function scheduleStartupHomeRedirect(args:{
  getEvidence:()=>StartupHomeEvidence;
  homeVisible:()=>boolean;
  navigate:(path:string)=>void;
  setTimer:(fn:()=>void,ms:number)=>unknown;
  clearTimer:(id:unknown)=>void;
  delayMs?:number;
}):()=>void{
  let stopped=false;
  const initial=args.getEvidence();
  if(!shouldOpenStartupHome(initial,args.homeVisible()))return ()=>{};
  const originalRoute=initial.route;
  const timer=args.setTimer(()=>{
    if(stopped)return;
    stopped=true;
    const latest=args.getEvidence();
    // A user/Steam route change during startup always wins; never navigate
    // from a different page merely because the plugin is still initializing.
    if(latest.route!==originalRoute)return;
    if(!shouldOpenStartupHome(latest,args.homeVisible()))return;
    try{args.navigate(GAME_LIBRARY_HOME_ROUTE);}
    catch(error){console.warn("[game-library] startup Home navigation skipped",error);}
  },args.delayMs??550);
  return ()=>{
    if(stopped)return;
    stopped=true;
    args.clearTimer(timer);
  };
}
