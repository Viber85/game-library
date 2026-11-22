import { useEffect, useState } from "react";
import { MdEmojiEvents } from "react-icons/md";
import type { LibraryGame } from "./steam";
import { loadAchievements, type AchievementResult } from "./achievements";

const CACHE_LIFETIME_MS=5*60*1000;
const cache=new Map<number,{value:AchievementResult;time:number}>();

/** Matches the concept: trophy, achieved/total and a slim cyan progress bar.
 * Only requests Steam's achievements for the selected game.
 */
export function AchievementsCard({game,compact=false}:{game:LibraryGame;compact?:boolean}){
  const [result,setResult]=useState<AchievementResult|null>(
    ()=>cache.get(game.id)?.value??null);
  useEffect(()=>{
    let mounted=true;
    const cached=cache.get(game.id);
    setResult(cached?.value??null);
    if(game.nonSteam){
      setResult({status:"unavailable",achieved:0,total:0,progress:0});
      return ()=>{mounted=false};
    }
    if(cached && Date.now()-cached.time<CACHE_LIFETIME_MS)
      return ()=>{mounted=false};
    const timer=window.setTimeout(()=>{
      const native=window as any;
      void loadAchievements(game.id,native.SteamClient,native.appDetailsStore)
        .then(value=>{
          if(!mounted)return;
          setResult(value);
          if(value.status!=="unavailable")cache.set(game.id,{value,time:Date.now()});
        }).catch(error=>{
          console.warn("[game-library] unable to load achievements",error);
          if(mounted)setResult({status:"unavailable",achieved:0,total:0,progress:0});
        });
    },250);
    return ()=>{mounted=false;window.clearTimeout(timer)};
  },[game.id,game.nonSteam]);

  const valid=result?.status==="ok";
  const caption=!result?"Loading…" : valid ?
    result.achieved+" / "+result.total :
    result.status==="none"?"No achievements":"—";
  return <div className={"gl-metric gl-achievement-card"+
      (compact?" gl-details-meta-cell gl-details-achievements":"")}>
    <MdEmojiEvents className="gl-achievement-icon"/>
    <div className="gl-achievement-content">
      <small>ACHIEVEMENTS</small>
      <div className="gl-achievement-stats">
        <strong>{caption}{compact&&valid?" ("+result.progress+"%)":""}</strong>
        {valid && <div className="gl-achievement-track" role="progressbar"
          aria-label="Achievements unlocked"
          aria-valuemin={0} aria-valuemax={result.total} aria-valuenow={result.achieved}>
          <span style={{width:result.progress+"%"}}/>
        </div>}
      </div>
    </div>
  </div>;
}
