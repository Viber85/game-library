import { callable } from "@decky/api";
import { useEffect, useState } from "react";
import { MdTimer } from "react-icons/md";
import type { LibraryGame } from "./steam";

type Times = {
  main:number|null;
  extras:number|null;
  completionist:number|null;
  name:string;
  url:string|null;
  source:string;
};
type Reply = { status:"ok"|"unavailable"|"error"; data?:Times|null; cached?:boolean; reason?:string };

const lookup = callable<[number,string],Reply>("hltb_times");

function fmt(value:number|null|undefined) {
  return typeof value==="number" && Number.isFinite(value) && value>0 ? value.toFixed(value>=10?0:1)+"h" : "—";
}

/** Only the focused game is queried, after a short pause; Python caches responses for a week. */
export function HowLongToBeatCard({game}:{game:LibraryGame}) {
  const [result,setResult] = useState<Reply|null>(null);
  useEffect(()=>{
    let active=true;
    setResult(null);
    const timer=window.setTimeout(()=>{
      void lookup(game.id,game.title).then(data=>{
        if(active)setResult(data);
      }).catch(()=>{if(active)setResult({status:"error",reason:"Network unavailable"});});
    },500);
    return ()=>{active=false;window.clearTimeout(timer);};
  },[game.id,game.title]);

  const d=result?.status==="ok"?result.data:null;
  return <div className="gl-metric gl-hltb" title={d?.url?d.url:"Data: HowLongToBeat.com"}>
    <MdTimer className="gl-hltb-icon" />
    <div className="gl-hltb-body">
      <small>HOW LONG TO BEAT</small>
      {d?<div className="gl-hltb-values">
        <span><em>Story</em><strong>{fmt(d.main)}</strong></span>
        <span><em>Extras</em><strong>{fmt(d.extras)}</strong></span>
        <span><em>100%</em><strong>{fmt(d.completionist)}</strong></span>
      </div>:<strong className="gl-hltb-empty">
        {!result?"Looking up…":result.status==="error"?"HLTB unavailable":"No match"}
      </strong>}
    </div>
  </div>;
}
