import {useEffect,useState} from "react";
import {MdAccessTime} from "react-icons/md";
import type {LibraryGame} from "./steam";
import {cardHltbHours,loadCardHltb,subscribeCardHltb} from "./sortMetadata";

export function HltbPosterBadge({game,active}:{game:LibraryGame;active:boolean}){
  const [hours,setHours]=useState(()=>cardHltbHours(game));
  useEffect(()=>{
    const refresh=()=>setHours(cardHltbHours(game));
    const unsubscribe=subscribeCardHltb(game.id,refresh);
    refresh();
    return unsubscribe;
  },[game.id,game.title]);
  useEffect(()=>{
    if(!active)return;
    let mounted=true;
    let retries=0;
    let timer:number;
    const load=()=>{
      void loadCardHltb(game).then(value=>{
        if(!mounted)return;
        setHours(value);
        // A sort or another title may occupy the single lookup slot.
        // Bounded retry; fresh cache misses do not cause another HTTP request.
        if(value===null&&retries++<2)
          timer=window.setTimeout(load,2000);
      }).catch(()=>{});
    };
    timer=window.setTimeout(load,850);
    return ()=>{mounted=false;window.clearTimeout(timer);};
  },[game.id,game.title,active]);
  const formatted=hours!==null?
    (hours<10?Number(hours.toFixed(1)):Math.round(hours))+" h":"—";
  const title="HowLongToBeat · Main + Extras"+(hours===null?" · no data":" · "+formatted);
  return <span className="gl-poster-hltb" title={title} aria-label={title}>
    <MdAccessTime aria-hidden="true"/><strong>{formatted}</strong>
  </span>;
}
