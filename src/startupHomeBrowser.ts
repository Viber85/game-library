import {readRunningGame} from "./runningGame";
import {scheduleStartupHomeRedirect,type StartupHomeEvidence} from "./startupHome";

type Navigate=(route:string)=>void;

/** Attaches only during the initial Decky plugin load. Steam Home often
 * rendered before its route patch was registered; this one-shot redirect
 * mounts Game Library's own Dashboard without rewriting native Steam routes.
 *
 * Conservative on purpose: if route, running-game state or menu visibility
 * cannot be verified, do not redirect. Ordinary Home patch still works.
 */
export function startBrowserStartupHome(
  enabled:()=>boolean,
  homePatchReady:()=>boolean,
  navigate:Navigate,
):()=>void {
  if(!enabled()||!homePatchReady())return ()=>{};

  let interacted=false;
  let disposed=false;
  let stopTimer:()=>void=()=>{};
  let releaseTimer:number|undefined;

  function cleanup(){
    if(disposed)return;
    disposed=true;
    stopTimer();
    if(releaseTimer!==undefined)window.clearTimeout(releaseTimer);
    document.removeEventListener("keydown",onUserInput,true);
    document.removeEventListener("pointerdown",onUserInput,true);
    document.removeEventListener("gamepadbuttondown",onUserInput,true);
  }
  function onUserInput(){interacted=true;cleanup();}

  // This is NOT a persistent global input handler. Cancel on the first user
  // action so active navigation always wins, and tear down in ~1 second.
  document.addEventListener("keydown",onUserInput,true);
  document.addEventListener("pointerdown",onUserInput,true);
  document.addEventListener("gamepadbuttondown",onUserInput,true);

  const isVisible=(el:Element):boolean=>{
    try{
      const rect=el.getBoundingClientRect();
      if(rect.width<40||rect.height<40||rect.bottom<=0||rect.right<=0||
         rect.top>=window.innerHeight||rect.left>=window.innerWidth)return false;
      let node:Element|null=el;
      while(node){
        const style=window.getComputedStyle(node);
        if(style.display==="none"||style.visibility==="hidden"||
           Number(style.opacity)===0)return false;
        node=node.parentElement;
      }
      return true;
    }catch{return false;}
  };
  const visibleAny=(selector:string)=>Array.from(document.querySelectorAll(selector))
    .slice(0,10).some(isVisible);
  const homeVisible=()=>visibleAny(
    '[class*="gamepadhome_"],[class*="gamepadlibraryhome_"]'
  );
  const overlayVisible=()=>visibleAny(
    '#QuickAccess-Menu,#MainMenu,[class*="quickaccessmenu_QuickAccessMenu"]'
  );

  const current=():StartupHomeEvidence=>{
    const steam=(window as any).SteamUIStore;
    return {
      enabled:enabled()&&!disposed,
      homePatchReady:homePatchReady(),
      route:window.location.pathname,
      // A hot reload in an already established session isn't a new boot.
      documentUptimeMs:window.performance?.now?.()??Number.POSITIVE_INFINITY,
      gameRunning:!steam||readRunningGame(steam,(window as any).appStore)!==null,
      overlayVisible:overlayVisible(),
      userInteracted:interacted,
    };
  };
  stopTimer=scheduleStartupHomeRedirect({
    getEvidence:current,
    homeVisible,
    navigate:route=>{
      if(disposed)return;
      cleanup();
      navigate(route);
    },
    setTimer:(fn,ms)=>window.setTimeout(fn,ms),
    clearTimer:id=>window.clearTimeout(id as number),
  });
  releaseTimer=window.setTimeout(cleanup,1300);
  return cleanup;
}
