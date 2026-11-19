import {useEffect,useState} from "react";
import {readRunningGame,type RunningGame} from "./runningGame";

/** Owns the 1.6s Steam running-game check and retains state identity on no-op polls.
 * Focus navigation remains entirely inside Dashboard, not in this hook.
 */
export function useRunningGameState(){
  const [runningGame,setRunningGame]=useState<RunningGame|null>(()=>
    readRunningGame((window as any).SteamUIStore,(window as any).appStore));
  useEffect(()=>{
    const refresh=()=>{
      const next=readRunningGame((window as any).SteamUIStore,(window as any).appStore);
      setRunningGame(previous=>previous?.id===next?.id&&previous?.title===next?.title
        ? previous:next);
    };
    refresh();
    const check=window.setInterval(refresh,1600);
    window.addEventListener("focus",refresh);
    return ()=>{window.clearInterval(check);window.removeEventListener("focus",refresh);};
  },[]);


  return {runningGame,setRunningGame};
}
